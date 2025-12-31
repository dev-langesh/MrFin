import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { settingsService } from "@/services/settings.service";

// Async Thunks
export const fetchSettings = createAsyncThunk(
  "importTransactions/fetchSettings",
  async (_, { rejectWithValue }) => {
    try {
      const data = await settingsService.fetchSettings();
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const saveSettings = createAsyncThunk(
  "importTransactions/saveSettings",
  async (settings, { rejectWithValue }) => {
    try {
      const data = await settingsService.saveSettings(settings);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  value: {
    step: 1,
    files: [],
    transformedData: [],
    mappedData: [],
    preProcessedData: [],
    deletedRowUids: [], // Store hashes of deleted rows
    options: {
      delimiter: ",",
      removeCharacters: "",
      quote: '"',
      hasHeader: true,
    },
    mappedFields: {
      txnDate: undefined,
      credit: undefined,
      debit: undefined,
      description: undefined,
    },
    rules: [],
    defaultRules: [],
    transactionSettings: {
      txnTypes: ["expense", "income"],
      categories: [],
    },
    isLoading: false,
    settingsStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    validationAttempt: 0,
    errorUids: [], // Store UIDs of rows with errors
  },
};

const importTransactionsSlice = createSlice({
  name: "importTransactions",
  initialState,
  reducers: {
    setImportFileData: (state, action) => {
      // payload: [{ name, content, size, type }]
      state.value.fileData = action.payload;
      // Reset deletions when new file is loaded to prevent index collisions
      state.value.deletedRowUids = [];
    },
    deleteFile: (state, action) => {
      const index = action.payload;
      state.value.fileData = state.value.fileData.filter((_, i) => i !== index);
    },
    setStep: (state, action) => {
      state.value.step = action.payload;
    },
    setPreProcessedData: (state, action) => {
      state.value.preProcessedData = action.payload;
    },
    setIsLoading: (state, action) => {
      state.value.isLoading = action.payload;
    },
    setRules: (state, action) => {
      state.value.rules = action.payload;
    },
    setDefaultRules: (state, action) => {
      state.value.defaultRules = action.payload;
    },
    nextStep: (state) => {
      state.value.step += 1;
    },
    previousStep: (state) => {
      state.value.step -= 1;
    },
    reset: (state) => {
      state.value = initialState.value;
    },
    setState: (state, action) => {
      state.value = action.payload;
    },
    updateState: (state, action) => {
      state.value = {
        ...state.value,
        ...action.payload,
      };
    },
    updateMappedFields: (state, action) => {
      state.value.mappedFields = {
        ...state.value.mappedFields,
        ...action.payload,
      };
    },
    deleteRow: (state, action) => {
      const uid = action.payload;
      if (state.value.preProcessedData) {
        state.value.preProcessedData = state.value.preProcessedData.filter(
          (r) => r.uid !== uid
        );
      }
      if (state.value.mappedData) {
        state.value.mappedData = state.value.mappedData.filter(
          (r) => r.uid !== uid
        );
        state.value.errorUids = state.value.errorUids.filter(
          (id) => id !== uid
        );
      }
      if (state.value.transformedData) {
        state.value.transformedData = state.value.transformedData.filter(
          (r) => r.uid !== uid
        );
      }
    },
    setMappedData: (state, action) => {
      // payload: { mappedData, errorUids } OR just mappedData
      if (action.payload.mappedData && action.payload.errorUids) {
        state.value.mappedData = action.payload.mappedData;
        state.value.errorUids = action.payload.errorUids;
      } else {
        // Fallback
        state.value.mappedData = action.payload;
        state.value.errorUids = [];
        state.value.mappedData.forEach((row) => {
          if (row.errors && Object.keys(row.errors).length > 0) {
            state.value.errorUids.push(row.uid);
          }
        });
      }
    },
    updateMappedRow: (state, action) => {
      const { uid, row } = action.payload;
      const index = state.value.mappedData.findIndex((r) => r.uid === uid);

      if (index !== -1) {
        state.value.mappedData[index] = {
          ...state.value.mappedData[index],
          ...row,
        };

        const hasError = row.errors && Object.keys(row.errors).length > 0;
        const errUidIdx = state.value.errorUids.indexOf(uid);

        if (hasError && errUidIdx === -1) {
          state.value.errorUids.push(uid);
        } else if (!hasError && errUidIdx !== -1) {
          state.value.errorUids.splice(errUidIdx, 1);
        }
      }
    },
    deleteRows: (state, action) => {
      // Payload: uids[] (array of strings)
      const uids = action.payload;
      const uidsSet = new Set(uids);

      // Add UIDs to deletedRowUids for persistence
      if (uids && uids.length > 0) {
        const currentUids = new Set(state.value.deletedRowUids || []);
        uids.forEach((uid) => currentUids.add(uid));
        state.value.deletedRowUids = Array.from(currentUids);
      }

      if (state.value.preProcessedData) {
        state.value.preProcessedData = state.value.preProcessedData.filter(
          (r) => !uidsSet.has(r.uid)
        );
      }
      if (state.value.mappedData) {
        state.value.mappedData = state.value.mappedData.filter(
          (r) => !uidsSet.has(r.uid)
        );
        state.value.errorUids = state.value.errorUids.filter(
          (uid) => !uidsSet.has(uid)
        );
      }
      if (state.value.transformedData) {
        state.value.transformedData = state.value.transformedData.filter(
          (r) => !uidsSet.has(r.uid)
        );
      }
    },
    incrementValidationAttempt: (state) => {
      state.value.validationAttempt += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.value.settingsStatus = "loading";
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.value.settingsStatus = "succeeded";
        const { importTransactionSettings, transactionSettings } =
          action.payload;
        if (importTransactionSettings) {
          state.value.options = {
            ...state.value.options,
            ...importTransactionSettings.preProcess,
          };
          state.value.mappedFields = {
            ...state.value.mappedFields,
            ...importTransactionSettings.mapFields,
          };
          state.value.rules = importTransactionSettings.rules || [];
          state.value.defaultRules =
            importTransactionSettings.defaultRules || [];
        }
        if (transactionSettings) {
          state.value.transactionSettings = transactionSettings;
        }
      })
      .addCase(fetchSettings.rejected, (state) => {
        state.value.settingsStatus = "failed";
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        // Optionally update state with saved settings if needed
      });
  },
});

export const {
  setImportFileData,
  deleteFile,
  setStep,
  setPreProcessedData,
  setIsLoading,
  setRules,
  setDefaultRules,
  nextStep,
  previousStep,
  reset,
  updateMappedFields,
  setState,
  updateState,
  deleteRow,
  deleteRows,
  incrementValidationAttempt,
  setMappedData,
  updateMappedRow,
} = importTransactionsSlice.actions;

export default importTransactionsSlice.reducer;

export const selectImportTransactions = (state) =>
  state.importTransactions.value;
export const selectImportFileData = (state) =>
  state.importTransactions.value.fileData;
export const selectImportStep = (state) => state.importTransactions.value.step;
export const selectPreProcessedData = (state) =>
  state.importTransactions.value.preProcessedData;
export const selectDeletedRowUids = (state) =>
  state.importTransactions.value.deletedRowUids;
export const selectMappedFields = (state) =>
  state.importTransactions.value.mappedFields;
export const selectOptions = (state) => state.importTransactions.value.options;
export const selectMappedData = (state) =>
  state.importTransactions.value.mappedData;
export const selectTransformedData = (state) =>
  state.importTransactions.value.transformedData;
export const selectIsLoading = (state) =>
  state.importTransactions.value.isLoading;
export const selectRules = (state) => state.importTransactions.value.rules;
export const selectDefaultRules = (state) =>
  state.importTransactions.value.defaultRules;
export const selectTransactionSettings = (state) =>
  state.importTransactions.value.transactionSettings;
export const selectValidationAttempt = (state) =>
  state.importTransactions.value.validationAttempt;
export const selectErrorUids = (state) =>
  state.importTransactions.value.errorUids;

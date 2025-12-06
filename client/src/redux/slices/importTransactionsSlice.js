import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchSettingsService,
  saveSettingsService,
} from "@/services/settings.service";

// Async Thunks
export const fetchSettings = createAsyncThunk(
  "importTransactions/fetchSettings",
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchSettingsService();
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
      const data = await saveSettingsService(settings);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  value: {
    files: [],

    step: 1,
    options: {
      delimiter: ",",
      removeCharacters: "",
      quote: '"',
    },
    mappedData: [],
    transformedData: [],
    importedData: [],
    mappedFields: {
      txnDate: undefined,
      credit: undefined,
      debit: undefined,
      description: undefined,
    },
    rules: [],
    transactionSettings: {
      txnTypes: ["expense", "revenue"],
      categories: [],
    },
    isLoading: false,
    settingsStatus: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    validationAttempt: 0,
    errorIndices: [], // Store indices of rows with errors
  },
};

const importTransactionsSlice = createSlice({
  name: "importTransactions",
  initialState,
  reducers: {
    setFiles: (state, action) => {
      state.value.files = action.payload;
    },
    setStep: (state, action) => {
      state.value.step = action.payload;
    },
    setImportedData: (state, action) => {
      state.value.importedData = action.payload;
    },
    setIsLoading: (state, action) => {
      state.value.isLoading = action.payload;
    },
    setRules: (state, action) => {
      state.value.rules = action.payload;
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
      const index = action.payload;
      if (state.value.importedData) {
        state.value.importedData = state.value.importedData.filter(
          (_, i) => i !== index
        );
      }
      if (state.value.mappedData) {
        state.value.mappedData = state.value.mappedData.filter(
          (_, i) => i !== index
        );
      }
      if (state.value.transformedData) {
        state.value.transformedData = state.value.transformedData.filter(
          (_, i) => i !== index
        );
      }
    },
    setMappedData: (state, action) => {
      // payload: { mappedData, errorIndices } OR just mappedData
      if (action.payload.mappedData && action.payload.errorIndices) {
        state.value.mappedData = action.payload.mappedData;
        state.value.errorIndices = action.payload.errorIndices;
      } else {
        // Fallback
        state.value.mappedData = action.payload;
        state.value.errorIndices = [];
        state.value.mappedData.forEach((row, i) => {
          if (row.errors && Object.keys(row.errors).length > 0) {
            state.value.errorIndices.push(i);
          }
        });
      }
    },
    updateMappedRow: (state, action) => {
      const { index, row } = action.payload;
      if (state.value.mappedData[index]) {
        state.value.mappedData[index] = row;

        const hasError = row.errors && Object.keys(row.errors).length > 0;
        const errIdx = state.value.errorIndices.indexOf(index);

        if (hasError && errIdx === -1) {
          state.value.errorIndices.push(index);
          state.value.errorIndices.sort((a, b) => a - b);
        } else if (!hasError && errIdx !== -1) {
          state.value.errorIndices.splice(errIdx, 1);
        }
      }
    },
    deleteRows: (state, action) => {
      const indices = new Set(action.payload); // Expecting array of indices
      if (state.value.importedData) {
        state.value.importedData = state.value.importedData.filter(
          (_, i) => !indices.has(i)
        );
      }
      if (state.value.mappedData) {
        // Update errorIndices
        const oldErrorIndices = state.value.errorIndices;
        const newErrorIndices = [];
        const sortedDeleted = Array.from(indices).sort((a, b) => a - b);

        oldErrorIndices.forEach((errIdx) => {
          if (indices.has(errIdx)) return; // deleted
          let shift = 0;
          for (let d of sortedDeleted) {
            if (d < errIdx) shift++;
            else break;
          }
          newErrorIndices.push(errIdx - shift);
        });

        state.value.errorIndices = newErrorIndices;

        state.value.mappedData = state.value.mappedData.filter(
          (_, i) => !indices.has(i)
        );
      }
      if (state.value.transformedData) {
        state.value.transformedData = state.value.transformedData.filter(
          (_, i) => !indices.has(i)
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
  setFiles,
  setStep,
  setImportedData,
  setIsLoading,
  setRules,
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
export const selectImportFiles = (state) =>
  state.importTransactions.value.files;
export const selectImportStep = (state) => state.importTransactions.value.step;
export const selectImportData = (state) =>
  state.importTransactions.value.importedData;
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
export const selectTransactionSettings = (state) =>
  state.importTransactions.value.transactionSettings;
export const selectValidationAttempt = (state) =>
  state.importTransactions.value.validationAttempt;
export const selectErrorIndices = (state) =>
  state.importTransactions.value.errorIndices;

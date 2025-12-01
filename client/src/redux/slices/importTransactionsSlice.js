import { createSlice } from "@reduxjs/toolkit";

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
    isLoading: false,
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
    deleteRows: (state, action) => {
      const indices = new Set(action.payload); // Expecting array of indices
      if (state.value.importedData) {
        state.value.importedData = state.value.importedData.filter(
          (_, i) => !indices.has(i)
        );
      }
      if (state.value.mappedData) {
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
  },
});

export const {
  setFiles,
  setStep,
  setImportedData,
  setIsLoading,
  nextStep,
  previousStep,
  reset,
  updateMappedFields,
  setState,
  updateState,
  deleteRow,
  deleteRows,
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

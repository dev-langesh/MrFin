import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  value: {
    files: [],

    step: 4,
    options: {
      delimiter: ",",
      removeCharacters: "",
      quote: '"',
    },
    mappedData: [
      {
        "Txn Date": "11-09-2025 08:27:54",
        "Cheque No.": "561015327618",
        "Branch Code": "33",
        Balance: "11,623.7a1",
        description:
          "UPI/DR/561015327618/FOURDEGRE/UTIB/**7.rzp@rxaxis/UPI//ICI0556599e6c44402092eac82811725857/01/09/2025 08:27:54",
        errors: {},
        txnDate: "2025-08-31T18:30:00.000Z",
        credit: "",
        debit: "59877.69",
      },
      {
        "Txn Date": "01-09-2025 08:33:36",
        "Cheque No.": "561030234766",
        "Branch Code": "33",
        Balance: "5,623.71",
        description:
          "UPI/DR/561030234766/Suryoday /HDFC/**.ccav@hdfcbank/UPI//ICI730bfde359064d15b55b0559ab32446c/01/09/2025 08:33:35",
        errors: {},
        txnDate: "2025-08-31T18:30:00.000Z",
        credit: "",
        debit: "6000.00",
      },
      {
        "Txn Date": "01-09-2025 11:39:34",
        "Cheque No.": "561057449806",
        "Branch Code": "33",
        Balance: "5,443.71",
        description:
          "UPI/DR/561057449806/Mr SATHIS/CIUB/**263-1@okaxis/UPI//ICI176df36020594c3cad5b9b000740100b/01/09/2025 11:39:34",
        errors: {},
        txnDate: "2025-08-31T18:30:00.000Z",
        credit: "",
        debit: "180.00",
      },
      {
        "Txn Date": "02-09-2025 13:19:43",
        "Cheque No.": "524587431247",
        "Branch Code": "33",
        Balance: "5,262.38",
        description:
          "UPI/DR/524587431247/RELIANCE /HDFC/**11583@hdfcbank/UPI//ICI328ca82e8a6346d4be825458a41ac7c1/02/09/2025 13:19:43",
        errors: {},
        txnDate: "2025-09-01T18:30:00.000Z",
        credit: "",
        debit: "181.33",
      },
      {
        "Txn Date": "02-09-2025 13:29:54",
        "Cheque No.": "524556231088",
        "Branch Code": "33",
        Balance: "5,232.38",
        description:
          "UPI/DR/524556231088/MURUGASAM/SBIN/**yp962@oksbi/UPI//ICI1300942a7bca4d77b0eaaf55e5c6fef5/02/09/2025 13:29:54",
        errors: {},
        txnDate: "2025-09-01T18:30:00.000Z",
        credit: "",
        debit: "30.00",
      },
      {
        "Txn Date": "02-09-2025 13:29:54",
        "Cheque No.": "524556231088",
        "Branch Code": "33",
        Balance: "5,232.38",
        description:
          "UPI/DR/524556231088/MURUGASAM/SBIN/**yp962@oksbi/UPI//ICI1300942a7bca4d77b0eaaf55e5c6fef5/02/09/2025 13:29:54",
        errors: {},
        txnDate: "2025-09-01T18:30:00.000Z",
        credit: "",
        debit: "30.00",
      },
      {
        "Txn Date": "02-09-2025 13:29:54",
        "Cheque No.": "524556231088",
        "Branch Code": "33",
        Balance: "5,232.38",
        description:
          "UPI/DR/524556231088/MURUGASAM/SBIN/**yp962@oksbi/UPI//ICI1300942a7bca4d77b0eaaf55e5c6fef5/02/09/2025 13:29:54",
        errors: {},
        txnDate: "2025-09-01T18:30:00.000Z",
        credit: "",
        debit: "30.00",
      },
      {
        "Txn Date": "02-09-2025 13:29:54",
        "Cheque No.": "524556231088",
        "Branch Code": "33",
        Balance: "5,232.38",
        description:
          "UPI/DR/524556231088/MURUGASAM/SBIN/**yp962@oksbi/UPI//ICI1300942a7bca4d77b0eaaf55e5c6fef5/02/09/2025 13:29:54",
        errors: {},
        txnDate: "2025-09-01T18:30:00.000Z",
        credit: "",
        debit: "30.00",
      },
      {
        "Txn Date": "02-09-2025 13:29:54",
        "Cheque No.": "524556231088",
        "Branch Code": "33",
        Balance: "5,232.38",
        description:
          "UPI/DR/524556231088/MURUGASAM/SBIN/**yp962@oksbi/UPI//ICI1300942a7bca4d77b0eaaf55e5c6fef5/02/09/2025 13:29:54",
        errors: {},
        txnDate: "2025-09-01T18:30:00.000Z",
        credit: "",
        debit: "30.00",
      },
      {
        "Txn Date": "02-09-2025 13:29:54",
        "Cheque No.": "524556231088",
        "Branch Code": "33",
        Balance: "5,232.38",
        description:
          "UPI/DR/524556231088/MURUGASAM/SBIN/**yp962@oksbi/UPI//ICI1300942a7bca4d77b0eaaf55e5c6fef5/02/09/2025 13:29:54",
        errors: {},
        txnDate: "2025-09-01T18:30:00.000Z",
        credit: "",
        debit: "30.00",
      },
      {
        "Txn Date": "02-09-2025 13:29:54",
        "Cheque No.": "524556231088",
        "Branch Code": "33",
        Balance: "5,232.38",
        description:
          "UPI/DR/524556231088/MURUGASAM/SBIN/**yp962@oksbi/UPI//ICI1300942a7bca4d77b0eaaf55e5c6fef5/02/09/2025 13:29:54",
        errors: {},
        txnDate: "2025-09-01T18:30:00.000Z",
        credit: "",
        debit: "30.00",
      },
      {
        "Txn Date": "02-09-2025 13:29:54",
        "Cheque No.": "524556231088",
        "Branch Code": "33",
        Balance: "5,232.38",
        description:
          "UPI/DR/524556231088/MURUGASAM/SBIN/**yp962@oksbi/UPI//ICI1300942a7bca4d77b0eaaf55e5c6fef5/02/09/2025 13:29:54",
        errors: {},
        txnDate: "2025-09-01T18:30:00.000Z",
        credit: "",
        debit: "30.00",
      },
      {
        "Txn Date": "02-09-2025 13:29:54",
        "Cheque No.": "524556231088",
        "Branch Code": "33",
        Balance: "5,232.38",
        description:
          "UPI/DR/524556231088/MURUGASAM/SBIN/**yp962@oksbi/UPI//ICI1300942a7bca4d77b0eaaf55e5c6fef5/02/09/2025 13:29:54",
        errors: {},
        txnDate: "2025-09-01T18:30:00.000Z",
        credit: "",
        debit: "30.00",
      },
      {
        "Txn Date": "02-09-2025 13:29:54",
        "Cheque No.": "524556231088",
        "Branch Code": "33",
        Balance: "5,232.38",
        description:
          "UPI/DR/524556231088/MURUGASAM/SBIN/**yp962@oksbi/UPI//ICI1300942a7bca4d77b0eaaf55e5c6fef5/02/09/2025 13:29:54",
        errors: {},
        txnDate: "2025-09-01T18:30:00.000Z",
        credit: "",
        debit: "30.00",
      },
      {
        "Txn Date": "02-09-2025 13:29:54",
        "Cheque No.": "524556231088",
        "Branch Code": "33",
        Balance: "5,232.38",
        description:
          "UPI/DR/524556231088/MURUGASAM/SBIN/**yp962@oksbi/UPI//ICI1300942a7bca4d77b0eaaf55e5c6fef5/02/09/2025 13:29:54",
        errors: {},
        txnDate: "2025-09-01T18:30:00.000Z",
        credit: "",
        debit: "30.00",
      },
    ],
    transformedData: [],
    data: [
      {
        "Txn Date": "11-09-2025 08:27:54",
        "Value Date": "01 Sep 2025",
        "Cheque No.": "561015327618",
        Description:
          "UPI/DR/561015327618/FOURDEGRE/UTIB/**7.rzp@rxaxis/UPI//ICI0556599e6c44402092eac82811725857/01/09/2025 08:27:54",
        "Branch Code": "33",
        Debit: "59,877.69",
        Credit: "",
        Balance: "11,623.7a1",
      },
      {
        "Txn Date": "01-09-2025 08:33:36",
        "Value Date": "01 Sep 2025",
        "Cheque No.": "561030234766",
        Description:
          "UPI/DR/561030234766/Suryoday /HDFC/**.ccav@hdfcbank/UPI//ICI730bfde359064d15b55b0559ab32446c/01/09/2025 08:33:35",
        "Branch Code": "33",
        Debit: "6,000.00",
        Credit: "",
        Balance: "5,623.71",
      },
      {
        "Txn Date": "01-09-2025 11:39:34",
        "Value Date": "01 Sep 2025",
        "Cheque No.": "561057449806",
        Description:
          "UPI/DR/561057449806/Mr SATHIS/CIUB/**263-1@okaxis/UPI//ICI176df36020594c3cad5b9b000740100b/01/09/2025 11:39:34",
        "Branch Code": "33",
        Debit: "180.00",
        Credit: "",
        Balance: "5,443.71",
      },
      {
        "Txn Date": "02-09-2025 13:19:43",
        "Value Date": "02 Sep 2025",
        "Cheque No.": "524587431247",
        Description:
          "UPI/DR/524587431247/RELIANCE /HDFC/**11583@hdfcbank/UPI//ICI328ca82e8a6346d4be825458a41ac7c1/02/09/2025 13:19:43",
        "Branch Code": "33",
        Debit: "181.33",
        Credit: "",
        Balance: "5,262.38",
      },
      {
        "Txn Date": "02-09-2025 13:29:54",
        "Value Date": "02 Sep 2025",
        "Cheque No.": "524556231088",
        Description:
          "UPI/DR/524556231088/MURUGASAM/SBIN/**yp962@oksbi/UPI//ICI1300942a7bca4d77b0eaaf55e5c6fef5/02/09/2025 13:29:54",
        "Branch Code": "33",
        Debit: "30.00",
        Credit: "",
        Balance: "5,232.38",
      },
    ],
    mappedFields: {
      txnDate: undefined,
      credit: undefined,
      debit: undefined,
      description: undefined,
    },
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
    setData: (state, action) => {
      state.value.data = action.payload;
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
  },
});

export const {
  setFiles,
  setStep,
  setData,
  nextStep,
  previousStep,
  reset,
  updateMappedFields,
  setState,
  updateState,
} = importTransactionsSlice.actions;

export default importTransactionsSlice.reducer;

export const selectImportTransactions = (state) =>
  state.importTransactions.value;
export const selectImportFiles = (state) =>
  state.importTransactions.value.files;
export const selectImportStep = (state) => state.importTransactions.value.step;
export const selectImportData = (state) => state.importTransactions.value.data;
export const selectMappedFields = (state) =>
  state.importTransactions.value.mappedFields;
export const selectOptions = (state) => state.importTransactions.value.options;
export const selectMappedData = (state) =>
  state.importTransactions.value.mappedData;
export const selectTransformedData = (state) =>
  state.importTransactions.value.transformedData;

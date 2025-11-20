"use client";

// store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import importTransactionsReducer from "./slices/importTransactionsSlice";

export const store = configureStore({
  reducer: {
    importTransactions: importTransactionsReducer,
  },
});

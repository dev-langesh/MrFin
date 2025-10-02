"use client";

// store/store.ts
import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {
    test: (state = { value: 0 }, action) => {
      switch (action.type) {
        case "increment":
          return { ...state, value: state.value + 1 };
        case "decrement":
          return { ...state, value: state.value - 1 };
        default:
          return state;
      }
    }
  },
});

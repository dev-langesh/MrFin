"use client";

import { Button } from "@/components/ui/button";
import {
  nextStep,
  previousStep,
  selectImportTransactions,
} from "@/redux/slices/importTransactionsSlice";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

export default function ChangeStep() {
  const state = useSelector(selectImportTransactions);
  const dispatch = useDispatch();
  const lastStep = 4;

  function validateStepData() {
    let isValid = true;
    switch (state.step) {
      case 1:
        if (state.files?.length < 1) {
          toast.error("Please upload a file.");
          isValid = false;
        }
        break;
      case 2:

      default:
        isValid = true;
    }

    return isValid;
  }

  async function handleChange(action) {
    if (action === "next" && state.step < lastStep) {
      const isValid = validateStepData();
      console.log(isValid, state.step);
      if (!isValid) return;
      dispatch(nextStep());
    } else if (action === "back" && state.step > 1) {
      dispatch(previousStep());
    }
  }

  return (
    <div className="flex items-center justify-end gap-3 pr-4 self-stretch">
      {state.step > 1 && (
        <Button onClick={() => handleChange("back")} className="px-6">
          Back
        </Button>
      )}
      {state.step < lastStep && (
        <Button onClick={() => handleChange("next")} className="px-6">
          Next
        </Button>
      )}
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  nextStep,
  previousStep,
  selectImportTransactions,
  reset,
  updateState,
} from "@/redux/slices/importTransactionsSlice";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { protectedApi } from "@/api/axios";
import { transactionArraySchema } from "@/schemas/transaction.schema";
import { useRouter } from "next/navigation";

export default function ChangeStep() {
  const state = useSelector(selectImportTransactions);
  const dispatch = useDispatch();
  const router = useRouter();
  const lastStep = 4;
  const [isImporting, setIsImporting] = useState(false);

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
        break;
      case 3:
        if (state.mappedData.length === 0) {
          toast.error(
            "No valid data to import. Please check the mapped fields."
          );
          isValid = false;
        }

        const errorIds = state.mappedData
          .map((entry, index) =>
            Object.keys(entry.errors || {}).length > 0 ? index + 1 : null
          )
          .filter((val) => val !== null);

        if (errorIds.length > 0) {
          toast.error(
            `There are errors in the mapped data at IDs: ${errorIds
              .slice(0, 10)
              .join(", ")}. Please fix them before proceeding.`
          );
          isValid = false;
        }

        // Check for global errors (like missing credit/debit)
        const globalErrors = state.mappedData.some(
          (entry) => entry.errors?.amount
        );
        if (globalErrors) {
          toast.error(
            "Some entries are missing both Credit and Debit values. Please check your mapping."
          );
          isValid = false;
        }

        break;
      case 4:

      default:
        isValid = true;
    }

    return isValid;
  }

  async function handleChange(action) {
    if (action === "next" && state.step < lastStep) {
      const isValid = validateStepData();
      if (!isValid) return;
      dispatch(nextStep());
    } else if (action === "back" && state.step > 1) {
      dispatch(previousStep());
    }
  }

  async function handleImport() {
    setIsImporting(true);
    try {
      // 1. Validate Data
      const result = transactionArraySchema.safeParse(state.transformedData);

      if (!result.success) {
        // Map errors back to transformedData
        const errors = result.error.format();
        const newTransformedData = [...state.transformedData];
        let hasErrors = false;

        // Zod array errors are indexed by key (index string)
        Object.keys(errors).forEach((key) => {
          if (key === "_errors") return; // Array-level errors
          const index = Number(key);
          if (!isNaN(index) && newTransformedData[index]) {
            const rowErrors = errors[key];
            const formattedErrors = {};

            // Extract field errors
            Object.keys(rowErrors).forEach((field) => {
              if (field !== "_errors") {
                formattedErrors[field] = rowErrors[field]._errors[0];
              }
            });

            if (Object.keys(formattedErrors).length > 0) {
              newTransformedData[index] = {
                ...newTransformedData[index],
                errors: formattedErrors,
              };
              hasErrors = true;
            }
          }
        });

        if (hasErrors) {
          dispatch(updateState({ transformedData: newTransformedData }));
          toast.error("Validation failed. Please check the highlighted rows.");
          setIsImporting(false);
          return;
        }
      }

      // 2. Call API
      await protectedApi.post("/transactions/bulk", state.transformedData);

      toast.success("Transactions imported successfully!");
      dispatch(reset());
      router.push("/dashboard/transactions");
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Failed to import transactions. Please try again.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-3 pr-4 self-stretch">
      {state.step > 1 && (
        <Button
          onClick={() => handleChange("back")}
          className="px-6"
          variant="outline"
          disabled={isImporting}
        >
          Back
        </Button>
      )}
      {state.step < lastStep && (
        <Button onClick={() => handleChange("next")} className="px-6">
          Next
        </Button>
      )}
      {state.step === lastStep && (
        <Button onClick={handleImport} className="px-6" disabled={isImporting}>
          {isImporting ? "Importing..." : "Import"}
        </Button>
      )}
    </div>
  );
}

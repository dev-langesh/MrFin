"use client";

import { Button } from "@/components/ui/button";
import {
  nextStep,
  previousStep,
  selectImportTransactions,
  reset,
  updateState,
  selectOptions,
  selectMappedFields,
  selectRules,
  selectTransactionSettings,
  saveSettings,
  selectErrorIndices,
  incrementValidationAttempt,
} from "@/redux/slices/importTransactionsSlice";
import React, { useState, useCallback } from "react";
import { validateStepData } from "@/components/dashboard/importTransactions/utils/validationUtils";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { protectedApi } from "@/api/axios";
import { transactionArraySchema } from "@/schemas/transaction.schema";
import { useRouter } from "next/navigation";

export default function ChangeStep() {
  const state = useSelector(selectImportTransactions);
  const options = useSelector(selectOptions);
  const mappedFields = useSelector(selectMappedFields);
  const rules = useSelector(selectRules);
  const transactionSettings = useSelector(selectTransactionSettings);
  const errorIndices = useSelector(selectErrorIndices);
  const dispatch = useDispatch();
  const router = useRouter();
  const lastStep = 4;
  const [isImporting, setIsImporting] = useState(false);

  const handleChange = useCallback(
    async (action) => {
      if (action === "next" && state.step < lastStep) {
        const isValid = validateStepData(state.step, state);
        if (!isValid) {
          dispatch(incrementValidationAttempt());
          return;
        }
        dispatch(nextStep());
      } else if (action === "back" && state.step > 1) {
        dispatch(previousStep());
      }
    },
    [state, dispatch, lastStep]
  );

  const handleImport = useCallback(async () => {
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

      // 2. Save Settings
      const uniqueTxnTypes = new Set([
        ...transactionSettings.txnTypes,
        ...state.transformedData.map((t) => t.txnType).filter(Boolean),
      ]);
      const uniqueCategories = new Set([
        ...transactionSettings.categories,
        ...state.transformedData.map((t) => t.category).filter(Boolean),
      ]);

      const settingsToSave = {
        importTransactionSettings: {
          preProcess: options,
          mapFields: mappedFields,
          rules: rules,
        },
        transactionSettings: {
          txnTypes: Array.from(uniqueTxnTypes),
          categories: Array.from(uniqueCategories),
        },
      };

      dispatch(saveSettings(settingsToSave));

      // 3. Call API
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
  }, [
    state.transformedData,
    dispatch,
    router,
    options,
    mappedFields,
    rules,
    transactionSettings,
  ]);

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

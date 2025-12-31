import {
  selectPreProcessedData,
  selectMappedFields,
  updateMappedFields,
  updateState,
  setMappedData,
  setIsLoading,
  selectIsLoading,
} from "@/redux/slices/importTransactionsSlice";
import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { FaRegSquarePlus, FaRegSquareMinus } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { dateFormatsOptions, formFields } from "./contsants";
import { isValid, parse, parseISO, formatISO } from "date-fns";
import Loading from "@/components/ui/Loading";

import { toISODateString } from "@/utils/dateUtils";
import { validateEntry } from "@/components/dashboard/importTransactions/utils/importUtils";

// ... existing imports

export default function MapFieldsOptions({ onApply }) {
  const [isOpen, setIsOpen] = useState(true);
  const [keys, setKeys] = useState([]);
  const [state, setState] = useState({});

  const preProcessedData = useSelector(selectPreProcessedData);
  const reduxMappedFields = useSelector(selectMappedFields);
  const isLoading = useSelector(selectIsLoading);
  const dispatch = useDispatch();

  useEffect(() => {
    // detect local date format
    const parts = new Intl.DateTimeFormat().formatToParts(
      new Date(2003, 11, 22)
    );

    const localDateFormat = parts
      .filter((p) => p.type !== "literal")
      .map((p) => {
        switch (p.type) {
          case "day":
            return "dd";
          case "month":
            return "MM";
          case "year":
            return "yyyy";
          default:
            return "";
        }
      })
      .join("-");

    setState((p) => ({ ...p, dateFormat: localDateFormat }));
  }, []);

  const handleChange = useCallback((key, value) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (!preProcessedData?.length) return;
    const keys = Object.keys(preProcessedData[0]).filter(
      (k) => k !== "uid" && !k.startsWith("_")
    );
    setKeys(keys);

    // 1. Regex Guesses
    const guesses = {};
    keys.forEach((key) => {
      if (/date/i.test(key)) guesses.txnDate = key;
      if (/description/i.test(key)) guesses.description = key;
      if (/credit/i.test(key)) guesses.credit = key;
      if (/debit/i.test(key)) guesses.debit = key;
    });

    // 2. Apply Saved Settings (if valid for current file)
    const savedSettings = {};
    if (reduxMappedFields) {
      Object.entries(reduxMappedFields).forEach(([key, value]) => {
        if (key === "dateFormat") {
          savedSettings[key] = value;
        } else if (value && keys.includes(value)) {
          savedSettings[key] = value;
        }
      });
    }

    setState((prev) => ({
      ...prev,
      ...guesses,
      ...savedSettings,
    }));
  }, [preProcessedData, reduxMappedFields]);

  const handleApply = useCallback(async () => {
    dispatch(setIsLoading(true));
    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const errorUids = [];
      const validatedData = preProcessedData.map((data) => {
        const val = validateEntry(data, state, state.dateFormat);
        // Ensure UID is preserved if validateEntry returns a new object without it
        // Check if val has uid, if not add it from data
        if (!val.uid) val.uid = data.uid;

        if (Object.keys(val.errors).length > 0) {
          errorUids.push(data.uid);
        }
        return val;
      });
      // Update mapped fields without hasError
      dispatch(updateMappedFields({ ...state }));
      dispatch(
        setMappedData({
          mappedData: validatedData,
          errorUids,
        })
      );
      if (onApply) onApply(errorUids.length > 0);
    } catch (error) {
      console.error("Failed to apply mapping:", error);
      toast.error("Failed to apply mapping.");
    } finally {
      dispatch(setIsLoading(false));
    }
  }, [dispatch, preProcessedData, state, onApply]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="px-0 rounded-sm py-3 md:py-5 relative gap-2">
        <CardHeader className={"max-md:px-3 " + (!isOpen && "gap-0 ")}>
          <div className="flex items-start justify-between">
            <CollapsibleTrigger className="flex items-start gap-2 flex-1 cursor-pointer">
              {isOpen ? (
                <FaRegSquareMinus className="text-lg flex-shrink-0" />
              ) : (
                <FaRegSquarePlus className="text-lg flex-shrink-0" />
              )}
              <div className="text-left">
                <CardTitle className="text-base font-semibold">
                  Map Fields
                </CardTitle>
                <CardDescription className="pt-1">
                  Assign CSV columns to matching transaction fields.
                </CardDescription>
              </div>
            </CollapsibleTrigger>
            <Button size="sm" onClick={handleApply} loading={isLoading}>
              Apply
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="max-md:px-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {formFields.map((field) => (
                <div key={field.key} className="space-y-2 w-full">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Select
                    value={state[field.key]}
                    onValueChange={(value) => handleChange(field.key, value)}
                  >
                    <SelectTrigger id={field.key} className="w-full rounded-sm">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {field.key === "dateFormat"
                        ? dateFormatsOptions.map((format) => (
                            <SelectItem key={format} value={format}>
                              {format}
                            </SelectItem>
                          ))
                        : keys.map((key) => (
                            <SelectItem key={key} value={key}>
                              {key}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

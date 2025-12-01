import {
  selectImportData,
  selectMappedFields,
  updateMappedFields,
  updateState,
  setIsLoading,
  selectIsLoading,
} from "@/redux/slices/importTransactionsSlice";
import React, { useEffect, useState } from "react";
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
import { validateEntry } from "@/utils/importUtils";

// ... existing imports

export default function MapFieldsOptions({ onApply }) {
  const [isOpen, setIsOpen] = useState(true);
  const [keys, setKeys] = useState([]);
  const [state, setState] = useState({});

  const importedData = useSelector(selectImportData);
  const isLoading = useSelector(selectIsLoading);
  const dispatch = useDispatch();

  console.log(toISODateString("01-09-2025 08:33:36", "dd-MM-yyyy"));
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

  useEffect(() => {
    if (!importedData?.length) return;
    const keys = Object.keys(importedData[0]);
    setKeys(keys);

    keys.forEach((key) => {
      if (/date/i.test(key)) handleChange("txnDate", key);
      if (/description/i.test(key)) handleChange("description", key);
      if (/credit/i.test(key)) handleChange("credit", key);
      if (/debit/i.test(key)) handleChange("debit", key);
    });
  }, [importedData]);

  function handleChange(key, value) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function handleApply() {
    dispatch(setIsLoading(true));
    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      let hasError = false;
      const validatedData = importedData.map((data) => {
        const val = validateEntry(data, state, state.dateFormat);
        if (Object.keys(val.errors).length > 0) {
          hasError = true;
        }
        return val;
      });
      dispatch(updateMappedFields({ ...state, hasError }));
      dispatch(
        updateState({
          mappedData: validatedData,
        })
      );
      if (onApply) onApply();
    } catch (error) {
      console.error("Failed to apply mapping:", error);
      toast.error("Failed to apply mapping.");
    } finally {
      dispatch(setIsLoading(false));
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="px-0 rounded-sm py-5">
        <CardHeader className={" " + (!isOpen && "gap-0 ")}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-start gap-2 flex-1 cursor-pointer">
              {isOpen ? (
                <FaRegSquareMinus className="text-lg flex-shrink-0" />
              ) : (
                <FaRegSquarePlus className="text-lg flex-shrink-0" />
              )}
              <div className="text-left">
                <CardTitle>Map Fields</CardTitle>
                <CardDescription className="pt-1">
                  Assign CSV columns to matching transaction fields.
                </CardDescription>
              </div>
            </CollapsibleTrigger>
            <Button size="sm" onClick={handleApply} disabled={isLoading}>
              {isLoading ? <Loading size="sm" text="Applying..." /> : "Apply"}
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="grid grid-cols-5 max-md:grid-cols-2 gap-4">
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

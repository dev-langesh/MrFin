import {
  selectImportData,
  selectMappedFields,
  updateMappedFields,
  updateState,
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

export function toISODateString(str, dateFormat) {
  if (!str) return null;

  // Trim first to handle trailing spaces
  const trimmed = String(str).trim();

  // Remove time component before parsing
  // Matches T or space followed by time-like patterns
  const dateOnlyStr = trimmed
    .replace(
      /[\sT]\d{1,2}:\d{1,2}(:\d{1,2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/,
      ""
    )
    .trim();

  let date;

  if (/^\d+$/.test(dateOnlyStr)) {
    const num = Number(dateOnlyStr);
    date = new Date(dateOnlyStr.length <= 10 ? num * 1000 : num);
  } else {
    // Try parsing as ISO first (handles yyyy-MM-dd)
    const isoDate = parseISO(dateOnlyStr);
    if (isValid(isoDate)) {
      date = isoDate;
    } else {
      const formatVariations = generateFormatPermutations(dateFormat);
      for (const fmt of formatVariations) {
        try {
          const parsed = parse(dateOnlyStr, fmt, new Date());
          if (isValid(parsed)) {
            date = parsed;
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
  }

  if (!date) {
    const nativeDate = new Date(dateOnlyStr);
    if (isValid(nativeDate)) {
      date = nativeDate;
    }
  }

  if (date && isValid(date)) {
    // Set time to midnight UTC to ignore time component
    date.setHours(0, 0, 0, 0);
    // Adjust for timezone offset to keep the date correct
    const offset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() - offset);
    return adjustedDate.toISOString();
  }

  return false;
}

function generateFormatPermutations(baseFormat) {
  const formats = new Set();

  // Generate variations for separators
  const separators = ["-", "/", "."];
  const parts = baseFormat.split(/[-/.]/);

  if (parts.length === 3) {
    separators.forEach((sep) => {
      const fmt = parts.join(sep);
      formats.add(fmt);
      formats.add(fmt.replace("MM", "MMM"));
      formats.add(fmt.replace("MM", "MMMM"));
    });
  } else {
    // Fallback if format doesn't match expected structure
    formats.add(baseFormat);
    formats.add(baseFormat.replace("MM", "MMM"));
    formats.add(baseFormat.replace("MM", "MMMM"));
  }

  return Array.from(formats);
}

export default function MapFieldsOptions({ onApply }) {
  const [isOpen, setIsOpen] = useState(true);
  const [keys, setKeys] = useState([]);
  const [state, setState] = useState({});

  const importedData = useSelector(selectImportData);
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

  function validateEntry(entry) {
    // Only include fields that are mapped
    const mappedColumns = [
      state.txnDate,
      state.description,
      state.credit,
      state.debit,
    ].filter(Boolean); // Filter out undefined/null

    // Create object with only mapped fields using original keys
    const validatedData = mappedColumns.reduce((acc, key) => {
      if (entry[key] !== undefined) {
        acc[key] = entry[key];
      }
      return acc;
    }, {});

    validatedData.errors = {};

    // Validate Date
    if (state.txnDate) {
      const dateStr = entry[state.txnDate];
      const isoDate = toISODateString(dateStr, state.dateFormat);

      if (isoDate) {
        // Store standardized date in a separate property if needed,
        // but user requested original keys.
        // We might need to store the parsed date for sorting/display logic
        // or update the original key's value.
        // The requirement says "store the data in it's original key in csv".
        // If I replace the value, I lose the original format.
        // But `toISODateString` returns ISO.
        // Let's assume we should update the value to the standardized format
        // OR keep it as is and parse on fly?
        // The previous code did: `validatedData.txnDate = isoDate`.
        // Now we don't have `txnDate` key. We have `entry[state.txnDate]`.
        // Let's update the value at `state.txnDate` to the ISO string for consistency in DB?
        // Actually, if we want to "ignore time", we need to parse it.
        // Let's update the value in the object.
        validatedData[state.txnDate] = isoDate;
      } else {
        validatedData.errors[state.txnDate] = `Invalid date`;
      }
    }

    // Validate Credit
    if (state.credit && entry[state.credit]) {
      const creditStr = entry[state.credit]?.replace(/[^0-9.-]/g, "");
      if (isNaN(Number(creditStr))) {
        validatedData.errors[state.credit] = `Invalid number`;
      } else {
        validatedData[state.credit] = creditStr;
      }
    }

    // Validate Debit
    if (state.debit && entry[state.debit]) {
      const debitStr = entry[state.debit]?.replace(/[^0-9.-]/g, "");
      if (isNaN(Number(debitStr))) {
        validatedData.errors[state.debit] = `Invalid number`;
      } else {
        validatedData[state.debit] = debitStr;
      }
    }

    // Validate Amount Presence
    const creditVal = state.credit ? validatedData[state.credit] : null;
    const debitVal = state.debit ? validatedData[state.debit] : null;

    if (!creditVal && !debitVal) {
      validatedData.errors.amount = "Either Credit or Debit is required";
    }

    return validatedData;
  }

  function handleChange(key, value) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function handleApply() {
    let hasError = false;
    const validatedData = importedData.map((data, index) => {
      const val = validateEntry(data);
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
            <Button size="sm" onClick={handleApply}>
              Apply
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

import {
  selectImportData,
  selectMappedFields,
  setData,
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

  const trimmed = String(str).trim();

  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    const date = new Date(trimmed.length <= 10 ? num * 1000 : num);
    if (isValid(date)) return date.toISOString();
  }

  if (trimmed.includes("T") || trimmed.includes("Z")) {
    const isoDate = parseISO(trimmed);
    if (isValid(isoDate)) return isoDate.toISOString();
  }

  const formatVariations = generateFormatPermutations(dateFormat);

  for (const fmt of formatVariations) {
    try {
      const parsed = parse(trimmed, fmt, new Date());
      if (isValid(parsed)) {
        return parsed.toISOString();
      }
    } catch (e) {
      continue;
    }
  }

  const nativeDate = new Date(trimmed);
  if (isValid(nativeDate)) {
    return nativeDate.toISOString();
  }

  return false;
}

function generateFormatPermutations(baseFormat) {
  const formats = [];

  const monthFormats = [
    baseFormat,
    baseFormat.replace("MM", "MMM"),
    baseFormat.replace("MM", "MMMM"),
  ];

  const timeExtensions = [
    "",
    " HH:mm",
    " HH:mm:ss",
    " HH:mm:ss.SSS",
    "'T'HH:mm:ss", // Escaped T
    "'T'HH:mm:ss.SSS", // Escaped T
  ];

  monthFormats.forEach((mf) => {
    timeExtensions.forEach((time) => {
      formats.push(`${mf}${time}`);
    });
  });

  return formats;
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
    const mappedColumns = [
      state.txnDate,
      state.description,
      state.credit,
      state.debit,
    ];

    const unmappedFields = Object.keys(entry).reduce((acc, key) => {
      if (!mappedColumns.includes(key)) {
        acc[key] = entry[key];
      }
      return acc;
    }, {});

    const validatedData = {
      ...unmappedFields,
      description: entry[state.description],
      errors: {},
    };

    const dateStr = entry[state.txnDate];
    const isoDate = toISODateString(dateStr, state.dateFormat);

    if (isoDate) {
      validatedData.txnDate = isoDate;
    } else {
      validatedData.errors.txnDate = `Invalid date`;
    }

    const creditStr = entry[state.credit]?.replace(/,/g, "");
    if (!!isNaN(Number(creditStr))) {
      validatedData.errors.credit = `Invalid number`;
    } else {
      validatedData.credit = creditStr;
    }

    const debitStr = entry[state.debit]?.replace(/,/g, "");
    if (!!isNaN(Number(debitStr))) {
      validatedData.errors.debit = `Invalid number`;
    } else {
      validatedData.debit = debitStr;
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
                  Assign CSV columns to matching transaction fields. Only mapped
                  fields will be used for import and saved to the database.
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

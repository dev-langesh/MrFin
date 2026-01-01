import {
  selectPreProcessedData,
  selectMappedFields,
  updateMappedFields,
  setMappedData,
  setIsLoading,
  selectIsLoading,
} from "@/redux/slices/importTransactionsSlice";
import React, { useEffect, useState, useCallback, useRef } from "react";
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
import { dateFormatsOptions, formFields } from "./contsants";
import { validateEntry } from "@/components/dashboard/importTransactions/utils/importUtils";

export default function MapFieldsOptions({ onApply }) {
  const [isOpen, setIsOpen] = useState(true);
  const [keys, setKeys] = useState([]);

  const preProcessedData = useSelector(selectPreProcessedData);
  const state = useSelector(selectMappedFields);
  const dispatch = useDispatch();

  useEffect(() => {
    // One-time initialization of date format if not present
    if (!state.dateFormat) {
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
      dispatch(updateMappedFields({ dateFormat: localDateFormat }));
    }
  }, []); // Run once

  const handleChange = useCallback(
    (key, value) => {
      if (state[key] !== value) {
        dispatch(updateMappedFields({ [key]: value }));
      }
    },
    [state]
  );

  // Effect 1: Calculate Guesses when Keys change
  useEffect(() => {
    if (!preProcessedData?.length) return;
    const keys = Object.keys(preProcessedData[0]).filter(
      (k) => k !== "uid" && !k.startsWith("_")
    );
    setKeys(keys);

    // Regex Guesses
    const guesses = {};
    keys.forEach((key) => {
      if (/date/i.test(key) && !state.txnDate) guesses.txnDate = key;
      if (/description/i.test(key) && !state.description)
        guesses.description = key;
      if (/credit/i.test(key) && !state.credit) guesses.credit = key;
      if (/debit/i.test(key) && !state.debit) guesses.debit = key;
    });

    if (Object.keys(guesses).length > 0) {
      dispatch(updateMappedFields(guesses));
    }
  }, [preProcessedData]);

  const onApplyRef = useRef(onApply);

  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  // Effect 2: Validation and Data Mapping
  useEffect(() => {
    if (!preProcessedData || preProcessedData.length === 0) return;

    const timer = setTimeout(() => {
      dispatch(setIsLoading(true));

      try {
        const errorUids = [];
        const validatedData = preProcessedData.map((data) => {
          const val = validateEntry(data, state, state.dateFormat);
          if (!val.uid) val.uid = data.uid;

          if (Object.keys(val.errors).length > 0) {
            errorUids.push(data.uid);
          }
          return val;
        });

        // Dispatch Mapped Data (Validation Results)
        dispatch(
          setMappedData({
            mappedData: validatedData,
            errorUids,
          })
        );

        if (onApplyRef.current) onApplyRef.current(errorUids.length > 0);
      } catch (error) {
        console.error("Failed to apply mapping:", error);
        toast.error("Failed to apply mapping.");
      } finally {
        dispatch(setIsLoading(false));
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [preProcessedData, state]);

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

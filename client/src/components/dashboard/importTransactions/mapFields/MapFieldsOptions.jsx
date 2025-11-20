import {
  selectImportData,
  selectMappedFields,
  updateMappedFields,
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

const formFields = [
  { key: "txnDate", label: "Date" },
  { key: "description", label: "Description" },
  { key: "credit", label: "Credit" },
  { key: "debit", label: "Debit" },
];

function isValidDateString(str) {
  const date = new Date(str);
  return !isNaN(date.getTime());
}

export default function MapFieldsOptions() {
  const [isOpen, setIsOpen] = useState(true);
  const [keys, setKeys] = useState([]);

  const importedData = useSelector(selectImportData);
  const mappedFields = useSelector(selectMappedFields);
  const dispatch = useDispatch();

  const testData = importedData?.length ? [...importedData].slice(0, 20) : [];

  function validateKey(key, columnKey) {
    switch (key) {
      case "txnDate":
        return testData.every((d) => isValidDateString(d[columnKey]));
      case "credit":
        return testData.every(
          (d) => !isNaN(Number(d[columnKey]?.replace(/,/g, "")))
        );
      case "debit":
        return testData.every(
          (d) => !isNaN(Number(d[columnKey]?.replace(/,/g, "")))
        );
      default:
        return true;
    }
  }

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
    if (!validateKey(key, value)) {
      return toast.error("Invalid type");
    }
    dispatch(updateMappedFields({ [key]: value }));
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className=" rounded-sm p-3">
        <CardHeader className={"px-0 " + (!isOpen && "gap-0 ")}>
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
                  Assign columns from your CSV to the matching transaction
                  fields below. Only the fields you map will be used during
                  import and saved to the database.{" "}
                </CardDescription>
              </div>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="grid grid-cols-4 max-md:grid-cols-2 gap-4">
              {formFields.map((field) => (
                <div key={field.key} className="space-y-2 w-full">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Select
                    value={mappedFields[field.key]}
                    onValueChange={(value) => handleChange(field.key, value)}
                  >
                    <SelectTrigger id={field.key} className="w-full rounded-sm">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {keys.map((key) => (
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

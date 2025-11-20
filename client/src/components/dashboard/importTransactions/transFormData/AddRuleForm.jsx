import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { selectImportData } from "@/redux/slices/importTransactionsSlice";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useState } from "react";
import { useSelector } from "react-redux";
import { actionsOptions, operationsOptions } from "./constants";

const initialState = {
  name: "",
  source: "",
  target: "",
  operation: "",
  operationValue: "",
  action: "",
  targetValue: "",
};

export default function AddRuleForm(props) {
  const [rule, setRule] = useState(initialState);
  const importedData = useSelector(selectImportData);
  const importedDataKeys = Object.keys(importedData[0] || {});

  function handleChange(name, value) {
    setRule((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    props.setRules?.((prev) => [...prev, rule]);
    props.close();
  }

  function handleCancel() {
    setRule(initialState);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Add Rules</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3">
          <Input
            type="text"
            name="name"
            label="Rule Name"
            placeholder="Rule Name"
            value={rule.name}
            onChange={(e) => handleChange("name", e.target.value)}
            maxLength={40}
          />
        </div>
        <div className="space-y-2 max-md:col-span-3">
          <Label htmlFor="source">Source Field</Label>
          <Select
            value={rule.source}
            onValueChange={(value) => handleChange("source", value)}
          >
            <SelectTrigger id="source" className="w-full rounded-sm">
              <SelectValue placeholder="Select Source" />
            </SelectTrigger>
            <SelectContent>
              {importedDataKeys.map((key) => (
                <SelectItem key={`source-${key}`} value={key}>
                  {key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>{" "}
        <div className="space-y-2 max-md:col-span-3">
          <Label htmlFor="operation">Operation</Label>
          <Select
            value={rule.operation}
            onValueChange={(value) => handleChange("operation", value)}
          >
            <SelectTrigger id="operation" className="w-full rounded-sm">
              <SelectValue placeholder="Select Operation" />
            </SelectTrigger>
            <SelectContent>
              {operationsOptions.map((op, i) => (
                <SelectItem key={`operation-${i}`} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>{" "}
        <div className="max-md:col-span-3">
          <Input
            type="text"
            name="operationValue"
            label="Value"
            placeholder="Value"
            value={rule.operationValue}
            onChange={(e) => handleChange("operationValue", e.target.value)}
            maxLength={40}
          />
        </div>
        <div className="space-y-2 max-md:col-span-3">
          <Label htmlFor="action">Action</Label>
          <Select
            value={rule.action}
            onValueChange={(value) => handleChange("action", value)}
          >
            <SelectTrigger id="action" className="w-full rounded-sm">
              <SelectValue placeholder="Select Action" />
            </SelectTrigger>
            <SelectContent>
              {actionsOptions.map((action, i) => (
                <SelectItem key={`action-${i}`} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {rule.action === "update" && (
          <>
            <div className="space-y-2 max-md:col-span-3">
              <Label htmlFor="target">Target Field</Label>
              <Select
                value={rule.target}
                onValueChange={(value) => handleChange("target", value)}
              >
                <SelectTrigger id="target" className="w-full rounded-sm">
                  <SelectValue placeholder="Select Target" />
                </SelectTrigger>
                <SelectContent>
                  {actionsOptions.map((action, i) => (
                    <SelectItem key={`action-${i}`} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="max-md:col-span-3">
              <Input
                type="text"
                name="targetValue"
                label="Value"
                placeholder="Value"
                value={rule.targetValue}
                onChange={(e) => handleChange("targetValue", e.target.value)}
                maxLength={40}
              />
            </div>
          </>
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">Add</Button>
      </DialogFooter>
    </form>
  );
}

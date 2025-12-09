import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
  selectImportData,
  selectTransactionSettings,
} from "@/redux/slices/importTransactionsSlice";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useSelector } from "react-redux";
import { AutoSelect } from "@/components/ui/AutoSelect";
import { actionsOptions, operationsOptions } from "./constants";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { memo } from "react";

import { ruleSchema } from "@/schemas/rules.schema";
import { TXN_TYPES } from "../../config";

const defaultValues = {
  name: "",
  source: "",
  operation: "",
  operationValue: "",
  action: "",
  target: "",
  targetValue: "",
};

function AddRuleForm(props) {
  const importedData = useSelector(selectImportData);
  const transactionSettings = useSelector(selectTransactionSettings);
  const sourceOptions = Object.keys(importedData[0] || {});

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ruleSchema),
    defaultValues: props.initialData || defaultValues,
  });

  const operation = watch("operation");
  const action = watch("action");
  const name = watch("name");

  function onSubmit(data) {
    props.onSubmit?.(data);
    props.close?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {props.index !== undefined ? "Edit Rule" : "Add Rule"}
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-6">
        {/* Rule Name */}
        <div className="space-y-2">
          <Input
            label="Rule Name"
            placeholder="e.g., Categorize Rent"
            {...register("name")}
            maxLength={40}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <p className="text-xs text-muted-foreground">
            Give your rule a descriptive name to easily identify it later.
          </p>
        </div>

        {/* Condition Section */}
        <div className="space-y-4 border p-4 rounded-md bg-muted/20">
          <h3 className="font-medium text-sm text-foreground/80">Condition</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>If Field</Label>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    error={!!errors.source}
                    helperText={errors.source?.message}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map((key) => (
                        <SelectItem key={`source-${key}`} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Operator</Label>
              <Controller
                name="operation"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    error={!!errors.operation}
                    helperText={errors.operation?.message}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {operationsOptions.map((op, i) => (
                        <SelectItem key={`op-${i}`} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {!["exists", "not-exists"].includes(operation) && (
            <Input
              label="Value"
              placeholder="Value to match"
              {...register("operationValue")}
              error={!!errors.operationValue}
              helperText={errors.operationValue?.message}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Example: If <strong>Description</strong> contains{" "}
            <strong>"Netflix"</strong>
          </p>
        </div>

        {/* Action Section */}
        <div className="space-y-4 border p-4 rounded-md bg-muted/20">
          <h3 className="font-medium text-sm text-foreground/80">Action</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Controller
                name="action"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    error={!!errors.action}
                    helperText={errors.action?.message}
                  >
                    <SelectTrigger className="w-full">
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
                )}
              />
            </div>

            {action === "update" && (
              <div className="space-y-2">
                <Label>Target Field</Label>
                <Controller
                  name="target"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      error={!!errors.target}
                      helperText={errors.target?.message}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Target" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="txnType">
                          Transaction Type
                        </SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>

          {action === "update" && (
            <div className="space-y-2">
              {watch("target") === "txnType" ? (
                <>
                  <Label>Set Value To</Label>
                  <Controller
                    name="targetValue"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {TXN_TYPES.map((type, i) => (
                            <SelectItem key={`type-${i}`} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </>
              ) : watch("target") === "category" ? (
                <>
                  <Label>Set Value To</Label>
                  <Controller
                    name="targetValue"
                    control={control}
                    render={({ field }) => (
                      <AutoSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={transactionSettings.categories}
                        placeholder="Select Category"
                      />
                    )}
                  />
                </>
              ) : (
                <Input
                  label="Set Value To"
                  placeholder="New Value"
                  {...register("targetValue")}
                  error={!!errors.targetValue}
                  helperText={errors.targetValue?.message}
                />
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Example: Set <strong>Category</strong> to{" "}
            <strong>"Entertainment"</strong>
          </p>
        </div>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" onClick={props.handleCancel}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">
          {props.index !== undefined ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default memo(AddRuleForm);

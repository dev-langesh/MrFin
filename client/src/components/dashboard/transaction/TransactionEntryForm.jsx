"use client";

import React, { memo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AutoSelect } from "@/components/ui/AutoSelect";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Calendar } from "@/components/ui/Calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { transactionService } from "@/services/transactions.service";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { transactionSchema } from "@/schemas/transaction.schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { TXN_TYPES } from "../config";

function TransactionEntryForm({
  editingEntry = null,
  setData,
  close,
  filters,
  setTotalData,
  settings,
}) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    register,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      txnDate: editingEntry?.txnDate
        ? new Date(editingEntry.txnDate)
        : new Date(),
      amount: editingEntry?.amount ? String(editingEntry.amount) : "",
      txnType: editingEntry?.txnType || "",
      category: editingEntry?.category || "",
      description: editingEntry?.description || "",
    },
  });

  console.log(errors);

  const txnType = watch("txnType");

  useEffect(() => {
    if (editingEntry && txnType === editingEntry.txnType) return;
  }, [txnType, editingEntry]);

  function toUtcMidnight(date) {
    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
  }

  async function onSubmit(data) {
    try {
      const payload = {
        ...data,
        txnDate: toUtcMidnight(data.txnDate),
        amount: Number(data.amount),
      };

      const optimisticPayload = {
        ...payload,
        txnDate: payload.txnDate.toISOString(),
      };

      if (editingEntry) {
        await transactionService.editTransaction(editingEntry._id, payload);
        setData((prev) =>
          prev.map((entry) =>
            entry._id === editingEntry._id
              ? { ...entry, ...optimisticPayload }
              : entry
          )
        );
        toast.success(`Entry updated`);
      } else {
        const res = await transactionService.addTransaction(payload);

        const matchesFilters =
          (!filters.txnType ||
            filters.txnType === "all" ||
            (Array.isArray(filters.txnType)
              ? filters.txnType.includes(res.txnType)
              : filters.txnType === res.txnType)) &&
          (!filters.startDate ||
            (new Date(payload.txnDate) >= new Date(filters.startDate) &&
              new Date(payload.txnDate) <= new Date(filters.endDate)));

        if (matchesFilters) {
          setData((prev) => {
            const newData = [
              ...prev,
              { ...res, txnDate: res.txnDate || optimisticPayload.txnDate },
            ].sort((a, b) => {
              const dateA = new Date(a.txnDate);
              const dateB = new Date(b.txnDate);
              return filters.sort === "asc" ? dateA - dateB : dateB - dateA;
            });
            return newData;
          });
          if (setTotalData) setTotalData((total) => total + 1);
        }
        toast.success(`Entry added`);
      }
      close();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editingEntry ? "Edit" : "Add"} Transaction</DialogTitle>
        <DialogDescription>
          {editingEntry
            ? "Edit the transaction to update your record."
            : "Add a new transaction to track your income or expense."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
        {/* Row 1: Date & Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="txnDate">Date</Label>
            <Controller
              control={control}
              name="txnDate"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-border hover:border-border-active",
                        !field.value && "text-muted-foreground",
                        errors.txnDate && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.txnDate && (
              <p className="text-sm text-destructive">
                {errors.txnDate.message}
              </p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="txnType">Transaction Type</Label>
            <Controller
              control={control}
              name="txnType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger onChange={field.onChange} className="w-full">
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
            {errors.txnType && (
              <p className="text-sm text-destructive">
                {errors.txnType.message}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Amount & Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Enter amount"
              error={errors.amount?.message}
              helperText={errors.amount?.message}
              {...register("amount")}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <AutoSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={settings?.transactionSettings?.categories || []}
                  placeholder="Select or create category"
                />
              )}
            />
            {errors.category && (
              <p className="text-sm text-destructive">
                {errors.category.message}
              </p>
            )}
          </div>
        </div>

        {/* Row 3: Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter description"
            className="min-h-[100px] break-all"
            error={errors.description?.message}
            helperText={errors.description?.message}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-sm text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {editingEntry ? "Update Entry" : "Add Entry"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export default memo(TransactionEntryForm);

"use client";

import React, { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
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
import {
  transactionFormExpenseCategoryOptions,
  transactionFormPaymentGateways,
  transactionFormSources,
  transactionFormTxnTypeOptions,
} from "./constants";

function TransactionEntryForm({
  editingEntry = null,
  setData,
  close,
  filters,
  setTotalData,
}) {
  const [formData, setFormData] = useState({
    txnDate: editingEntry?.txnDate
      ? new Date(editingEntry.txnDate)
      : new Date(),
    txnType: editingEntry?.txnType || "",
    amount: editingEntry?.amount || "",
    source: editingEntry?.source || "",
    paymentGateway: editingEntry?.paymentGateway || "",
    expenseCategory: editingEntry?.expenseCategory || "",
    description: editingEntry?.description || "",
  });

  function toUtcMidnight(date) {
    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
  }

  async function handleSubmit(e) {
    try {
      e.preventDefault();

      const payload = {
        ...formData,
        txnDate: toUtcMidnight(formData.txnDate),
        amount: Number(formData.amount),
      };

      if (!payload.txnType)
        return toast.error("Please select a transaction type.");

      if (payload.txnType === "expense") {
        if (!payload.expenseCategory) {
          return toast.error("Please select an expense category.");
        }
        delete payload.paymentGateway;
        delete payload.source;
      } else if (payload.txnType === "revenue") {
        if (!payload.source) {
          return toast.error("Please select a source.");
        }
        if (!payload.paymentGateway) {
          return toast.error("Please select a payment gateway.");
        }
        delete payload.expenseCategory;
      }

      if (editingEntry) {
        await transactionService.editTransaction(editingEntry._id, payload);
        setData((prev) =>
          prev.map((entry) =>
            entry._id === editingEntry._id ? { ...entry, ...payload } : entry
          )
        );
      } else {
        const res = await transactionService.addTransaction(payload);

        if (
          (!filters.txnType ||
            filters.txnType === "all" ||
            filters.txnType === res.txnType) &&
          (!filters.startDate ||
            (formData.txnDate >= filters.startDate &&
              formData.txnDate <= filters.endDate))
        ) {
          setData((prev) => {
            let inserted = false;
            const sorted = [];
            for (let i = 0; i < prev.length; i++) {
              if (!inserted) {
                if (filters.sort === "asc") {
                  if (formData.txnDate <= new Date(prev[i].txnDate)) {
                    sorted.push(formData);
                    inserted = true;
                  }
                } else {
                  if (formData.txnDate >= new Date(prev[i].txnDate)) {
                    sorted.push(formData);
                    inserted = true;
                  }
                }
              }
              sorted.push(prev[i]);
            }
            if (!inserted) sorted.push(formData);
            setTotalData((total) => total + 1);
            return sorted;
          });
        }
      }

      toast.success(`Entry ${editingEntry ? "updated" : "added"}`);
      close();
    } catch (e) {
      toast.error(e.message);
    }
  }

  function handleChange(name, value) {
    setFormData((prev) => ({ ...prev, [name]: value }));
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

      <form onSubmit={handleSubmit} className="space-y-4 ">
        {/* Row 1: Date & Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="txnDate">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="txnDate"
                  variant="outline"
                  className="w-full justify-start text-left font-normal border-border hover:border-border-active"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.txnDate
                    ? format(formData.txnDate, "PPP")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  disabled={(date) => date > new Date()}
                  mode="single"
                  selected={formData.txnDate}
                  onSelect={(date) => date && handleChange("txnDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={(e) => handleChange("amount", e.target.value)}
              required
            />
          </div>

          {/* Row 2: Transaction Type & Expense Category */}

          <div className="space-y-2">
            <Label htmlFor="txnType">Transaction Type</Label>
            <Select
              value={formData.txnType}
              onValueChange={(value) => handleChange("txnType", value)}
            >
              <SelectTrigger id="txnType" className="w-full rounded-sm">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {transactionFormTxnTypeOptions.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {formData.txnType === "expense" && (
            <div className="space-y-2">
              <Label htmlFor="expenseCategory">Expense Category</Label>
              <Select
                value={formData.expenseCategory}
                onValueChange={(value) =>
                  handleChange("expenseCategory", value)
                }
              >
                <SelectTrigger
                  id="expenseCategory"
                  className="w-full rounded-sm"
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {transactionFormExpenseCategoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Row 3: Source & Payment Gateway */}
          {formData.txnType === "revenue" && (
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => handleChange("source", value)}
              >
                <SelectTrigger className="w-full rounded-sm" id="source">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {transactionFormSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {formData.txnType === "revenue" && (
            <div className="space-y-2">
              <Label htmlFor="paymentGateway">Payment Gateway</Label>
              <Select
                value={formData.paymentGateway}
                onValueChange={(value) => handleChange("paymentGateway", value)}
              >
                <SelectTrigger
                  id="paymentGateway"
                  className="w-full rounded-sm"
                >
                  <SelectValue placeholder="Select processor" />
                </SelectTrigger>
                <SelectContent>
                  {transactionFormPaymentGateways.map((gateway) => (
                    <SelectItem key={gateway} value={gateway}>
                      {gateway}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

        </div>
        {/* Row 4: Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button type="submit">
            {editingEntry ? "Update Entry" : "Add Entry"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export default memo(TransactionEntryForm);

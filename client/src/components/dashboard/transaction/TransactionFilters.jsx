"use client";

import React, { memo, useEffect, useState } from "react";
import { Label } from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { DatePickerWithRange } from "@/components/ui/DatePickerWithRange";
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns";

import { MultiSelect } from "@/components/ui/MultiSelect";
import { TXN_TYPES } from "../config";

// helpers
function toUtcMidnight(date) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
}

function toUtcEndOfDay(date) {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999
    )
  );
}

const defaultFilters = {
  dateRange: "all",
  startDate: null,
  endDate: null,
  category: [],
  description: null,
  sort: "desc",
  limit: 10,
  page: 1,
};

function TransactionFilters({
  activeFilters,
  onApply,
  isOpen,
  categories = [],
}) {
  const [localFilters, setLocalFilters] = useState({
    ...defaultFilters,
    ...activeFilters,
  });

  // Sync local state when popover opens or active filters change externally
  useEffect(() => {
    if (isOpen) {
      setLocalFilters({ ...defaultFilters, ...activeFilters });
    }
  }, [isOpen, activeFilters]);

  function handleSelectChange(name, value) {
    setLocalFilters((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "dateRange") {
        let startDate = null;
        let endDate = null;
        const now = new Date();

        switch (value) {
          case "current-month":
            startDate = toUtcMidnight(startOfMonth(now));
            endDate = toUtcEndOfDay(endOfMonth(now));
            break;
          case "current-quarter":
            startDate = toUtcMidnight(startOfQuarter(now));
            endDate = toUtcEndOfDay(endOfQuarter(now));
            break;
          case "current-year":
            startDate = toUtcMidnight(startOfYear(now));
            endDate = toUtcEndOfDay(endOfYear(now));
            break;
          case "all":
            startDate = null;
            endDate = null;
            break;
          case "custom":
            break;
        }
        updated.startDate = startDate;
        updated.endDate = endDate;
      }
      return updated;
    });
  }

  const handleApply = () => {
    const payload = {};
    Object.entries(localFilters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length === 0) return;
      if (value === null || value === undefined || value === "" || value === "all") return;
      payload[key] = value;
    });
    onApply(payload);
  };

  const handleClear = () => {
    const cleared = { ...defaultFilters, limit: activeFilters.limit }; // Preserve limit preference if desired, or reset
    setLocalFilters(cleared);
    onApply(cleared);
  };

  const categoryOptions = React.useMemo(() => {
    let filtered = categories;

    if (localFilters.txnType && localFilters.txnType !== "all") {
      filtered = categories.filter((c) => c.txnType === localFilters.txnType);
    }

    const uniqueNames = [...new Set(filtered.map((c) => c.category))];
    return uniqueNames.map((c) => ({ label: c, value: c }));
  }, [categories, localFilters.txnType]);

  console.log(localFilters);

  return (
    <div className="space-y-4 w-full">
      <div className="grid grid-cols-1 gap-4">
        {/* Date Range Pre-select */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <Select
            value={localFilters.dateRange}
            onValueChange={(val) => handleSelectChange("dateRange", val)}
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="current-month">Current Month</SelectItem>
              <SelectItem value="current-quarter">Current Quarter</SelectItem>
              <SelectItem value="current-year">Current Year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Picker */}
        {localFilters.dateRange === "custom" && (
          <div className="space-y-2">
            <Label>Custom Range</Label>
            <DatePickerWithRange
              value={{
                from: localFilters.startDate || undefined,
                to: localFilters.endDate || undefined,
              }}
              onChange={(range) => {
                setLocalFilters((prev) => ({
                  ...prev,
                  dateRange: "custom",
                  startDate: range?.from || null,
                  endDate: range?.to || null,
                }));
              }}
            />
          </div>
        )}

        {/* Transaction Type MultiSelect */}
        <div className="space-y-2">
          <Label>Transaction Type</Label>

          <Select
            onValueChange={(val) => handleSelectChange("txnType", val)}
            value={localFilters.txnType}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              {TXN_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category MultiSelect */}
        <div className="space-y-2">
          <Label>Category</Label>
          <MultiSelect
            options={categoryOptions}
            selected={localFilters.category || []}
            onChange={(val) => handleSelectChange("category", val)}
            placeholder="All Categories"
            variant="coloured"
          />
        </div>

        {/* Description Search */}
        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            placeholder="Search description..."
            value={localFilters.description || ""}
            onChange={(e) => handleSelectChange("description", e.target.value)}
            className="w-full h-9"
          />
        </div>

        {/* Sort Order */}
        <div className="space-y-2">
          <Label>Sort</Label>
          <Select
            value={localFilters.sort}
            onValueChange={(val) => handleSelectChange("sort", val)}
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Select order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t mt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          Clear
        </Button>
        <Button size="sm" onClick={handleApply} className="h-8 px-4">
          Apply
        </Button>
      </div>
    </div>
  );
}

export default memo(TransactionFilters);

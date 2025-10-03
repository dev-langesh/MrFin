"use client";

import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
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

function RevenueFilters({ filters, setFilters }) {
  function handleSelectChange(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }));

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
          // leave null → date picker will set these
          break;
      }

      setFilters((prev) => ({
        ...prev,
        startDate,
        endDate,
      }));
    }
  }

  return (
    <Card className="px-0 rounded-sm py-4 gap-2">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-11 gap-4">
          {/* Date Range */}
          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label>Date Range</Label>
            <Select
              value={filters.dateRange}
              onValueChange={(val) => handleSelectChange("dateRange", val)}
            >
              <SelectTrigger className="w-full rounded-sm">
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
          <div className="space-y-2 col-span-1 md:col-span-3">
            <Label>Custom Range</Label>
            <DatePickerWithRange
              value={{
                from: filters.startDate || undefined,
                to: filters.endDate || undefined,
              }}
              onChange={(range) => {
                setFilters((prev) => ({
                  ...prev,
                  dateRange: "custom",
                  startDate: range?.from || null,
                  endDate: range?.to || null,
                }));
              }}
            />
          </div>

          {/* Source */}
          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label>Source</Label>
            <Select
              value={filters.source}
              onValueChange={(val) => handleSelectChange("source", val)}
            >
              <SelectTrigger className="w-full rounded-sm">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="GPay">GPay</SelectItem>
                <SelectItem value="Fiverr">Fiverr</SelectItem>
                <SelectItem value="PayPal">PayPal</SelectItem>
                <SelectItem value="Payoneer">Payoneer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Processor */}
          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label>Payment Processor</Label>
            <Select
              value={filters.paymentGateway}
              onValueChange={(val) => handleSelectChange("paymentGateway", val)}
            >
              <SelectTrigger className="w-full rounded-sm">
                <SelectValue placeholder="Select processor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Processors</SelectItem>
                <SelectItem value="GPay">GPay</SelectItem>
                <SelectItem value="PayPal">PayPal</SelectItem>
                <SelectItem value="Payoneer">Payoneer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label>Sort by Date</Label>
            <Select
              value={filters.sort}
              onValueChange={(val) => handleSelectChange("sort", val)}
            >
              <SelectTrigger className="w-full rounded-sm">
                <SelectValue placeholder="Select order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(RevenueFilters);

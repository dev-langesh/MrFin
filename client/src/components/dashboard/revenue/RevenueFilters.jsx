"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

export default function RevenueFilters({ filters, setFilters }) {
  function handleSelectChange(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <Card className="px-0 rounded-sm py-4 gap-2">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date Range */}
          <div className="space-y-2">
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
              </SelectContent>
            </Select>
          </div>

          {/* Source */}
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label>Payment Processor</Label>
            <Select
              value={filters.paymentProcessor}
              onValueChange={(val) => handleSelectChange("paymentProcessor", val)}
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
          <div className="space-y-2">
            <Label>Sort by Date</Label>
            <Select
              value={filters.sortOrder}
              onValueChange={(val) => handleSelectChange("sortOrder", val)}
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

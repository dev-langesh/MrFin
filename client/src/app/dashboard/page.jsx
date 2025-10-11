"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import DashboardSummary from "@/components/dashboard/dashboard/DashboardSummary";
import DashboardFilters from "@/components/dashboard/dashboard/DashboardFilters";

export default function TransactionPage() {
  const [summaryPeriod, setSummaryPeriod] = useState("quarter");
  const [filters, setFilters] = useState({
    dateRange: "all",
    source: "all",
    paymentGateway: "all",
    sort: "desc",
    limit: 10,
    page: 1,
  });

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <Select value={summaryPeriod} onValueChange={setSummaryPeriod}>
          <SelectTrigger className="w-[150px] rounded-sm">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="total">All Time</SelectItem>
            <SelectItem value="month">Current Month</SelectItem>
            <SelectItem value="quarter">Current Quarter</SelectItem>
            <SelectItem value="annual">Current Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <DashboardSummary period={summaryPeriod} />

      {/* Filters */}
      <DashboardFilters filters={filters} setFilters={setFilters} />
    </div>
  );
}

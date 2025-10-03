"use client";

import { useState } from "react";

import { toast } from "sonner";
import Summary from "@/components/dashboard/revenue/RevenueSummary";
import RevenueTable from "@/components/dashboard/revenue/RevenueTable";
import RevenueFilters from "@/components/dashboard/revenue/RevenueFilters";

export default function Revenue() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    annualEarnings: 0,
    quarterEarnings: 0,
  });
  const [filters, setFilters] = useState({
    dateRange: "all",
    source: "all",
    paymentGateway: "all",
    sortOrder: "desc",
  });

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Revenue Management</h1>
        <p className="text-gray-600">Track and manage your income streams</p>
      </div>

      {/* Summary Cards */}
      <Summary data={summary} />

      {/* Filters */}
      <RevenueFilters filters={filters} setFilters={setFilters} />

      {/* Data Table */}
      <RevenueTable data={data} setData={setData} />
    </div>
  );
}

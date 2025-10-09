"use client";

import { useState } from "react";

import Summary from "@/components/dashboard/revenue/RevenueSummary";
import TransactionFilters from "@/components/dashboard/transaction/TransactionFilters";
import TransactionTable from "@/components/dashboard/transaction/TransactionTable";

export default function Revenue() {
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-600">Track and manage your transactions</p>
      </div>

      {/* Summary Cards */}
      {/* <Summary /> */}

      {/* Filters */}
      <TransactionFilters filters={filters} setFilters={setFilters} />

      {/* Data Table */}
      <TransactionTable filters={filters} setFilters={setFilters} />
    </div>
  );
}

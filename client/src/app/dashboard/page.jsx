"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import DashboardSummary from "@/components/dashboard/dashboard/DashboardSummary";
import { AreaChart } from "@/components/dashboard/dashboard/AreaChart";
import { transactionService } from "@/services/transactions.service";
import { DatePickerWithRange } from "@/components/ui/DatePickerWithRange";
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns";
import { toast } from "sonner";

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

export default function TransactionPage() {
  const [summaryPeriod, setSummaryPeriod] = useState("quarter");
  const [revenue, setRevenue] = useState([]);
  const [expense, setExpense] = useState([]);
  const [timeRange, setTimeRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [revenueDir, setRevenueDir] = useState("up");
  const [expenseDir, setExpenseDir] = useState("up");
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      setLoading(true);

      const revenuePayload = {
        ...timeRange,
        txnType: "revenue",
      };

      const expensePayload = { ...revenuePayload, txnType: "expense" };

      const req = Promise.all([
        transactionService.getTransactionsToVisualize(revenuePayload),
        transactionService.getTransactionsToVisualize(expensePayload),
      ]);

      const res = await req;
      setRevenue(res[0].transactions || []);
      setExpense(res[1].transactions || []);

      if (!res[0].transactions) {
        toast.error("Error fetching Revenue Data");
      }
      if (
        res[0].transactions[0]?.amount >
        res[0].transactions[res[0].transactions.length - 1]?.amount
      ) {
        setRevenueDir("down");
      } else {
        setRevenueDir("up");
      }

      if (!res[1].transactions) {
        toast.error("Error fetching Expense Data");
      }
      if (
        res[1].transactions[0]?.amount >
        res[1].transactions[res[1].transactions.length - 1]?.amount
      ) {
        setExpenseDir("down");
      } else {
        setExpenseDir("up");
      }
    } catch (e) {
      toast.error("Error fetching Revenue Data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      timeRange.startDate === timeRange.endDate &&
      timeRange.startDate !== null &&
      timeRange.endDate !== null
    )
      return;
    fetchData();
  }, [timeRange]);

  useEffect(() => {
    let startDate = null;
    let endDate = null;

    const now = new Date();

    switch (summaryPeriod) {
      case "month":
        startDate = toUtcMidnight(startOfMonth(now));
        endDate = toUtcEndOfDay(endOfMonth(now));
        break;
      case "quarter":
        startDate = toUtcMidnight(startOfQuarter(now));
        endDate = toUtcEndOfDay(endOfQuarter(now));
        break;
      case "annual":
        startDate = toUtcMidnight(startOfYear(now));
        endDate = toUtcEndOfDay(endOfYear(now));
        break;
    }

    setTimeRange({ startDate, endDate });
  }, [summaryPeriod]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

        <div className="flex items-center justify-end gap-4">
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

          <div className="w-[200px]">
            <DatePickerWithRange
              value={{
                from: timeRange.startDate || undefined,
                to: timeRange.endDate || undefined,
              }}
              onChange={(range) => {
                console.log(range);
                setTimeRange((prev) => ({
                  ...prev,
                  startDate: range?.from || null,
                  endDate: range?.to || null,
                }));
              }}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <DashboardSummary period={summaryPeriod} />

      <AreaChart
        data={revenue}
        loading={loading}
        direction={revenueDir}
        dataKey="revenue"
        title="Revenue Over Time"
      />

      <AreaChart
        data={expense}
        loading={loading}
        direction={expenseDir}
        dataKey="expense"
        title="Expense Over Time"
      />
    </div>
  );
}

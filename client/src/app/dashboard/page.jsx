"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import DashboardSummary from "@/components/dashboard/dashboard/DashboardSummary";
import { AreaChart } from "@/components/dashboard/dashboard/AreaChart";
import CategoryDistribution from "@/components/dashboard/dashboard/CategoryDistribution";
import { analyticsService } from "@/services/analytics.service";
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
  const [income, setIncome] = useState([]);
  const [expense, setExpense] = useState([]);
  const [investment, setInvestment] = useState([]);
  const [incomeDistribution, setIncomeDistribution] = useState([]);
  const [expenseDistribution, setExpenseDistribution] = useState([]);
  const [investmentDistribution, setInvestmentDistribution] = useState([]);
  const [timeRange, setTimeRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [incomeDir, setIncomeDir] = useState("up");
  const [expenseDir, setExpenseDir] = useState("up");
  const [investmentDir, setInvestmentDir] = useState("up");
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      setLoading(true);

      const payload = {
        ...timeRange,
      };

      const req = Promise.all([
        analyticsService.getTimeSeries(payload),
        analyticsService.getCategoryDistribution({
          ...payload,
          txnType: "income",
        }),
        analyticsService.getCategoryDistribution({
          ...payload,
          txnType: "expense",
        }),
        analyticsService.getCategoryDistribution({
          ...payload,
          txnType: "investment",
        }),
      ]);

      const [seriesData, incomeDist, expenseDist, investmentDist] = await req;

      const processSeries = (data, key) => {
        return data.map((item) => ({
          _id: item.date,
          amount: item.totals?.[key] || 0,
        }));
      };

      const incomeData = processSeries(seriesData, "income");
      const expenseData = processSeries(seriesData, "expense");
      const investmentData = processSeries(seriesData, "investment");

      const hasData = (data) => data.some((item) => item.amount > 0);

      setIncome(hasData(incomeData) ? incomeData : []);
      setExpense(hasData(expenseData) ? expenseData : []);
      setInvestment(hasData(investmentData) ? investmentData : []);

      console.log(investmentData);

      const filterZero = (data) => {
        if (!data) return [];
        return data.filter((item) => item.value > 0);
      };

      setIncomeDistribution(filterZero(incomeDist));
      setExpenseDistribution(filterZero(expenseDist));
      setInvestmentDistribution(filterZero(investmentDist));

      const checkDir = (data, setDir) => {
        if (!data || data.length === 0) return;
        if (data[0].amount > data[data.length - 1].amount) {
          setDir("down");
        } else {
          setDir("up");
        }
      };

      checkDir(incomeData, setIncomeDir);
      checkDir(expenseData, setExpenseDir);
      checkDir(investmentData, setInvestmentDir);
    } catch (e) {
      toast.error("Error fetching Income Data");
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-4 w-full md:w-auto">
          <div className="w-full sm:w-[155px]">
            <Select value={summaryPeriod} onValueChange={setSummaryPeriod}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">All Time</SelectItem>
                <SelectItem value="month">Current Month</SelectItem>
                <SelectItem value="quarter">Current Quarter</SelectItem>
                <SelectItem value="annual">Current Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {summaryPeriod === "custom" && (
            <div className="w-full sm:w-[200px]">
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
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <DashboardSummary period={summaryPeriod} />

      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1">
          {loading ? (
            <Skeleton className="h-[350px] w-full rounded-sm" />
          ) : (
            <AreaChart
              data={income}
              direction={incomeDir}
              dataKey="income"
              title="Income Over Time"
            />
          )}
        </div>
        <div className="w-full md:w-[350px]">
          {loading ? (
            <Skeleton className="h-[350px] w-full rounded-sm" />
          ) : (
            <CategoryDistribution
              data={incomeDistribution}
              title="Income Sources"
              variant="income"
            />
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1">
          {loading ? (
            <Skeleton className="h-[350px] w-full rounded-sm" />
          ) : (
            <AreaChart
              data={expense}
              direction={expenseDir}
              dataKey="expense"
              title="Expense Over Time"
            />
          )}
        </div>
        <div className="w-full md:w-[350px]">
          {loading ? (
            <Skeleton className="h-[350px] w-full rounded-sm" />
          ) : (
            <CategoryDistribution
              data={expenseDistribution}
              title="Expense Categories"
              variant="expense"
            />
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1">
          {loading ? (
            <Skeleton className="h-[350px] w-full rounded-sm" />
          ) : (
            <AreaChart
              data={investment}
              direction={investmentDir}
              dataKey="investment"
              title="Investment Over Time"
            />
          )}
        </div>
        <div className="w-full md:w-[350px]">
          {loading ? (
            <Skeleton className="h-[300px] w-full rounded-sm" />
          ) : (
            <CategoryDistribution
              data={investmentDistribution}
              title="Investment Portfolio"
              variant="investment"
            />
          )}
        </div>
      </div>
    </div>
  );
}

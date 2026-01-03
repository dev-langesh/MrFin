"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import DashboardSummary from "@/components/dashboard/dashboard/DashboardSummary";
import { ChartCard } from "@/components/dashboard/dashboard/ChartCard";
import CategoryDistribution from "@/components/dashboard/dashboard/CategoryDistribution";
import { analyticsService } from "@/services/analytics.service";
import { PI_CHART_COLOR_SETS } from "@/components/dashboard/dashboard/constants";
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
  // Hover states for synchronized highlighting
  const [hoveredIncomeCategory, setHoveredIncomeCategory] = useState(null);
  const [hoveredExpenseCategory, setHoveredExpenseCategory] = useState(null);
  const [hoveredInvestmentCategory, setHoveredInvestmentCategory] =
    useState(null);
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
        return data.map((item) => {
          const categories = item[`${key}Categories`] || {};
          return {
            _id: item.date,
            amount: item.totals?.[key] || 0,
            ...categories,
          };
        });
      };

      const incomeData = processSeries(seriesData, "income");
      const expenseData = processSeries(seriesData, "expense");
      const investmentData = processSeries(seriesData, "investment");

      const hasData = (data) => data.some((item) => item.amount > 0);

      const filterZero = (data) => {
        if (!data) return [];
        return data.filter((item) => item.value > 0);
      };

      const incomeDistData = filterZero(incomeDist);
      const expenseDistData = filterZero(expenseDist);
      const investmentDistData = filterZero(investmentDist);

      setIncome(hasData(incomeData) ? incomeData : []);
      setExpense(hasData(expenseData) ? expenseData : []);
      setInvestment(hasData(investmentData) ? investmentData : []);

      setIncomeDistribution(incomeDistData);
      setExpenseDistribution(expenseDistData);
      setInvestmentDistribution(investmentDistData);

      const checkDir = (data, setDir) => {
        if (!data || data.length === 0) return;
        if (data[0].amount > data[data.length - 1].amount) {
          setDir("down");
        } else {
          setDir("up");
        }
      };
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
      case "total":
        // Logic handled by server via allTime flag, but we pass valid dates for UI fallback
        startDate = new Date(0);
        endDate = toUtcEndOfDay(now);
        setTimeRange({ startDate, endDate, allTime: true });
        return; // Early return as we set it above
      case "annual":
        startDate = toUtcMidnight(startOfYear(now));
        endDate = toUtcEndOfDay(endOfYear(now));
        break;
    }

    setTimeRange({ startDate, endDate, allTime: false });
  }, [summaryPeriod]);

  const incomeStackedKeys = useMemo(
    () => incomeDistribution.map((i) => i.name),
    [incomeDistribution]
  );
  const incomeStackedColors = useMemo(() => {
    return incomeDistribution.reduce((acc, item, index) => {
      const COLORS = PI_CHART_COLOR_SETS.income;
      acc[item.name] = COLORS[Math.min(index, COLORS.length - 1)];
      return acc;
    }, {});
  }, [incomeDistribution]);

  const expenseStackedKeys = useMemo(
    () => expenseDistribution.map((i) => i.name),
    [expenseDistribution]
  );
  const expenseStackedColors = useMemo(() => {
    return expenseDistribution.reduce((acc, item, index) => {
      const COLORS = PI_CHART_COLOR_SETS.expense;
      acc[item.name] = COLORS[Math.min(index, COLORS.length - 1)];
      return acc;
    }, {});
  }, [expenseDistribution]);

  const investmentStackedKeys = useMemo(
    () => investmentDistribution.map((i) => i.name),
    [investmentDistribution]
  );
  const investmentStackedColors = useMemo(() => {
    return investmentDistribution.reduce((acc, item, index) => {
      const COLORS = PI_CHART_COLOR_SETS.investment;
      acc[item.name] = COLORS[Math.min(index, COLORS.length - 1)];
      return acc;
    }, {});
  }, [investmentDistribution]);

  // checkDir logic needs to be moved or memoized if it causes re-renders but it sets state so its fine.

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
            <ChartCard
              title="Income Over Time"
              data={income}
              areaColor="chart-green"
              barColor="chart-green-700"
              label="Income"
              yKey="amount"
              xKey="_id"
              isMonthly={
                timeRange.endDate && timeRange.startDate
                  ? new Date(timeRange.endDate) -
                      new Date(timeRange.startDate) >
                    31536000000 // approx 1 year in ms
                  : false
              }
              stackedKeys={incomeStackedKeys}
              stackedColors={incomeStackedColors}
              hoveredCategory={hoveredIncomeCategory}
              setHoveredCategory={setHoveredIncomeCategory}
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
              hoveredCategory={hoveredIncomeCategory}
              setHoveredCategory={setHoveredIncomeCategory}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1">
          {loading ? (
            <Skeleton className="h-[350px] w-full rounded-sm" />
          ) : (
            <ChartCard
              title="Expense Over Time"
              data={expense}
              areaColor="chart-red"
              barColor="chart-red-700"
              label="Expense"
              yKey="amount"
              xKey="_id"
              isMonthly={
                timeRange.endDate && timeRange.startDate
                  ? new Date(timeRange.endDate) -
                      new Date(timeRange.startDate) >
                    31536000000
                  : false
              }
              stackedKeys={expenseStackedKeys}
              stackedColors={expenseStackedColors}
              hoveredCategory={hoveredExpenseCategory}
              setHoveredCategory={setHoveredExpenseCategory}
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
              hoveredCategory={hoveredExpenseCategory}
              setHoveredCategory={setHoveredExpenseCategory}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1">
          {loading ? (
            <Skeleton className="h-[350px] w-full rounded-sm" />
          ) : (
            <ChartCard
              title="Investment Over Time"
              data={investment}
              areaColor="chart-blue"
              barColor="chart-blue-700"
              label="Investment"
              yKey="amount"
              xKey="_id"
              isMonthly={
                timeRange.endDate && timeRange.startDate
                  ? new Date(timeRange.endDate) -
                      new Date(timeRange.startDate) >
                    31536000000
                  : false
              }
              stackedKeys={investmentStackedKeys}
              stackedColors={investmentStackedColors}
              hoveredCategory={hoveredInvestmentCategory}
              setHoveredCategory={setHoveredInvestmentCategory}
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
              hoveredCategory={hoveredInvestmentCategory}
              setHoveredCategory={setHoveredInvestmentCategory}
            />
          )}
        </div>
      </div>
    </div>
  );
}

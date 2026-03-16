import { memo, useEffect, useState } from "react";
import SummaryCard from "../common/SummaryCard";
import { analyticsService } from "@/services/analytics.service";
import { settingsService } from "@/services/settings.service";
import { Skeleton } from "@/components/ui/Skeleton";
import { currencySymbols } from "@/constants/currencies";

function DashboardSummary({ period }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [currencyCode, setCurrencyCode] = useState("USD");

  async function fetchData() {
    try {
      setLoading(true);
      const [analyticsRes, settingsRes] = await Promise.all([
        analyticsService.getAnalytics(),
        settingsService.fetchSettings(),
      ]);
      setData(analyticsRes);

      const currency = settingsRes?.general?.currency || "USD";
      setCurrencyCode(currency);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
      <SummaryCard
        title="Income"
        value={data.income?.[period] || 0}
        up={data.incomeChange?.[period] || 0}
        currencyCode={currencyCode}
        secondaryTitle={
          period === "total"
            ? "All time income"
            : period === "annual"
            ? "Current year"
            : `Current ${period}`
        }
        disableTrend={period === "total"}
      />
      <SummaryCard
        title="Expenses"
        value={data.expenses?.[period] || 0}
        up={data.expensesChange?.[period] || 0}
        currencyCode={currencyCode}
        secondaryTitle={
          period === "total"
            ? "All time expenses"
            : period === "annual"
            ? "Current year"
            : `Current ${period}`
        }
        disableTrend={period === "total"}
      />
      <SummaryCard
        title="Cash Flow"
        value={data.cashFlow?.[period] || 0}
        up={data.cashFlowChange?.[period] || 0}
        currencyCode={currencyCode}
        secondaryTitle={
          period === "total"
            ? "All time cash flow"
            : period === "annual"
            ? "Current year"
            : `Current ${period}`
        }
        disableTrend={period === "total"}
      />
    </div>
  );
}

export default memo(DashboardSummary);

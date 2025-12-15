import { memo, useEffect, useState } from "react";
import SummaryCard from "../common/SummaryCard";
import { analyticsService } from "@/services/analytics.service";
import { Skeleton } from "@/components/ui/Skeleton";

function DashboardSummary({ period }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await analyticsService.getAnalytics();
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <SummaryCard
        title="Earnings"
        value={data.earnings?.[period] || 0}
        up={data.earningsChange?.[period] || 0}
        secondaryTitle={
          period === "total"
            ? "All time earnings"
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
        title="Investments"
        value={data.investments?.[period] || 0}
        up={data.investmentsChange?.[period] || 0}
        secondaryTitle={
          period === "total"
            ? "All time investments"
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

import { memo, useEffect, useState } from "react";
import SummaryCard from "../common/SummaryCard";
import { analyticsService } from "@/services/analytics.service";

function DashboardSummary({ period }) {
  const [data, setData] = useState({});

  async function fetchData() {
    const res = await analyticsService.getAnalytics();
    setData(res);
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            ? "All time earnings"
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
            ? "All time earnings"
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

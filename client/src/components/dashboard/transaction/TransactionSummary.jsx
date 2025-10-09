import { memo, useEffect, useState } from "react";
import SummaryCard from "../common/SummaryCard";
import { analyticsService } from "@/services/analytics.service";

function TransactionSummary() {
  const [data, setData] = useState({});

  async function fetchData() {
    const res = await analyticsService.getAnalytics();
    setData(res);
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <SummaryCard
        title="Monthly Earnings"
        value={data.earnings?.month || 0}
        up={data.earningsChange?.month}
        secondaryTitle="Current month"
      />
      <SummaryCard
        title="Quarter Earnings"
        value={data.earnings?.quarter || 0}
        up={data.earningsChange?.quarter}
        secondaryTitle="Current quarter"
      />
      <SummaryCard
        title="Annual Earnings"
        value={data.earnings?.annual || 0}
        up={data.earningsChange?.annual}
        secondaryTitle="Current year"
      />
      <SummaryCard
        title="Total Earnings"
        value={data.earnings?.total || 0}
        disableTrend
        secondaryTitle="All time earnings"
      />
    </div>
  );
}

export default memo(TransactionSummary);

import React from "react";
import SummaryCard from "../common/SummaryCard";
import { TrendingUp } from "lucide-react";

export default function RevenueSummary({ data = {} }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SummaryCard
        title="Quarter Earnings"
        value={data.quarterEarnings}
        Icon={<TrendingUp className="h-4 w-4 text-purple-600" />}
        secondaryTitle="Current quarter"
      />
      <SummaryCard
        title="Annual Earnings"
        value={data.annualEarnings}
        Icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
        secondaryTitle="Current year"
      />
      <SummaryCard
        title="Total Earnings"
        value={data.totalEarnings}
        Icon={<TrendingUp className="h-4 w-4 text-green-600" />}
        secondaryTitle="All time earnings"
      />
    </div>
  );
}

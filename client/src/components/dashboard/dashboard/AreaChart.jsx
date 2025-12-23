"use client";

import {
  Area,
  AreaChart as ReAreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/Chart";
import { useEffect, useState } from "react";

export function AreaChart({
  data,
  isMonthly = false,
  xKey = "_id",
  yKey = "amount",
  color = "chart-green",
  label = "Amount",
}) {
  const [showYear, setShowYear] = useState(false);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const start = new Date(data[0]?.[xKey]);
    const end = new Date(data[data.length - 1]?.[xKey]);
    if (start.getFullYear() !== end.getFullYear()) {
      setShowYear(true);
    } else {
      setShowYear(false);
    }
  }, [data, xKey]);

  const chartConfig = {
    [yKey]: {
      label: label,
    },
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
      <ReAreaChart data={data}>
        <defs>
          <linearGradient id={`fill${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={`var(--${color})`} stopOpacity={0.8} />
            <stop
              offset="95%"
              stopColor={`var(--${color})`}
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => {
            const date = new Date(value);
            if (isMonthly) {
              return date.toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              });
            }
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: showYear ? "2-digit" : undefined,
            });
          }}
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          domain={[0, "auto"]}
          padding={{ top: 10, bottom: 10 }}
          tickFormatter={(value) =>
            value >= 1000 ? `${value / 1000}k` : value
          }
        />

        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => {
                if (isMonthly) {
                  return new Date(value).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });
                }
                return new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: showYear ? "numeric" : undefined,
                });
              }}
              indicator="dot"
            />
          }
        />
        <Area
          dataKey={yKey}
          type="monotone"
          fill={`url(#fill${color})`}
          stroke={`var(--${color})`}
          stackId="a"
        />
      </ReAreaChart>
    </ChartContainer>
  );
}

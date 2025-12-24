"use client";

import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/Chart";
import { useEffect, useState, useMemo, memo } from "react";

export const StackedBarChart = memo(function StackedBarChart({
  data,
  keys = [],
  colors = {},
  isMonthly = false,
  xKey = "_id",
  label = "Amount",
  hoveredCategory,
  setHoveredCategory,
}) {
  const [showYear, setShowYear] = useState(false);
  // Remove local state: const [hoveredBar, setHoveredBar] = useState(null);

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

  const topKeys = useMemo(() => {
    if (!data || data.length === 0 || !keys || keys.length === 0) return [];

    return data.map((entry) => {
      // Iterate keys in reverse to find the first one with a value > 0
      for (let i = keys.length - 1; i >= 0; i--) {
        const k = keys[i];
        if (entry[k] && entry[k] > 0) {
          return k;
        }
      }
      return null;
    });
  }, [data, keys]);

  // If no keys provided, can't render stacks
  if (!keys || keys.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        No category data available
      </div>
    );
  }

  const chartConfig = {};
  keys.forEach((key) => {
    chartConfig[key] = {
      label: key,
      color: colors[key],
    };
  });

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
      <ReBarChart data={data}>
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
          shared={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => {
                if (isMonthly) {
                  return new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  });
                }
                return new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: showYear ? "numeric" : undefined,
                });
              }}
              indicator="line"
            />
          }
        />
        {keys.map((key) => {
          return (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={colors[key] || "var(--color-primary)"}
              fillOpacity={
                hoveredCategory ? (hoveredCategory === key ? 1 : 0.1) : 1
              }
              onMouseEnter={() => setHoveredCategory?.(key)}
              onMouseLeave={() => setHoveredCategory?.(null)}
            >
              {data.map((entry, index) => {
                // Determine if this is the top-most visible segment for this entry
                const isTop = topKeys[index] === key;
                const radius = isTop ? [4, 4, 0, 0] : [0, 0, 0, 0];
                return <Cell key={`cell-${index}`} radius={radius} />;
              })}
            </Bar>
          );
        })}
      </ReBarChart>
    </ChartContainer>
  );
});

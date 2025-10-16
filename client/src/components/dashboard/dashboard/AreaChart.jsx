"use client";

import {
  Area,
  AreaChart as ReAreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/Chart";

export function AreaChart({ data, loading, direction, dataKey ,title}) {
  const chartConfig = {
    amount: {
      label: dataKey === "revenue" ? "Revenue" : "Expenses",
    },
  };

  return (
    <Card className="p-4 rounded-sm relative">
      {loading && (
        <div className="absolute inset-0 bg-white z-10 ">
          <div className="animate-pulse bg-zinc-200 w-full h-full"></div>
        </div>
      )}

      <CardHeader className="flex items-center gap-2 space-y-0 pt-5 sm:flex-row">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[270px] w-full"
        >
          <ReAreaChart data={data}>
            <defs>
              <linearGradient id={`fill${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={`var(--chart-${direction})`}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={`var(--chart-${direction})`}
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="_id"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              domain={[0, "auto"]}
              padding={{ top: 10, bottom: 10 }}
              tickFormatter={(value) => value > 1000 ? `${value / 1000}k` : value}
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="amount"
              type="natural"
              fill={`url(#fill${dataKey})`}
              stroke={`var(--chart-${direction})`}
              stackId="a"
              label="Revenue"
            />
          </ReAreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Label, Pie, PieChart, Sector, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/Chart";

const COLORS = [
  "#2563eb", // bright blue
  "#7c3aed", // violet
  "#db2777", // pink
  "#ea580c", // orange
  "#16a34a", // green
  "#0891b2", // cyan
  "#ca8a04", // yellow-gold
];

export function PieChartComponent({
  data = [],
  title,
  dataKey = "value",
  nameKey = "name",
  loading,
}) {
  const [activeName, setActiveName] = useState(null);

  const validData = useMemo(() => {
    return data.filter((item) => item[nameKey] && item[nameKey] !== "");
  }, [data, nameKey]);

  const chartConfig = useMemo(() => {
    const config = {};
    validData.forEach((item, index) => {
      config[item[nameKey]] = {
        label: item[nameKey],
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [validData, nameKey]);

  const activeIndex = useMemo(
    () =>
      activeName
        ? validData.findIndex((item) => item[nameKey] === activeName)
        : 0,
    [activeName, validData, nameKey]
  );

  // Set initial active state if data exists and none selected
  useMemo(() => {
    if (validData.length > 0 && !activeName) {
      setActiveName(validData[0][nameKey]);
    }
  }, [validData, activeName, nameKey]);

  const processedData = useMemo(() => {
    return validData.map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length],
    }));
  }, [validData]);

  const id = `pie-interactive-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <Card
      data-chart={id}
      className="flex flex-col h-[350px] rounded-sm gap-0 px-0 py-4"
    >
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex-row items-center justify-between">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>Distribution</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center pb-0">
        {!validData || validData.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <ChartContainer
            id={id}
            config={chartConfig}
            className="mx-auto h-full w-full max-w-[300px] max-h-[300px]"
          >
            <PieChart>
              <Pie
                data={processedData}
                dataKey={dataKey}
                nameKey={nameKey}
                innerRadius="50%"
                outerRadius="80%"
                strokeWidth={5}
                activeIndex={activeIndex}
                className="cursor-pointer"
                activeShape={({ outerRadius = 0, ...props }) => (
                  <g>
                    <Sector {...props} outerRadius={outerRadius + 3} />
                    <Sector
                      {...props}
                      outerRadius={outerRadius + 10}
                      innerRadius={outerRadius + 5}
                    />
                  </g>
                )}
                onMouseEnter={(data) => setActiveName(data[nameKey])}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-xl md:text-2xl font-bold"
                          >
                            {validData[activeIndex]?.[
                              dataKey
                            ]?.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground text-xs"
                          >
                            {validData[activeIndex]?.[nameKey]}
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

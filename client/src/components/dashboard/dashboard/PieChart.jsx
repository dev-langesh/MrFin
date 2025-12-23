"use client";

import { useMemo, useState, useEffect, memo } from "react";
import { formatNumber } from "@/lib/formatters";
import { useAuth } from "@/context/AuthProvider";
import { Pie, PieChart as RePieChart, Sector, Label } from "recharts";
import { ChartContainer, ChartStyle } from "@/components/ui/Chart";
import { PI_CHART_COLOR_SETS } from "./constants";

export const PieChart = memo(function PieChart({
  data = [],
  title,
  dataKey = "value",
  nameKey = "name",
  variant = "investment", // income | expense | investment
  activeName,
  setActiveName,
}) {
  const { auth } = useAuth();
  const countryCode = auth?.user?.country || "US";

  // const [activeName, setActiveName] = useState(null); // Managed by parent

  const COLORS = PI_CHART_COLOR_SETS[variant] ?? PI_CHART_COLOR_SETS.investment;

  const validData = useMemo(
    () => data.filter((item) => item?.[nameKey]),
    [data, nameKey]
  );

  /**
   * 🔑 STRATEGY APPLIED HERE
   * - Assign darker colors to larger slices
   * - Brighter colors to smaller slices
   */
  const processedData = useMemo(() => {
    return validData.map((item, index) => ({
      ...item,
      fill: COLORS[Math.min(index, COLORS.length - 1)],
    }));
  }, [validData, dataKey, COLORS]);

  const activeIndex = useMemo(() => {
    if (!activeName) return 0;
    return processedData.findIndex((item) => item[nameKey] === activeName);
  }, [activeName, processedData, nameKey]);

  useEffect(() => {
    if (processedData.length && !activeName) {
      setActiveName(processedData[0][nameKey]);
    }
  }, [processedData, activeName, nameKey]);

  const chartConfig = useMemo(() => {
    const config = {};
    processedData.forEach((item) => {
      config[item[nameKey]] = {
        label: item[nameKey],
        color: item.fill,
      };
    });
    return config;
  }, [processedData, nameKey]);

  const id = `pie-${variant}-${title.replace(/\s+/g, "-").toLowerCase()}`;

  function capitalize(value = "") {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatMoney(value) {
    if (value >= 1e3) {
      return formatNumber(value, { countryCode, compact: true });
    } else {
      return formatNumber(value, { countryCode, compact: false });
    }
  }

  return (
    <div className="flex flex-col h-full w-full items-center justify-center">
      {processedData.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          No data available
        </div>
      ) : (
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto h-full w-full max-w-[300px] max-h-[300px]"
        >
          <RePieChart>
            <ChartStyle id={id} config={chartConfig} />
            <Pie
              data={processedData}
              dataKey={dataKey}
              nameKey={nameKey}
              innerRadius="50%"
              outerRadius="80%"
              strokeWidth={4}
              activeIndex={activeIndex}
              className="cursor-pointer"
              onMouseEnter={(item) => setActiveName(item[nameKey])}
              activeShape={({ outerRadius = 0, ...props }) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 4} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 10}
                    innerRadius={outerRadius + 6}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox)) return null;

                  const value = processedData[activeIndex]?.[dataKey];

                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan className="fill-foreground text-xl md:text-2xl font-bold">
                        {formatMoney(value)}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground text-xs font-medium "
                      >
                        {capitalize(processedData[activeIndex]?.[nameKey])}
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </RePieChart>
        </ChartContainer>
      )}
    </div>
  );
});

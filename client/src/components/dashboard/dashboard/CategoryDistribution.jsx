"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { memo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart as PieChartIcon, List } from "lucide-react";
import { PieChart } from "./PieChart";
import { formatNumber } from "@/lib/formatters";
import { useAuth } from "@/context/AuthProvider";
import { PI_CHART_COLOR_SETS } from "./constants";

function CategoryDistribution({
  data = [],
  title,
  variant = "investment",
  dataKey = "value",
  nameKey = "name",
  hoveredCategory,
  setHoveredCategory,
}) {
  const { auth } = useAuth();
  const countryCode = auth?.user?.country || "US";
  const COLORS = PI_CHART_COLOR_SETS[variant] ?? PI_CHART_COLOR_SETS.investment;

  // Re-use logic for color assignment to match chart
  const processedData = data
    .filter((item) => item?.[nameKey])
    .map((item, index) => ({
      ...item,
      fill: COLORS[Math.min(index, COLORS.length - 1)],
    }));

  return (
    <Card className="rounded-sm relative h-[400px] flex flex-col gap-2 px-0 py-4">
      <Tabs defaultValue="chart" className="flex flex-col h-full w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
          </div>
          <TabsList>
            <TabsTrigger value="chart">
              <PieChartIcon className="size-3" />
            </TabsTrigger>
            <TabsTrigger value="data">
              <List className="size-3" />
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 px-2">
          <TabsContent
            value="chart"
            className="w-full h-full m-0 p-0 data-[state=inactive]:hidden text-center"
          >
            <PieChart
              data={data}
              title={title}
              variant={variant}
              dataKey={dataKey}
              nameKey={nameKey}
              activeName={hoveredCategory}
              setActiveName={setHoveredCategory}
            />
          </TabsContent>

          <TabsContent
            value="data"
            className="h-full m-0 p-0 data-[state=inactive]:hidden"
          >
            <div className="h-full overflow-y-auto px-4 pt-2">
              <div className="space-y-4 pb-6">
                {processedData.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No data available
                  </div>
                ) : (
                  processedData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-sm font-medium leading-none capitalize">
                          {item[nameKey]}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground font-mono">
                        {formatNumber(item[dataKey], { countryCode })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

export default memo(CategoryDistribution);

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { AreaChart } from "@/components/dashboard/dashboard/AreaChart";
import { BarChart } from "@/components/dashboard/dashboard/BarChart";
import { StackedBarChart } from "@/components/dashboard/dashboard/StackedBarChart";
import {
  AreaChart as AreaChartIcon,
  BarChart as BarChartIcon,
  Layers as StackedBarChartIcon,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChartCard({
  title,
  className,
  data,
  color,
  label,
  yKey,
  xKey,
  isMonthly,
  stackedKeys,
  stackedColors,
}) {
  const [chartType, setChartType] = useState("area");
  const [isOpen, setIsOpen] = useState(false);

  const renderChart = () => {
    switch (chartType) {
      case "area":
        return (
          <AreaChart
            data={data}
            color={color}
            label={label}
            yKey={yKey}
            xKey={xKey}
            isMonthly={isMonthly}
          />
        );
      case "bar":
        return (
          <BarChart
            data={data}
            color={color}
            label={label}
            yKey={yKey}
            xKey={xKey}
            isMonthly={isMonthly}
          />
        );
      case "stacked":
        return (
          <StackedBarChart
            data={data}
            keys={stackedKeys}
            colors={stackedColors}
            label={label}
            yKey={yKey}
            xKey={xKey}
            isMonthly={isMonthly}
          />
        );
      default:
        return null;
    }
  };

  const chartOptions = [
    {
      id: "area",
      label: "Area Chart",
      icon: AreaChartIcon,
    },
    {
      id: "bar",
      label: "Bar Chart",
      icon: BarChartIcon,
    },
    {
      id: "stacked",
      label: "Stacked Bar",
      icon: StackedBarChartIcon,
    },
  ];

  return (
    <Card
      className={`rounded-sm relative h-[400px] flex flex-col gap-2 px-0 py-4 ${className}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pt-2 px-6 pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-sm hover:bg-muted"
            >
              <AreaChartIcon className="h-4 w-4" />
              <span className="sr-only">Open chart options</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[200px] p-2">
            <div className="grid gap-1">
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                Chart Type
              </div>
              {chartOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => {
                    setChartType(option.id);
                    setIsOpen(false);
                  }}
                  className={`
                    flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer transition-colors
                    ${
                      chartType === option.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent className="px-2 flex-1 min-h-0">{renderChart()}</CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { memo } from "react";
import { IndianRupee, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

function SummaryCard({ title, secondaryTitle, value, up, disableTrend }) {
  return (
    <Card className="px-0 rounded-sm py-4 gap-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {!disableTrend && (
          <div className="flex items-center gap-1">
            {/* <span
              className={cn("text-sm text-muted-foreground", {
                "text-green-600": up > 0,
                "text-red-600": up < 0,
              })}
            >
              {up}%
            </span> */}
            {/* {up >= 0 && <TrendingUp className="h-4 w-4 text-green-600" />}
            {up < 0 && <TrendingDown className="h-4 w-4 text-red-600" />} */}
          </div>
        )}
        {up ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold flex items-center">
          <IndianRupee className="size-4" />
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{secondaryTitle}</p>
      </CardContent>
    </Card>
  );
}

export default memo(SummaryCard);

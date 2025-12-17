import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { memo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import numeral from "numeral";
import { currencyIcons, currencySymbols } from "@/constants/currencies";

function SummaryCard({
  title,
  secondaryTitle,
  value,
  up,
  disableTrend,
  currencyCode = "USD",
}) {
  const Icon = currencyIcons[currencyCode];
  const symbol = currencySymbols[currencyCode] || "$";

  return (
    <Card className="px-0 rounded-sm py-3 md:py-4 gap-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {!disableTrend && (
          <div className="flex items-center gap-1">
            <span
              className={cn("text-xs text-muted-foreground", {
                "text-green-600": up > 0,
                "text-red-600": up < 0,
              })}
            >
              {up !== 0 ? `${Math.round(Math.abs(up || 0))}%` : "__"}
            </span>
            {up > 0 && (
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
            )}
            {up < 0 && (
              <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4">
        <div className="md:text-xl font-bold flex items-center gap-1">
          {Icon ? (
            <Icon className="w-3 h-3 md:w-4 md:h-4 " />
          ) : (
            <span className="">{symbol}</span>
          )}
          {numeral(value).format("0,0a")}
        </div>
        <p className="text-xs text-muted-foreground max-md:hidden">
          {secondaryTitle}
        </p>
      </CardContent>
    </Card>
  );
}

export default memo(SummaryCard);

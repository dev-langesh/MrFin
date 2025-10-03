import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { memo } from "react";
import { IndianRupee } from "lucide-react";

function SummaryCard({ title, secondaryTitle, value, Icon }) {
  return (
    <Card className="px-0 rounded-sm py-4 gap-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon}
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

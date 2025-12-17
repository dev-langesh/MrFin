import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function ChartCard({ title, children, className }) {
  return (
    <Card
      className={`rounded-sm relative h-[350px] flex flex-col gap-2 px-0 py-4 ${className}`}
    >
      <CardHeader className="flex items-center gap-2 space-y-0 pt-2 sm:flex-row pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 flex-1 min-h-0">{children}</CardContent>
    </Card>
  );
}

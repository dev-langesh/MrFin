import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/Label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useState, useEffect } from "react";
import { FileDown, FileJson, FileSpreadsheet, FileText } from "lucide-react";

const exportFormats = [
  { value: "csv", label: "CSV", icon: FileText },
  { value: "excel", label: "Excel", icon: FileSpreadsheet },
  { value: "json", label: "JSON", icon: FileJson },
  { value: "pdf", label: "PDF", icon: FileDown },
];

const dateFormats = [
  { value: "PP", label: "Default (e.g. Apr 29, 2023)" },
  { value: "yyyy-MM-dd", label: "yyyy-MM-dd" },
  { value: "dd-MM-yyyy", label: "dd-MM-yyyy" },
  { value: "MM-dd-yyyy", label: "MM-dd-yyyy" },
];

export function ExportTransactionDialog({
  open,
  onOpenChange,
  onExport,
  defaultDateFormat = "PP",
}) {
  const [scope, setScope] = useState("filtered");
  const [format, setFormat] = useState("csv");
  const [dateFormat, setDateFormat] = useState(defaultDateFormat);
  const [loading, setLoading] = useState(false);

  // Sync state with prop changes when dialog opens
  useEffect(() => {
    if (open) {
      setDateFormat(defaultDateFormat);
    }
  }, [open, defaultDateFormat]);

  const handleExport = async () => {
    setLoading(true);
    await onExport(scope, format, dateFormat);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Transactions</DialogTitle>
          <DialogDescription>
            Choose what data you want to export and in which format.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <Label className="text-base">Export Scope</Label>
            <RadioGroup
              value={scope}
              onValueChange={setScope}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="filtered"
                  id="filtered"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="filtered"
                  className="flex flex-col items-center justify-between rounded-sm border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="font-semibold">Filtered Data</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Exports filtered transactions
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="all" id="all" className="peer sr-only" />
                <Label
                  htmlFor="all"
                  className="flex flex-col items-center justify-between rounded-sm border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="font-semibold">All Data</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Exports all transactions in the database
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger id="format" className="w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {exportFormats.map((fmt) => (
                    <SelectItem key={fmt.value} value={fmt.value}>
                      <div className="flex items-center gap-2">
                        <fmt.icon className="h-4 w-4" />
                        <span>{fmt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger id="dateFormat" className="w-full">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  {dateFormats.map((fmt) => (
                    <SelectItem key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

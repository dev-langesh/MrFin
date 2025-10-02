"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Calendar } from "@/components/ui/Calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import {
  CalendarIcon,
  Plus,
  Edit,
  Trash2,
  Download,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Summary from "@/components/dashboard/revenue/RevenueSummary";
import EntryForm from "@/components/dashboard/revenue/RevenueEntryForm";
import RevenueTable from "@/components/dashboard/revenue/RevenueTable";
import RevenueFilters from "@/components/dashboard/revenue/RevenueFilters";

export default function Revenue() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    annualEarnings: 0,
    quarterEarnings: 0,
  });
  const [filters, setFilters] = useState({
    dateRange: "all",
    source: "all",
    paymentProcessor: "all",
    sortOrder: "desc",
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleExport = () => {
    toast.success("Revenue data exported successfully");
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Revenue Management
          </h1>
          <p className="text-gray-600">Track and manage your income streams</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Revenue
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Revenue Entry</DialogTitle>
                <DialogDescription>
                  Add a new revenue entry to track your income.
                </DialogDescription>
              </DialogHeader>
              <EntryForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <Summary data={summary} />

      {/* Filters */}
      <RevenueFilters filters={filters} setFilters={setFilters} />

      {/* Data Table */}
      <RevenueTable data={data} />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Revenue Entry</DialogTitle>
            <DialogDescription>
              Update the revenue entry details.
            </DialogDescription>
          </DialogHeader>
          <EntryForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}

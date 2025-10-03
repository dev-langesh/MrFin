"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Plus, Download } from "lucide-react";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { memo, useEffect, useState } from "react";
import RevenueEntryForm from "./RevenueEntryForm";
import { revenueService } from "@/services/reveue.service";
import { toast } from "sonner";
import { Label } from "@/components/ui/Label";
import Pagination from "../common/Pagination";

function RevenueTable({ setFilters, filters }) {
  const [data, setData] = useState([]);
  const [totalData, setTotalData] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  async function fetchData() {
    const res = await revenueService.getRevenues(filters);
    setData(res.revenues);
    setTotalData(res.total);
  }

  useEffect(() => {
    fetchData();
  }, [filters]);

  function handleEdit(entry) {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  }

  async function handleDelete(id) {
    if (confirm("Are you sure you want to delete this entry?")) {
      try {
        await revenueService.deleteRevenue(id);
        setData((prev) => prev.filter((entry) => entry._id !== id));
        toast.success("Entry deleted");
      } catch (error) {
        toast.error(error.message);
      }
    }
  }

  function handleExport() {}

  return (
    <Card className="px-0 rounded-sm py-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <h1>Revenue Entries ({data.length})</h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="w-4 h-4" />
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 " />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <RevenueEntryForm
                  setData={setData}
                  close={() => setIsAddDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <RevenueEntryForm
                  editingEntry={editingEntry}
                  setData={setData}
                  close={() => setIsEditDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
        <CardDescription>
          Showing {data.length} of {totalData} entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Payment Gateway</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No revenue entries found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell>
                      {format(new Date(entry.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>{entry.source}</TableCell>
                    <TableCell>{entry.paymentGateway}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{entry.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Button
                          onClick={() => handleEdit(entry)}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination + Limit Controls */}
        <div className="flex items-center justify-between mt-4">
          {/* Rows per page */}
          <div className="flex items-center gap-2">
            <Label>Rows per page:</Label>
            <Select
              value={String(filters.limit)}
              onValueChange={(val) =>
                setFilters((prev) => ({ ...prev, limit: Number(val), page: 1 }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="40">40</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pagination buttons */}
          <Pagination
            total={totalData}
            limit={filters.limit}
            currentPage={filters.page}
            handlePageChange={(page) =>
              setFilters((prev) => ({ ...prev, page }))
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(RevenueTable);

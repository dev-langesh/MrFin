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
import { toast } from "sonner";
import { Label } from "@/components/ui/Label";
import Pagination from "../common/Pagination";
import TransactionEntryForm from "./TransactionEntryForm";
import { transactionService } from "@/services/transactions.service";

function TransactionTable({ setFilters, filters }) {
  const [data, setData] = useState([]);
  const [totalData, setTotalData] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  async function fetchData() {
    const res = await transactionService.getTransactions(filters);
    setData(res.transactions);
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
        await transactionService.deleteTransaction(id);
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
          <h1>Transactions ({data.length})</h1>
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
              <DialogContent className="lg:max-w-2xl">
                <TransactionEntryForm
                  setData={setData}
                  close={() => setIsAddDialogOpen(false)}
                  txnTypeFilter={filters.txnType}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="lg:max-w-2xl">
                <TransactionEntryForm
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
        <div className="rounded-md border grid grid-cols-1">
          <Table className="overflow-x-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Txn Date</TableHead>
                <TableHead className="min-w-[100px]">Txn Type</TableHead>
                <TableHead className="min-w-[100px]">Source</TableHead>
                <TableHead className="min-w-[120px]">Payment Gateway</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="min-w-[120px]">
                  Expense Category
                </TableHead>
                <TableHead className="min-w-[100px] text-right">
                  Amount
                </TableHead>
                <TableHead className="min-w-[100px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell>
                      {format(new Date(entry.txnDate), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>{entry.txnType}</TableCell>
                    <TableCell>{entry.source || "-"}</TableCell>
                    <TableCell>{entry.paymentGateway || "-"}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>{entry.expenseCategory || "-"}</TableCell>
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

export default memo(TransactionTable);

"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
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
import { Trash2, Edit2 } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { Label } from "@/components/ui/Label";
import Pagination from "@/components/dashboard/common/Pagination";
import {
  selectMappedFields,
  selectMappedData,
  updateState,
  deleteRow,
} from "@/redux/slices/importTransactionsSlice";
import { useDispatch, useSelector } from "react-redux";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { PAGINATION_OPTIONS } from "@/components/dashboard/config";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import GenericEditForm from "../GenericEditForm";
import { createMappedEntrySchema } from "@/schemas/mappedEntry.schema";
import { selectIsLoading } from "@/redux/slices/importTransactionsSlice";
import Loading from "@/components/ui/Loading";

function MappedDataTable({ selectedRows, setSelectedRows }) {
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const mappedData = useSelector(selectMappedData);
  const mappedFields = useSelector(selectMappedFields);

  const dispatch = useDispatch();

  const orderedFields = ["txnDate", "description", "credit", "debit"];
  const dynamicCols = mappedFields
    ? orderedFields.map((field) => mappedFields[field]).filter(Boolean)
    : [];

  useEffect(() => {
    if (mappedData?.length > 0) {
      const skip = (page - 1) * limit;
      setData(mappedData.slice(skip, skip + limit));
    } else {
      setData([]);
    }
  }, [mappedData, page, limit]);

  async function handleDeleteRows(rows) {
    const sortedRows = [...rows].sort((a, b) => b - a);
    sortedRows.forEach((index) => {
      dispatch(deleteRow(index));
    });
    setSelectedRows([]);
    setSelectAll(false);
  }

  function handleUpdateEntry(updatedEntry) {
    const newData = [...mappedData];
    const globalIndex = editingIndex;
    newData[globalIndex] = {
      ...newData[globalIndex],
      ...updatedEntry,
    };
    dispatch(updateState({ mappedData: newData }));
    setIsDialogOpen(false);
    setEditingIndex(null);
  }

  function toggleSelectAll(checked) {
    setSelectAll(checked);
    if (checked) setSelectedRows(data.map((_, i) => (page - 1) * limit + i));
    else setSelectedRows([]);
  }

  function toggleSelectRow(index, checked) {
    if (checked) setSelectedRows([...selectedRows, index]);
    else setSelectedRows(selectedRows.filter((i) => i !== index));
  }

  function formatDateSafe(dateStr) {
    try {
      if (!dateStr) return "";
      const date = parseISO(dateStr);
      if (isValid(date)) {
        // Use a safe format string or the user provided one if valid
        // The error "unescaped latin alphabet character" suggests mappedFields.dateFormat might contain characters treated as format tokens
        // For now, let's use the user's format but be careful.
        // If the user's format is causing issues, we might want to fallback or sanitize.
        // Assuming mappedFields.dateFormat is valid date-fns format string.
        return format(date, mappedFields.dateFormat || "yyyy-MM-dd");
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  const isLoading = useSelector(selectIsLoading);

  return (
    <CardContent className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-sm">
          <Loading variant="spinner" size="lg" text="Processing..." />
        </div>
      )}
      <div className="rounded-md border grid grid-cols-1">
        <Table className="overflow-x-auto">
          <TableHeader>
            {dynamicCols.length > 0 && (
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>{" "}
                <TableHead>ID</TableHead>
                {dynamicCols.map((key) => (
                  <TableHead key={key}>{key}</TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {data.length === 0 || dynamicCols.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={dynamicCols.length + 3}
                  className="text-center py-8 text-muted-foreground"
                >
                  No data available. Please map the fields.
                </TableCell>
              </TableRow>
            ) : (
              data.map((entry, i) => {
                const globalIndex = (page - 1) * limit + i;
                return (
                  <TableRow
                    className={cn(
                      Object.keys(entry.errors || {}).length > 0
                        ? "bg-red-100"
                        : ""
                    )}
                    key={`row-${globalIndex}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(globalIndex)}
                        onCheckedChange={(checked) =>
                          toggleSelectRow(globalIndex, checked)
                        }
                      />
                    </TableCell>
                    <TableCell>{globalIndex + 1}</TableCell>

                    {dynamicCols.map((key) => (
                      <TableCell
                        key={`${globalIndex}-${key}`}
                        className={cn(
                          "min-w-[120px] whitespace-break-spaces break-all",
                          entry[key]?.length >= 10 && "min-w-[170px]",
                          entry[key]?.length >= 20 && "min-w-[200px]",
                          entry[key]?.length >= 100 && "min-w-[300px]"
                        )}
                      >
                        {entry.errors && entry.errors[key]
                          ? entry.errors[key]
                          : key === mappedFields.txnDate
                          ? formatDateSafe(entry[key])
                          : entry[key]}
                      </TableCell>
                    ))}

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Dialog
                          open={isDialogOpen && editingIndex === globalIndex}
                          onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) setEditingIndex(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingIndex(globalIndex);
                                setIsDialogOpen(true);
                              }}
                              className="text-black hover:text-black/80 rounded-[2px]"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <GenericEditForm
                              initialData={entry}
                              onSubmit={handleUpdateEntry}
                              onCancel={() => setIsDialogOpen(false)}
                              title="Edit Mapped Entry"
                              schema={createMappedEntrySchema(mappedFields)}
                              fieldConfig={{
                                [mappedFields.txnDate]: {
                                  type: "date",
                                  label: "Transaction Date",
                                },
                                [mappedFields.description]: {
                                  label: "Description",
                                },
                                [mappedFields.credit]: { label: "Credit" },
                                [mappedFields.debit]: { label: "Debit" },
                              }}
                            />
                          </DialogContent>
                        </Dialog>

                        <ConfirmationDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          }
                          title="Delete Entry"
                          description="Are you sure you want to delete this entry?"
                          onConfirm={() => handleDeleteRows([globalIndex])}
                          confirmText="Delete"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination + Limit Controls */}
      <div className="flex items-center justify-between mt-4">
        {mappedData?.length > 10 && (
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">Rows per page:</Label>
            <Select
              value={limit === mappedData?.length ? "all" : String(limit)}
              onValueChange={(val) =>
                setLimit(val === "all" ? mappedData?.length : Number(val))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGINATION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option === "all" ? "All" : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {Math.ceil((mappedData?.length || 0) / limit) > 1 && (
          <Pagination
            total={mappedData?.length || 0}
            limit={limit}
            currentPage={page}
            handlePageChange={setPage}
          />
        )}
      </div>
    </CardContent>
  );
}

export default memo(MappedDataTable);

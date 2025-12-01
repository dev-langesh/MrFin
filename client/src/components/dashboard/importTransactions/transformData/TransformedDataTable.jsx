"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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
  selectTransformedData,
  selectMappedFields,
  updateState,
  deleteRow,
} from "@/redux/slices/importTransactionsSlice";
import { useDispatch, useSelector } from "react-redux";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { format, parseISO, isValid } from "date-fns";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { PAGINATION_OPTIONS } from "@/components/dashboard/config";
import EditTransformedEntryForm from "./EditTransformedEntryForm";
import { transformedEntrySchema } from "@/schemas/transformedEntry.schema";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { selectIsLoading } from "@/redux/slices/importTransactionsSlice";
import Loading from "@/components/ui/Loading";

function TransformedDataTable({ ...props }) {
  const keys = ["txnDate", "txnType", "category", "description", "amount"];
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const transformedData = useSelector(selectTransformedData);
  const mappedFields = useSelector(selectMappedFields);
  const dateFormat = mappedFields?.dateFormat || "yyyy-MM-dd";
  const isLoading = useSelector(selectIsLoading);

  const dispatch = useDispatch();

  useEffect(() => {
    if (transformedData?.length > 0) {
      const skip = (page - 1) * limit;
      setData(transformedData.slice(skip, skip + limit));
    } else {
      setData([]);
    }
  }, [transformedData, page, limit]);

  async function deleteRows(rowsToDeleteFromCurrentPage) {
    // rowsToDeleteFromCurrentPage contains indices relative to the 'data' array (current page's displayed data)
    const originalIndices = rowsToDeleteFromCurrentPage
      .map((i) => {
        const globalIndex = (page - 1) * limit + i;
        // Ensure globalIndex is valid and transformedData[globalIndex] exists
        if (transformedData && transformedData[globalIndex]) {
          return transformedData[globalIndex]._originalIndex;
        }
        return undefined; // Or handle error
      })
      .filter((index) => index !== undefined); // Filter out any undefined indices

    // Sort descending to delete from end first. This is crucial when deleting multiple items
    // from the *source* array (importedData) using `deleteRow` action, as indices shift.
    const sortedOriginalIndices = [...originalIndices].sort((a, b) => b - a);

    sortedOriginalIndices.forEach((originalIdx) => {
      dispatch(deleteRow(originalIdx));
    });

    // After deletion, the transformedData array will change.
    // We need to clear selected rows and reset select all state.
    setSelectedRows([]);
    setSelectAll(false);
  }

  function handleUpdateEntry(updatedEntry) {
    const newData = [...transformedData];
    newData[editingIndex] = {
      ...newData[editingIndex],
      ...updatedEntry,
      amount: Number(updatedEntry.amount),
    };
    dispatch(updateState({ transformedData: newData }));
    setIsDialogOpen(false);
    setEditingIndex(null);
  }

  function toggleSelectAll(checked) {
    setSelectAll(checked);
    if (checked) setSelectedRows(data.map((_, i) => i));
    else setSelectedRows([]);
  }

  function toggleSelectRow(index, checked) {
    if (checked) setSelectedRows([...selectedRows, index]);
    else setSelectedRows(selectedRows.filter((i) => i !== index));
  }

  function getAmount(entry) {
    const amount = parseFloat(entry.amount || 0);
    return <span className="font-semibold">{amount.toFixed(2)}</span>;
  }

  function formatDate(dateStr) {
    try {
      if (!dateStr) return "";
      const date = parseISO(dateStr);
      if (isValid(date)) {
        return format(date, dateFormat);
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  // Helper to generate consistent colors for strings
  function getColorForValue(value) {
    if (!value) return "bg-gray-100 text-gray-800";
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-yellow-100 text-yellow-800",
      "bg-purple-100 text-purple-800",
      "bg-pink-100 text-pink-800",
      "bg-indigo-100 text-indigo-800",
      "bg-red-100 text-red-800",
      "bg-orange-100 text-orange-800",
      "bg-teal-100 text-teal-800",
      "bg-cyan-100 text-cyan-800",
    ];
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  return (
    <Card className="px-0 rounded-sm py-5 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-sm">
          <Loading variant="spinner" size="lg" text="Processing..." />
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <h1>Transformed Data ({transformedData?.length})</h1>
          <div className="flex items-center gap-2">
            {selectedRows.length > 0 && (
              <ConfirmationDialog
                trigger={<Button size="sm">Delete</Button>}
                title="Delete Selected Rows"
                description="Are you sure you want to delete the selected entries? This action cannot be undone."
                onConfirm={() => deleteRows(selectedRows)}
                confirmText="Delete"
              />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border grid grid-cols-1">
          <Table className="overflow-x-auto">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>{" "}
                <TableHead>ID</TableHead>
                {keys.map((key) => (
                  <TableHead key={key} className="capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </TableHead>
                ))}
                <TableHead>Applied Rules</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={keys.length + 4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No data available.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((entry, i) => {
                  const globalIndex = (page - 1) * limit + i;
                  return (
                    <TableRow
                      key={`row-${globalIndex}`}
                      className={cn(
                        Object.keys(entry.errors || {}).length > 0
                          ? "bg-red-100"
                          : ""
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.includes(i)}
                          onCheckedChange={(checked) =>
                            toggleSelectRow(i, checked)
                          }
                        />
                      </TableCell>
                      <TableCell>{globalIndex + 1}</TableCell>

                      {keys.map((key) => (
                        <TableCell
                          key={`${i}-${key}`}
                          className={cn(
                            "min-w-[100px] whitespace-break-spaces break-all",
                            entry[key]?.length > 10 && "min-w-[150px]",
                            entry[key]?.length > 20 && "min-w-[190px]",
                            entry[key]?.length > 100 && "min-w-[300px]"
                          )}
                        >
                          {entry.errors && entry.errors[key] ? (
                            <span className="text-red-600 font-medium">
                              {entry.errors[key]}
                            </span>
                          ) : key === "amount" ? (
                            getAmount(entry)
                          ) : key === "txnDate" ? (
                            formatDate(entry[key])
                          ) : key === "txnType" || key === "category" ? (
                            entry[key] ? (
                              <span
                                className={cn(
                                  "px-2 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap",
                                  getColorForValue(entry[key])
                                )}
                              >
                                {entry[key]}
                              </span>
                            ) : (
                              entry[key]
                            )
                          ) : (
                            entry[key]
                          )}
                        </TableCell>
                      ))}

                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {entry.appliedRules &&
                            entry.appliedRules.map((rule, idx) => (
                              <TooltipProvider key={idx}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-mono text-xs text-muted-foreground bg-muted w-5 h-5 flex items-center justify-center rounded-[2px] shrink-0 cursor-help">
                                      {rule.index}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{rule.name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                        </div>
                      </TableCell>

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
                              <EditTransformedEntryForm
                                initialData={entry}
                                onSubmit={handleUpdateEntry}
                                onCancel={() => setIsDialogOpen(false)}
                              />
                            </DialogContent>
                          </Dialog>

                          <ConfirmationDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-[2px]"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            }
                            title="Delete Entry"
                            description="Are you sure you want to delete this entry?"
                            onConfirm={() => deleteRows([i])}
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
        <div className="flex items-center justify-between mt-4 w-full">
          {transformedData?.length > 10 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Label className="whitespace-nowrap">Rows per page:</Label>
              <Select
                value={
                  limit === transformedData?.length ? "all" : String(limit)
                }
                onValueChange={(val) =>
                  setLimit(
                    val === "all" ? transformedData?.length : Number(val)
                  )
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

          {Math.ceil((transformedData?.length || 0) / limit) > 1 && (
            <Pagination
              total={transformedData?.length || 0}
              limit={limit}
              currentPage={page}
              handlePageChange={setPage}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(TransformedDataTable);

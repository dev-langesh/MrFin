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
import { Trash2 } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/Label";
import Pagination from "@/components/dashboard/common/Pagination";
import {
  selecttData,
  selectMappedFields,
  selectMappedData,
  setData as settData,
  updateState,
} from "@/redux/slices/importTransactionsSlice";
import { useDispatch, useSelector } from "react-redux";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { MdError } from "react-icons/md";
import { format, parseISO } from "date-fns";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { PAGINATION_OPTIONS } from "@/components/dashboard/config";

const cols = ["Txn Date", "Description", "Credit", "Debit"];
const rowKeys = ["txnDate", "description", "credit", "debit"];

function MappedDataTable({ selectedRows, setSelectedRows }) {
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const tData = useSelector(selectMappedData);
  const mappedFields = useSelector(selectMappedFields);

  const dispatch = useDispatch();

  useEffect(() => {
    if (tData?.length > 0) {
      const skip = (page - 1) * limit;
      setData(tData.slice(skip, skip + limit));
    }
  }, [tData, page, limit]);

  async function deleteRows(rows) {
    const filteredRows = [...tData].filter((_, i) => !rows.includes(i));
    dispatch(updateState({ mappedData: filteredRows }));
    setSelectedRows([]);
    setSelectAll(false);
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

  return (
    <CardContent className="">
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
              {cols.map((key) => (
                <TableHead key={key}>{key}</TableHead>
              ))}
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
                  No data available. Please map the fields.
                </TableCell>
              </TableRow>
            ) : (
              data.map((entry, i) => (
                <TableRow
                  className={cn(
                    Object.keys(entry.errors).length > 0 ? "bg-red-100" : ""
                  )}
                  key={`row-${i}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(i)}
                      onCheckedChange={(checked) => toggleSelectRow(i, checked)}
                    />
                  </TableCell>
                  <TableCell>{i + 1}</TableCell>

                  {rowKeys.map((key) => (
                    <TableCell
                      key={`${i}-${key}`}
                      className={cn(
                        "min-w-[120px] whitespace-break-spaces break-all",
                        entry[key]?.length >= 10 && "min-w-[170px]",
                        entry[key]?.length >= 20 && "min-w-[200px]",
                        entry[key]?.length >= 100 && "min-w-[300px]"
                      )}
                    >
                      {entry.errors[key]
                        ? entry.errors[key]
                        : key === "txnDate"
                        ? format(
                            parseISO(entry[key]),
                            `${mappedFields.dateFormat}`
                          )
                        : entry[key]}
                    </TableCell>
                  ))}

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      {/* <Button
                          onClick={() => handleEdit(entry)}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button> */}

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
                        onConfirm={() => deleteRows([i])}
                        confirmText="Delete"
                      />
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
        {tData?.length > 10 && (
          <div className="flex items-center gap-2">
            <Label>Rows per page:</Label>
            <Select
              value={limit === tData?.length ? "all" : String(limit)}
              onValueChange={(val) =>
                setLimit(val === "all" ? tData?.length : Number(val))
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

        {Math.ceil((tData?.length || 0) / limit) > 1 && (
          <Pagination
            total={tData?.length || 0}
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

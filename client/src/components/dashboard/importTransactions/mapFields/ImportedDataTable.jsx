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
import { Label } from "@/components/ui/Label";
import Pagination from "../../common/Pagination";
import {
  selectImportData,
  setData as setImportData,
} from "@/redux/slices/importTransactionsSlice";
import { useDispatch, useSelector } from "react-redux";

import { cn } from "@/lib/utils";

function ImportedDataTable() {
  const [keys, setKeys] = useState([]);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);

  const importData = useSelector(selectImportData);

  const dispatch = useDispatch();

  useEffect(() => {
    if (importData?.length > 0) {
      const skip = (page - 1) * limit;
      setData(importData.slice(skip, skip + limit));

      setKeys(Object.keys(importData[0]));
    }
  }, [importData, page, limit]);

  async function deleteRows(rows) {
    if (confirm("Are you sure you want to delete this entry?")) {
      const filteredRows = [...importData].filter((_, i) => !rows.includes(i));
      dispatch(setImportData(filteredRows));
    }
  }

  return (
    <CardContent>
      <div className="rounded-md border grid grid-cols-1">
        <Table className="overflow-x-auto">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              {data.length > 0 &&
                keys.map((key) => <TableHead key={key}>{key}</TableHead>)}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No data available.
                </TableCell>
              </TableRow>
            ) : (
              data.map((entry, i) => (
                <TableRow key={`row-${i}`}>
                  <TableCell>{i + 1}</TableCell>

                  {keys.map((key) => (
                    <TableCell
                      key={`${i}-${key}`}
                      className={cn(
                        "min-w-[100px] whitespace-break-spaces break-all",
                        entry[key]?.length > 10 && "min-w-[150px]",
                        entry[key]?.length > 100 && "min-w-[300px]"
                      )}
                    >
                      {entry[key]}
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

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRows([i])}
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
        <div className="flex items-center gap-2">
          <Label>Rows per page:</Label>
          <Select
            value={String(limit)}
            onValueChange={(val) => setLimit(Number(val))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="40">40</SelectItem>
              <SelectItem value="60">60</SelectItem>
              <SelectItem value="80">80</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="400">400</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {Math.ceil((importData?.length || 0) / limit) > 1 && (
          <Pagination
            total={importData?.length || 0}
            limit={limit}
            currentPage={page}
            handlePageChange={setPage}
          />
        )}
      </div>
    </CardContent>
  );
}

export default memo(ImportedDataTable);

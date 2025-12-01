import React, { memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import Pagination from "@/components/dashboard/common/Pagination";
import Loading from "@/components/ui/Loading";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PAGINATION_OPTIONS } from "@/components/dashboard/config";
import { cn } from "@/lib/utils";

function GenericDataTable({
  data = [],
  columns = [],
  isLoading = false,
  title = "Data",
  pagination,
  actions,
  onDelete,
  getRowClassName,
  emptyMessage = "No data available.",
}) {
  const {
    page,
    limit,
    selectedRows,
    selectAll,
    paginatedData,
    handlePageChange,
    handleLimitChange,
    toggleSelectAll,
    toggleSelectRow,
  } = pagination;

  return (
    <Card className="px-0 rounded-sm py-5 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-sm">
          <Loading variant="spinner" size="lg" text="Processing..." />
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <h1>
            {title} ({data.length})
          </h1>
          <div className="flex items-center gap-2">
            {selectedRows.length > 0 && onDelete && (
              <ConfirmationDialog
                trigger={<Button size="sm">Delete</Button>}
                title="Delete Selected Rows"
                description="Are you sure you want to delete the selected entries? This action cannot be undone."
                onConfirm={() => onDelete(selectedRows)}
                confirmText="Delete"
              />
            )}
            {actions}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border grid grid-cols-1">
          <Table className="overflow-x-auto">
            {data.length > 0 && (
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  {columns.map((col) => (
                    <TableHead key={col.header} className={col.className}>
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            )}
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 2}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((entry, i) => {
                  const globalIndex = (page - 1) * limit + i;
                  return (
                    <TableRow
                      key={globalIndex}
                      className={cn(
                        getRowClassName ? getRowClassName(entry) : ""
                      )}
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
                      {columns.map((col) => (
                        <TableCell
                          key={`${globalIndex}-${col.header}`}
                          className={col.cellClassName}
                        >
                          {col.render
                            ? col.render(entry, globalIndex)
                            : entry[col.accessor]}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 w-full">
          {data.length > 10 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Label className="whitespace-nowrap">Rows per page:</Label>
              <Select
                value={limit === data.length ? "all" : String(limit)}
                onValueChange={handleLimitChange}
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

          {Math.ceil((data.length || 0) / limit) > 1 && (
            <Pagination
              total={data.length || 0}
              limit={limit}
              currentPage={page}
              handlePageChange={handlePageChange}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(GenericDataTable);

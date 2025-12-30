import React, { memo } from "react";
import { Trash2 } from "lucide-react";
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
  totalCount,
  paginationOptions = PAGINATION_OPTIONS,
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
    <Card className="px-0 rounded-sm py-3 md:py-5 relative gap-2">
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-sm">
          <Loading variant="spinner" text="Processing..." />
        </div>
      )}
      <CardHeader className="max-md:px-3">
        <CardTitle className="flex flex-row items-center justify-between gap-2">
          <h1 className="text-base font-semibold md:text-xl">
            {title}{" "}
            <span className="text-muted-foreground font-normal text-xs md:text-sm">
              ({totalCount || data.length})
            </span>
          </h1>
          <div className="flex items-center gap-1 md:gap-2">
            {selectedRows.length > 0 && onDelete && (
              <ConfirmationDialog
                trigger={
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 md:h-9 md:w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </Button>
                }
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
      <CardContent className="max-md:px-3">
        <div className="rounded-md border overflow-x-auto">
          <Table>
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
              {!isLoading && paginatedData.length === 0 ? (
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
                        "text-xs md:text-sm",
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
          {(totalCount || data.length) > 10 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Label className="whitespace-nowrap text-xs max-md:hidden">
                Rows
              </Label>
              <Select
                value={
                  limit === (totalCount || data.length) ? "all" : String(limit)
                }
                onValueChange={handleLimitChange}
              >
                <SelectTrigger className="max-md:h-8 w-fit text-xs px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paginationOptions.map((option) => (
                    <SelectItem
                      key={option}
                      value={String(option)}
                      className="text-xs"
                    >
                      {option === "all" ? "All" : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {Math.ceil((totalCount || data.length || 0) / limit) > 1 && (
            <div className="scale-90 origin-center md:scale-100 md:origin-right">
              <Pagination
                total={totalCount || data.length || 0}
                limit={limit}
                currentPage={page}
                handlePageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(GenericDataTable);

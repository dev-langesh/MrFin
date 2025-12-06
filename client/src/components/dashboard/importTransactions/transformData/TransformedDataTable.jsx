"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Edit2 } from "lucide-react";
import { memo, useMemo, useState, useCallback } from "react";
import {
  selectTransformedData,
  selectMappedFields,
  updateState,
  deleteRows,
  selectIsLoading,
} from "@/redux/slices/importTransactionsSlice";
import { useDispatch, useSelector } from "react-redux";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import EditTransformedEntryForm from "./EditTransformedEntryForm";
import GenericDataTable from "../GenericDataTable";
import { useTable } from "@/hooks/useTable";
import { formatDateSafe, getColorForValue } from "@/utils/importUtils";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

function TransformedDataTable({ ...props }) {
  const transformedData = useSelector(selectTransformedData);
  const mappedFields = useSelector(selectMappedFields);
  const dateFormat = mappedFields?.dateFormat || "yyyy-MM-dd";
  const isLoading = useSelector(selectIsLoading);
  const dispatch = useDispatch();

  const [editingIndex, setEditingIndex] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const pagination = useTable({ data: transformedData });
  const { resetSelection } = pagination;

  const keys = ["txnDate", "txnType", "category", "description", "amount"];

  const columns = useMemo(() => {
    const cols = keys.map((key) => ({
      header: key.replace(/([A-Z])/g, " $1").trim(),
      accessor: key,
      className: "capitalize",
      render: (entry) => {
        const val = entry[key];
        const error = entry.errors && entry.errors[key];

        return (
          <div
            className={cn(
              "whitespace-normal break-words min-w-[120px]",
              val?.length > 20 && "min-w-[200px]",
              val?.length > 50 && "min-w-[300px]",
              val?.length > 100 && "min-w-[400px]"
            )}
          >
            {error ? (
              <span className="text-red-600 font-medium">{error}</span>
            ) : key === "amount" ? (
              <span className="font-semibold">
                {parseFloat(val || 0).toFixed(2)}
              </span>
            ) : key === "txnDate" ? (
              formatDateSafe(val, dateFormat)
            ) : key === "txnType" || key === "category" ? (
              val ? (
                <span
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap",
                    getColorForValue(val)
                  )}
                >
                  {val}
                </span>
              ) : (
                val
              )
            ) : (
              val
            )}
          </div>
        );
      },
    }));

    cols.push({
      header: "Applied Rules",
      render: (entry) => (
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
      ),
    });

    cols.push({
      header: "Actions",
      className: "text-right",
      cellClassName: "text-right",
      render: (entry, globalIndex) => (
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
            onConfirm={() => handleDeleteRows([globalIndex])}
            confirmText="Delete"
          />
        </div>
      ),
    });

    return cols;
  }, [keys, dateFormat, isDialogOpen, editingIndex]);

  const handleDeleteRows = useCallback(
    (rows) => {
      dispatch(deleteRows(rows));
      resetSelection();
    },
    [dispatch, resetSelection]
  );

  const handleUpdateEntry = useCallback(
    (updatedEntry) => {
      const newData = [...transformedData];
      newData[editingIndex] = {
        ...newData[editingIndex],
        ...updatedEntry,
        amount: Number(updatedEntry.amount),
      };
      dispatch(updateState({ transformedData: newData }));
      setIsDialogOpen(false);
      setEditingIndex(null);
    },
    [transformedData, editingIndex, dispatch]
  );

  return (
    <GenericDataTable
      data={transformedData}
      columns={columns}
      isLoading={isLoading}
      title="Transformed Data"
      pagination={pagination}
      onDelete={handleDeleteRows}
    />
  );
}

export default memo(TransformedDataTable);

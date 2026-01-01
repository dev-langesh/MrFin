"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { Trash2, Edit2 } from "lucide-react";
import { memo, useMemo, useState, useCallback, useEffect } from "react";
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
import { formatDateSafe } from "@/utils/dateUtils";
import { getColorForValue } from "@/utils/uiUtils";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { settingsService } from "@/services/settings.service";
import { currencyIcons, currencySymbols } from "@/constants/currencies";

function TransformedDataTable({ showErrorsOnly, ...props }) {
  const transformedDataRef = useSelector(selectTransformedData);
  const mappedFields = useSelector(selectMappedFields);
  const dateFormat = mappedFields?.dateFormat || "yyyy-MM-dd";
  const isLoading = useSelector(selectIsLoading);
  const dispatch = useDispatch();

  const transformedData = useMemo(() => {
    if (showErrorsOnly) {
      return transformedDataRef.filter(
        (row) => row.errors && Object.keys(row.errors).length > 0
      );
    }
    return transformedDataRef;
  }, [transformedDataRef, showErrorsOnly]);

  const [editingIndex, setEditingIndex] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currencyCode, setCurrencyCode] = useState("USD");

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await settingsService.fetchSettings();
        if (settings?.general?.currency) {
          setCurrencyCode(settings.general.currency);
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      }
    }
    loadSettings();
  }, []);

  const pagination = useTable({ data: transformedData });
  const { resetSelection } = pagination;

  const keys = ["txnDate", "txnType", "category", "description", "amount"];

  const Icon = currencyIcons[currencyCode];
  const symbol = currencySymbols[currencyCode] || "$";

  const columns = useMemo(() => {
    const cols = keys.map((key) => ({
      header:
        key === "amount" ? (
          <div className="flex items-center justify-end gap-1">
            <span>Amount</span>
            {Icon ? <Icon className="w-3 h-3" /> : <span>{symbol}</span>}
          </div>
        ) : (
          key.replace(/([A-Z])/g, " $1").trim()
        ),
      accessor: key,
      className: "capitalize",
      render: (entry) => {
        const val = entry[key];
        const error = entry.errors && entry.errors[key];

        return (
          <div
            className={cn(
              "whitespace-normal break-all min-w-[120px]",
              val?.length > 20 && "w-[150px]",
              val?.length > 50 && "w-[200px]",
              val?.length > 100 && "w-[250px]",
              key === "amount" && "text-right"
            )}
          >
            {key === "amount" ? (
              <span className="font-semibold">
                {parseFloat(val || 0).toFixed(2)}
              </span>
            ) : key === "txnDate" ? (
              formatDateSafe(val, dateFormat)
            ) : key === "txnType" || key === "category" ? (
              val ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "capitalize whitespace-nowrap",
                    getColorForValue(val)
                  )}
                >
                  {val}
                </Badge>
              ) : (
                val
              )
            ) : (
              val
            )}
            {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
          </div>
        );
      },
    }));

    cols.push({
      header: "Applied Rules",
      render: (entry) => (
        <div className="flex flex-wrap gap-1 ">
          {entry.appliedRules &&
            entry.appliedRules.map((rule, idx) => (
              <TooltipProvider key={idx}>
                <Tooltip>
                  <TooltipTrigger>
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
                size="icon"
                onClick={() => {
                  setEditingIndex(globalIndex);
                  setIsDialogOpen(true);
                }}
                className="h-8 w-8 md:h-9 md:w-9 text-black hover:text-black/80 rounded-[2px]"
              >
                <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <EditTransformedEntryForm
                initialData={entry}
                onSubmit={handleUpdateEntry}
                onCancel={() => setIsDialogOpen(false)}
                currencyCode={currencyCode}
              />
            </DialogContent>
          </Dialog>

          <ConfirmationDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:h-9 md:w-9 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-[2px]"
              >
                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
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
  }, [keys, dateFormat, isDialogOpen, editingIndex, currencyCode]);

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
      title={showErrorsOnly ? "Errors" : "Transformed Data"}
      pagination={pagination}
      onDelete={handleDeleteRows}
    />
  );
}

export default memo(TransformedDataTable);

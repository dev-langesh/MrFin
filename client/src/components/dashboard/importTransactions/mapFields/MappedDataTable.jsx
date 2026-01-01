"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Edit2 } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import {
  selectMappedFields,
  selectMappedData,
  updateMappedRow,
  deleteRows,
  selectIsLoading,
  selectErrorUids,
} from "@/redux/slices/importTransactionsSlice";
import { useDispatch, useSelector } from "react-redux";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import GenericEditForm from "../GenericEditForm";
import { createMappedEntrySchema } from "@/schemas/mappedEntry.schema";
import GenericDataTable from "../GenericDataTable";
import { useTable } from "@/hooks/useTable";
import { formatDateSafe } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";

function MappedDataTable({ showErrorsOnly }) {
  const mappedData = useSelector(selectMappedData);
  const errorUids = useSelector(selectErrorUids);
  const mappedFields = useSelector(selectMappedFields);
  const isLoading = useSelector(selectIsLoading);
  const dispatch = useDispatch();

  console.log(isLoading)

  const [editingUid, setEditingUid] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // We rely on stable UIDs now
  const displayData = useMemo(() => {
    if (showErrorsOnly) {
      const errorSet = new Set(errorUids);
      return mappedData.filter((r) => errorSet.has(r.uid));
    }
    return mappedData;
  }, [mappedData, errorUids, showErrorsOnly]);

  const pagination = useTable({ data: displayData });
  const { selectedRows: hookSelectedRows, resetSelection } = pagination;

  const orderedFields = ["txnDate", "description", "credit", "debit"];
  const fieldLabels = {
    txnDate: "Transaction Date",
    description: "Description",
    credit: "Credit",
    debit: "Debit",
  };

  const columns = useMemo(() => {
    const cols = orderedFields
      .map((fieldKey) => {
        const csvColumn = mappedFields?.[fieldKey];
        if (!csvColumn) return null;

        return {
          header: fieldLabels[fieldKey],
          accessor: csvColumn,
          className: "capitalize",
          cellClassName: cn("min-w-[150px] whitespace-normal break-all"),
          render: (entry) => {
            const val = entry[csvColumn];
            const isDate = fieldKey === "txnDate";
            const error = entry.errors && entry.errors[fieldKey];

            return (
              <div
                className={cn(
                  val?.length >= 20 && "w-[150px]",
                  val?.length >= 50 && "w-[200px]",
                  val?.length >= 100 && "w-[250px]"
                )}
              >
                {error ? (
                  <span className="text-red-600 font-medium">{error}</span>
                ) : isDate ? (
                  formatDateSafe(val, mappedFields.dateFormat)
                ) : (
                  val
                )}
              </div>
            );
          },
        };
      })
      .filter(Boolean);

    cols.push({
      header: "Actions",
      className: "text-right",
      cellClassName: "text-right",
      render: (entry, globalIndex) => (
        <div className="flex items-center justify-end gap-1">
          <Dialog
            open={isDialogOpen && editingUid === entry.uid}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingUid(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingUid(entry.uid);
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
            onConfirm={() => handleDeleteRows([globalIndex])} // GenericDataTable passes visual indices
            confirmText="Delete"
          />
        </div>
      ),
    });

    return cols;
  }, [mappedFields, isDialogOpen, editingUid]);

  function handleDeleteRows(rowIndices) {
    // Convert visual indices to UIDs
    const uids = rowIndices.map((i) => displayData[i].uid);
    dispatch(deleteRows(uids));
    resetSelection();
  }

  function handleUpdateEntry(updatedEntry) {
    const { _realIndex, ...rest } = updatedEntry; // Remove legacy props if any
    dispatch(updateMappedRow({ uid: editingUid, row: rest }));
    setIsDialogOpen(false);
    setEditingUid(null);
  }

  return (
    <GenericDataTable
      data={displayData}
      columns={columns}
      isLoading={isLoading}
      title={showErrorsOnly ? "Errors" : "Mapped Data"}
      pagination={pagination}
      onDelete={handleDeleteRows}
      emptyMessage="No data available. Please map the fields."
    />
  );
}

export default memo(MappedDataTable);

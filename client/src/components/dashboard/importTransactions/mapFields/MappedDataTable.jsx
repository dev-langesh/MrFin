"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Edit2 } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import {
  selectMappedFields,
  selectMappedData,
  updateState,
  deleteRows,
  selectIsLoading,
} from "@/redux/slices/importTransactionsSlice";
import { useDispatch, useSelector } from "react-redux";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import GenericEditForm from "../GenericEditForm";
import { createMappedEntrySchema } from "@/schemas/mappedEntry.schema";
import GenericDataTable from "../GenericDataTable";
import { useTable } from "@/hooks/useTable";
import { formatDateSafe } from "@/utils/importUtils";
import { cn } from "@/lib/utils";

function MappedDataTable({ showErrorsOnly }) {
  const [filteredData, setFilteredData] = useState([]);
  const mappedData = useSelector(selectMappedData);
  const mappedFields = useSelector(selectMappedFields);
  const isLoading = useSelector(selectIsLoading);
  const dispatch = useDispatch();

  const [editingIndex, setEditingIndex] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const pagination = useTable({ data: filteredData });
  const { selectedRows: hookSelectedRows, resetSelection } = pagination;

  const orderedFields = ["txnDate", "description", "credit", "debit"];

  useEffect(() => {
    if (showErrorsOnly && mappedData?.length) {
      const filtered = mappedData.filter(
        (entry) => entry.errors && Object.keys(entry.errors).length > 0
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(mappedData);
    }
  }, [showErrorsOnly, mappedData]);

  const dynamicCols = useMemo(
    () =>
      mappedFields
        ? orderedFields.map((field) => mappedFields[field]).filter(Boolean)
        : [],
    [mappedFields]
  );

  const columns = useMemo(() => {
    const cols = dynamicCols.map((key) => ({
      header: key,
      accessor: key,
      className: "capitalize",
      cellClassName: cn(
        "min-w-[150px] whitespace-normal break-words"
        // We can't easily access entry value here for length check unless we use render
      ),
      render: (entry) => {
        const val = entry[key];
        const isDate = key === mappedFields.txnDate;
        const error = entry.errors && entry.errors[key];

        return (
          <div
            className={cn(
              val?.length >= 20 && "min-w-[200px]",
              val?.length >= 50 && "min-w-[300px]",
              val?.length >= 100 && "min-w-[400px]"
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
    }));

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
      ),
    });

    return cols;
  }, [dynamicCols, mappedFields, isDialogOpen, editingIndex]);

  function handleDeleteRows(rows) {
    dispatch(deleteRows(rows));
    resetSelection();
    // If we were using parent state: setSelectedRows([]);
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

  return (
    <GenericDataTable
      data={filteredData}
      columns={columns}
      isLoading={isLoading}
      title="Mapped Data"
      pagination={pagination}
      onDelete={handleDeleteRows}
      emptyMessage="No data available. Please map the fields."
    />
  );
}

export default memo(MappedDataTable);

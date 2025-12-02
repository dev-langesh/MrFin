"use client";

import { memo, useMemo } from "react";
import {
  selectImportData,
  selectIsLoading,
  deleteRows,
} from "@/redux/slices/importTransactionsSlice";
import { useDispatch, useSelector } from "react-redux";
import { cn } from "@/lib/utils";
import GenericDataTable from "@/components/dashboard/importTransactions/GenericDataTable";
import { useTable } from "@/hooks/useTable";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";

function CsvTable() {
  const isLoading = useSelector(selectIsLoading);
  const importData = useSelector(selectImportData);
  const dispatch = useDispatch();

  const pagination = useTable({ data: importData });
  const { resetSelection } = pagination;

  const keys = useMemo(() => {
    return importData && importData.length > 0
      ? Object.keys(importData[0])
      : [];
  }, [importData]);

  const columns = useMemo(() => {
    const cols = keys.map((key) => ({
      header: key,
      accessor: key,
      render: (entry) => (
        <div
          className={cn(
            "whitespace-break-spaces break-all",
            entry[key]?.length > 10 && "min-w-[150px]",
            entry[key]?.length > 100 && "min-w-[300px]"
          )}
        >
          {entry[key]}
        </div>
      ),
    }));

    cols.push({
      header: "Actions",
      className: "text-right",
      cellClassName: "text-right",
      render: (entry, globalIndex) => (
        <div className="flex items-center justify-end">
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
  }, [keys]);

  function handleDeleteRows(rows) {
    dispatch(deleteRows(rows));
    resetSelection();
  }

  return (
    <GenericDataTable
      data={importData}
      columns={columns}
      isLoading={isLoading}
      title="Imported Data"
      pagination={pagination}
      onDelete={handleDeleteRows}
    />
  );
}

export default memo(CsvTable);

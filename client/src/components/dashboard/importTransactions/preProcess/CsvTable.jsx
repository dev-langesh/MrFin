"use client";

import {
  selectPreProcessedData,
  selectIsLoading,
  deleteRows,
} from "@/redux/slices/importTransactionsSlice";
import { useDispatch, useSelector } from "react-redux";
import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import GenericDataTable from "@/components/dashboard/importTransactions/GenericDataTable";
import { useTable } from "@/hooks/useTable";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";

function CsvTable() {
  const isLoading = useSelector(selectIsLoading);
  const preProcessedData = useSelector(selectPreProcessedData);
  const dispatch = useDispatch();

  const pagination = useTable({ data: preProcessedData });
  const { resetSelection } = pagination;

  const keys = useMemo(() => {
    return preProcessedData && preProcessedData.length > 0
      ? Object.keys(preProcessedData[0]).filter(
          (k) => k !== "uid" && !k.startsWith("_")
        )
      : [];
  }, [preProcessedData]);

  const columns = useMemo(() => {
    const cols = keys.map((key) => ({
      header: key,
      accessor: key,
      render: (entry) => (
        <div
          className={cn(
            "break-all whitespace-normal min-w-[130px]",
            entry[key]?.length >= 20 && "w-[200px]",
            entry[key]?.length >= 50 && "w-[300px]",
            entry[key]?.length >= 100 && "w-[400px]"
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

  function handleDeleteRows(rowIndices) {
    const uids = rowIndices
      .map((index) => preProcessedData[index]?.uid)
      .filter(Boolean);

    dispatch(deleteRows(uids));
    resetSelection();
  }

  return (
    <GenericDataTable
      data={preProcessedData}
      columns={columns}
      isLoading={isLoading}
      title="Imported Data"
      pagination={pagination}
      onDelete={handleDeleteRows}
    />
  );
}

export default memo(CsvTable);

"use client";

import { memo, useMemo } from "react";
import { selectImportData } from "@/redux/slices/importTransactionsSlice";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";
import GenericDataTable from "../GenericDataTable";
import { useTable } from "@/hooks/useTable";

function ImportedDataTable() {
  const importData = useSelector(selectImportData);
  const pagination = useTable({ data: importData });

  const keys = useMemo(() => {
    return importData && importData.length > 0
      ? Object.keys(importData[0])
      : [];
  }, [importData]);

  const columns = useMemo(() => {
    return keys.map((key) => ({
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
  }, [keys]);

  return (
    <GenericDataTable
      data={importData}
      columns={columns}
      isLoading={false}
      title="Imported Data"
      pagination={pagination}
    />
  );
}

export default memo(ImportedDataTable);

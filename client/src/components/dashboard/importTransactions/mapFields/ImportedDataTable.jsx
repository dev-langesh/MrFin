"use client";

import { memo, useMemo } from "react";
import { selectPreProcessedData } from "@/redux/slices/importTransactionsSlice";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";
import GenericDataTable from "../GenericDataTable";
import { useTable } from "@/hooks/useTable";

function ImportedDataTable() {
  const preProcessedData = useSelector(selectPreProcessedData);
  const pagination = useTable({ data: preProcessedData });

  const keys = useMemo(() => {
    return preProcessedData && preProcessedData.length > 0
      ? Object.keys(preProcessedData[0]).filter(
          (k) => k !== "uid" && !k.startsWith("_")
        )
      : [];
  }, [preProcessedData]);

  const columns = useMemo(() => {
    return keys.map((key) => ({
      header: key,
      accessor: key,
      render: (entry) => (
        <div
          className={cn(
            "whitespace-normal break-all min-w-[130px]",
            entry[key]?.length > 20 && "w-[150px]",
            entry[key]?.length > 50 && "w-[200px]",
            entry[key]?.length > 100 && "w-[250px]"
          )}
        >
          {entry[key]}
        </div>
      ),
    }));
  }, [keys]);

  return (
    <GenericDataTable
      data={preProcessedData}
      columns={columns}
      isLoading={false}
      title="Imported Data"
      pagination={pagination}
    />
  );
}

export default memo(ImportedDataTable);

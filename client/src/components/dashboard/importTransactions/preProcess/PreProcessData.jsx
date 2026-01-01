import {
  selectImportFileData,
  updateState,
} from "@/redux/slices/importTransactionsSlice";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import PreProcessOptions from "./PreProcessOptions";
import { toast } from "sonner";
import PreProcessedDataTable from "./PreProcessedDataTable";

export default function PreProcessData() {
  const fileData = useSelector(selectImportFileData);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!fileData || fileData.length === 0) {
      toast.error("No files to preprocess");
      dispatch(updateState({ step: 1 }));
    }
  }, [fileData]);

  return (
    <div className="space-y-6">
      <PreProcessOptions />
      <PreProcessedDataTable />
    </div>
  );
}

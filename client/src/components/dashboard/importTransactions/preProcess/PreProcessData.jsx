import {
  selectImportFiles,
  updateState,
} from "@/redux/slices/importTransactionsSlice";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import CsvTable from "./CsvTable";
import PreProcessOptions from "./PreProcessOptions";
import { toast } from "sonner";

export default function PreProcessData() {
  const files = useSelector(selectImportFiles);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!files || files.length === 0) {
      toast.error("No files to preprocess");
      dispatch(updateState({ step: 1 }));
    }
  }, [files]);

  return (
    <div className="space-y-6">
      <PreProcessOptions />
      <CsvTable />
    </div>
  );
}

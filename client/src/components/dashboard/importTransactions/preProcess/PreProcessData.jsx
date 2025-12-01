import csv from "csvtojson";
import {
  selectImportData,
  selectImportFiles,
  setImportedData,
  updateState,
} from "@/redux/slices/importTransactionsSlice";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CsvTable from "../CsvTable";
import PreProcessOptions from "./PreProcessOptions";
import { toast } from "sonner";

export default function PreProcessData({
  readedDataFromFile,
  setReadedDataFromFile,
}) {
  const files = useSelector(selectImportFiles);
  const data = useSelector(selectImportData);
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

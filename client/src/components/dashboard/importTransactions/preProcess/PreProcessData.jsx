import csv from "csvtojson";
import {
  selectImportData,
  selectImportFiles,
  setData,
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

  async function preProcessData() {
    if (readedDataFromFile) return;

    const data = await new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const json = await csv({}).fromString(event.target.result);
          console.log(json);
          resolve(json);
        };
        reader.readAsText(files[0]);
        setReadedDataFromFile(true);
      } catch (e) {
        reject(e);
      }
    });

    dispatch(setData(data));
  }

  useEffect(() => {
    if (!files || files.length === 0) {
      toast.error("No files to preprocess");
      dispatch(updateState({ step: 1 }));
    }
    preProcessData();
  }, [files]);

  return (
    <div className="space-y-6">
      <PreProcessOptions />
      <CsvTable />
    </div>
  );
}

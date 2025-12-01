"use client";

import ChangeStep from "@/components/dashboard/importTransactions/ChangeStep";
import MapFields from "@/components/dashboard/importTransactions/mapFields/MapFields";
import PreProcessData from "@/components/dashboard/importTransactions/preProcess/PreProcessData";
import TransformData from "@/components/dashboard/importTransactions/transformData/TransformData";
import { Stepper } from "@/components/ui/Stepper";
import { UploadFile } from "@/components/ui/UploadFile";
import {
  nextStep,
  selectImportTransactions,
  setFiles,
} from "@/redux/slices/importTransactionsSlice";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function ImportTransactionsPage() {
  const [readedDataFromFile, setReadedDataFromFile] = useState(false);
  const state = useSelector(selectImportTransactions);
  const dispatch = useDispatch();

  function handleUpload(files) {
    dispatch(setFiles(files));

    if (files?.length) {
      setReadedDataFromFile(false);
      dispatch(nextStep());
    }
  }

  let Component;

  switch (state.step) {
    case 1:
      Component = (
        <UploadFile
          acceptedFileTypes={[".csv"]}
          className="h-[250px]"
          onFileUpload={handleUpload}
          value={state.files}
          maxFileSize={5 * 1024 * 1024} // 5MB
        />
      );
      break;
    case 2:
      Component = (
        <PreProcessData
          readedDataFromFile={readedDataFromFile}
          setReadedDataFromFile={setReadedDataFromFile}
        />
      );
      break;

    case 3:
      Component = <MapFields />;
      break;

    case 4:
      Component = <TransformData />;
      break;

    default:
      Component = null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Import Transactions</h1>
      <Stepper
        currentStep={state.step}
        steps={[
          {
            name: "Upload File",
          },
          {
            name: "Process Data",
          },
          {
            name: "Map Data",
          },
          {
            name: "Transform Data",
          },
        ]}
      />

      {Component}
      <ChangeStep />
    </div>
  );
}

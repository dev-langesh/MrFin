"use client";

import ChangeStep from "@/components/dashboard/importTransactions/ChangeStep";
import MapFields from "@/components/dashboard/importTransactions/mapFields/MapFields";
import PreProcessData from "@/components/dashboard/importTransactions/preProcess/PreProcessData";
import TransformData from "@/components/dashboard/importTransactions/transformData/TransformData";
import { Stepper } from "@/components/ui/Stepper";
import { UploadFile } from "@/components/ui/UploadFile";
import { MobileStepIndicator } from "@/components/dashboard/importTransactions/MobileStepIndicator";
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Import Transactions
        </h1>
        <p className="text-gray-500">
          Import transactions from bank statements in CSV format.
        </p>
      </div>
      
      {/* Mobile Step Indicator */}
      <div className="block md:hidden">
        <MobileStepIndicator
          currentStep={state.step}
          steps={[
            { name: "Upload" },
            { name: "Pre Process" },
            { name: "Map Fields" },
            { name: "Transform" },
          ]}
        />
      </div>

      {/* Desktop Stepper */}
      <div className="hidden md:block">
        <Stepper
          currentStep={state.step}
          steps={[
            {
              name: "Upload File",
            },
            {
              name: "Pre Process",
            },
            {
              name: "Map Fields",
            },
            {
              name: "Transform Data",
            },
          ]}
        />
      </div>

      {Component}
      <ChangeStep />
    </div>
  );
}

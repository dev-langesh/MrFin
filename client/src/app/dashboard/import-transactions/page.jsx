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
  setImportFileData,
} from "@/redux/slices/importTransactionsSlice";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function ImportTransactionsPage() {
  const state = useSelector(selectImportTransactions);
  const dispatch = useDispatch();

  async function handleUpload(files) {
    if (!files || files.length === 0) {
      dispatch(setImportFileData([]));
      return;
    }

    const file = files[0];
    if (file.content) {
      dispatch(setImportFileData(files));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;
      // Dispatching setImportFileData to store raw content
      dispatch(
        setImportFileData([
          {
            name: file.name,
            content: content,
            size: file.size,
            type: file.type,
          },
        ])
      );
      dispatch(nextStep());
    };

    reader.readAsText(file);
  }

  let Component;

  switch (state.step) {
    case 1:
      Component = (
        <UploadFile
          acceptedFileTypes={[".csv"]}
          className="h-[250px]"
          onFileUpload={handleUpload}
          value={state.fileData}
          maxFileSize={5 * 1024 * 1024} // 5MB
        />
      );
      break;
    case 2:
      Component = (
        <PreProcessData
        // readedDataFromFile prop removed as it is no longer used
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
        <h1 className="md:text-3xl text-xl font-bold text-gray-900">
          Import Transactions
        </h1>
        <p className="text-gray-500 max-md:text-sm">
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

import { UploadFile } from "@/components/ui/UploadFile";
import React from "react";

export default function ImportTransactionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Import Transactions</h1>

      <UploadFile
        multiple={true}
        preview={true}
        acceptedFileTypes={["image/png", ".csv"]}
      />
    </div>
  );
}

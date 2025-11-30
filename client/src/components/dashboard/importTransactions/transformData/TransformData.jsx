import React from "react";
import Rules from "./Rules";
import TransformedDataTable from "./TransformedDataTable";

export default function TransformData() {
  return (
    <div className="space-y-6">
      <Rules />
      <TransformedDataTable />
    </div>
  );
}

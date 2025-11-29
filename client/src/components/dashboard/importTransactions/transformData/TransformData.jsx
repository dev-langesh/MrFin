import React from "react";
import Rules from "./Rules";
import DataTable from "./DataTable";

export default function TransformData() {
  return (
    <div className="space-y-6">
      <Rules />
      <DataTable />
    </div>
  );
}

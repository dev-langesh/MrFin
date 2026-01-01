import React, { useState } from "react";
import Rules from "./Rules";
import TransformedDataTable from "./TransformedDataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSelector } from "react-redux";
import { selectTransformedData } from "@/redux/slices/importTransactionsSlice";

export default function TransformData() {
  const [activeTab, setActiveTab] = useState("data");
  const transformedData = useSelector(selectTransformedData);
  const hasErrors = transformedData.some(
    (row) => row.errors && Object.keys(row.errors).length > 0
  );

  return (
    <div className="space-y-6">
      <Rules />
      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        {hasErrors && (
          <TabsList>
            <TabsTrigger value="data">Transformed Data</TabsTrigger>
            <TabsTrigger value="errors" className="text-red-500">
              Errors
            </TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="data">
          <TransformedDataTable />
        </TabsContent>
        <TabsContent value="errors">
          <TransformedDataTable showErrorsOnly />
        </TabsContent>
      </Tabs>
    </div>
  );
}

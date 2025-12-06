import React, { useState } from "react";
import MapFieldsOptions from "./MapFieldsOptions";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MappedDataTable from "./MappedDataTable";
import ImportedDataTable from "./ImportedDataTable";
import { useSelector } from "react-redux";
import {
  selectMappedFields,
  selectValidationAttempt,
  selectMappedData,
  selectErrorIndices,
} from "@/redux/slices/importTransactionsSlice";
import { useEffect } from "react";

export default function MapFields({}) {
  const [activeTab, setActiveTab] = useState("mappedData");
  const mappedFields = useSelector(selectMappedFields);
  const validationAttempt = useSelector(selectValidationAttempt);

  const mappedData = useSelector(selectMappedData);
  const errorIndices = useSelector(selectErrorIndices);

  useEffect(() => {
    if (validationAttempt > 0) {
      if (errorIndices?.length > 0) {
        setActiveTab("errors");
      } else {
        setActiveTab("mappedData");
      }
    }
  }, [validationAttempt, errorIndices?.length]);

  const handleApply = (hasError) => {
    setActiveTab(hasError ? "errors" : "mappedData");
  };

  return (
    <div className="space-y-6">
      <MapFieldsOptions onApply={handleApply} />
      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <Card className="rounded-sm py-5">
          <CardHeader className="px-0 ">
            <CardTitle className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="importedData">Imported Data</TabsTrigger>
                <TabsTrigger value="mappedData">Mapped Data</TabsTrigger>
                {errorIndices?.length > 0 && (
                  <TabsTrigger value="errors" className="text-red-500">
                    Errors
                  </TabsTrigger>
                )}
              </TabsList>
              {/* Delete button is now handled within MappedDataTable via GenericDataTable */}
            </CardTitle>
          </CardHeader>
          <TabsContent value="importedData" className="w-full">
            <ImportedDataTable />
          </TabsContent>
          <TabsContent value="mappedData">
            <MappedDataTable />
          </TabsContent>
          <TabsContent value="errors">
            <MappedDataTable showErrorsOnly />
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}

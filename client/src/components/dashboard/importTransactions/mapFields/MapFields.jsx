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
} from "@/redux/slices/importTransactionsSlice";
import { useEffect } from "react";

export default function MapFields({}) {
  const [activeTab, setActiveTab] = useState("mappedData");
  const mappedFields = useSelector(selectMappedFields);
  const validationAttempt = useSelector(selectValidationAttempt);

  useEffect(() => {
    if (mappedFields.hasError) {
      setActiveTab("errors");
    }
  }, [mappedFields.hasError, validationAttempt]);

  return (
    <div className="space-y-6">
      <MapFieldsOptions onApply={() => setActiveTab("mappedData")} />
      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <Card className="px-0 rounded-sm py-5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="importedData">Imported Data</TabsTrigger>
                <TabsTrigger value="mappedData">Mapped Data</TabsTrigger>
                {mappedFields.hasError && (
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

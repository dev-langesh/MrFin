import React, { useState } from "react";
import MapFieldsOptions from "./MapFieldsOptions";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MappedDataTable from "./MappedDataTable";
import ImportedDataTable from "./ImportedDataTable";

export default function MapFields({}) {
  const [activeTab, setActiveTab] = useState("mappedData");

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
        </Card>
      </Tabs>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import CsvTable from "../CsvTable";
import MapFieldsOptions from "./MapFieldsOptions";
import { selectMappedFields } from "@/redux/slices/importTransactionsSlice";
import { useSelector } from "react-redux";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MappedDataTable from "./MappedDataTable";
import ImportedDataTable from "./ImportedDataTable";

export default function MapFields({}) {
  const mappedFields = useSelector(selectMappedFields);
  return (
    <div className="space-y-6">
      <MapFieldsOptions />
            <Tabs defaultValue="importedData" className="w-full">
      <Card className="px-0 rounded-sm py-5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="importedData">Imported Data</TabsTrigger>
                <TabsTrigger value="mappedData">Mapped Data</TabsTrigger>
              </TabsList>
          </CardTitle>
        </CardHeader>
        {/* {!mappedFields.debit ||
          !mappedFields.credit ||
          !mappedFields.txnDate ||
          !mappedFields.description} */}
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

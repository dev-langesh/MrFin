import React, { useEffect, useState } from "react";
import CsvTable from "../CsvTable";
import MapFieldsOptions from "./MapFieldsOptions";
import {
  selectMappedFields,
  selectMappedData,
  updateState,
} from "@/redux/slices/importTransactionsSlice";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MappedDataTable from "./MappedDataTable";
import ImportedDataTable from "./ImportedDataTable";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";

export default function MapFields({}) {
  const mappedFields = useSelector(selectMappedFields);
  const tData = useSelector(selectMappedData);
  const dispatch = useDispatch();
  const [selectedRows, setSelectedRows] = useState([]);

  console.log(selectedRows);

  const [activeTab, setActiveTab] = useState("importedData");

  function handleDelete() {
    const filteredRows = [...tData].filter((_, i) => !selectedRows.includes(i));
    dispatch(updateState({ mappedData: filteredRows }));
    setSelectedRows([]);
  }

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
              <div className="flex items-center gap-2">
                {activeTab === "mappedData" && selectedRows.length > 0 && (
                  <ConfirmationDialog
                    trigger={<Button size="sm">Delete</Button>}
                    title="Delete Selected Rows"
                    description="Are you sure you want to delete the selected entries? This action cannot be undone."
                    onConfirm={handleDelete}
                    confirmText="Delete"
                  />
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <TabsContent value="importedData" className="w-full">
            <ImportedDataTable />
          </TabsContent>
          <TabsContent value="mappedData">
            <MappedDataTable
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
            />
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}

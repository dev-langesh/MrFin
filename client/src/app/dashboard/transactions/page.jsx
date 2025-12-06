"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { settingsService } from "@/services/settings.service";
import { toast } from "sonner";

import TransactionTable from "@/components/dashboard/transaction/TransactionTable";

export default function TransactionPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    dateRange: "all",
    source: "all",
    paymentGateway: "all",
    sort: "desc",
    limit: 10,
    page: 1,
    page: 1,
  });

  const [settings, setSettings] = useState({
    transactionSettings: {
      txnTypes: [],
      categories: [],
    },
    importTransactionSettings: {
      mapFields: {
        dateFormat: "yyyy-MM-dd",
      },
    },
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await settingsService.fetchSettings();
        if (data) {
          setSettings(data);
        }
      } catch (error) {
        toast.error("Failed to load settings");
      }
    }
    loadSettings();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">
            Manage and track your financial transactions
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/import-transactions")}>
          Import
          <Upload className="ml-1" />
        </Button>
      </div>

      {/* Data Table */}
      <TransactionTable
        filters={filters}
        setFilters={setFilters}
        settings={settings}
      />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

import TransactionTable from "@/components/dashboard/transaction/TransactionTable";

export default function TransactionPage() {
  const router = useRouter();

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
      <TransactionTable />
    </div>
  );
}

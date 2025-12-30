"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

import TransactionTable from "@/components/dashboard/transaction/TransactionTable";

export default function TransactionPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">
            Transactions
          </h1>
          <p className="text-gray-600 max-md:text-sm">
            Manage and track your financial transactions
          </p>
        </div>
        <Button
          className="max-md:hidden max-md:self-end"
          onClick={() => router.push("/dashboard/import-transactions")}
        >
          <span>Import</span>
          <Upload className="ml-1" />
        </Button>
      </div>

      {/* Data Table */}
      <TransactionTable />
    </div>
  );
}

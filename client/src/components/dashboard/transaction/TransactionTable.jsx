"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { Download, Plus, Edit2, Trash2, Edit, ListFilter } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import TransactionEntryForm from "./TransactionEntryForm";
import { transactionService } from "@/services/transactions.service";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import GenericDataTable from "../importTransactions/GenericDataTable";
import { formatDateSafe } from "@/utils/dateUtils";
import { getColorForValue } from "@/utils/uiUtils";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { ExportTransactionDialog } from "./ExportTransactionDialog";
import { exportData } from "@/utils/exportUtils";
import TransactionFilters from "./TransactionFilters";
import { settingsService } from "@/services/settings.service";
import { currencySymbols, currencyIcons } from "@/constants/currencies";

function TransactionTable() {
  const [filters, setFilters] = useState({
    dateRange: "all",
    sort: "desc",
    limit: 10,
    page: 1,
  });
  const [data, setData] = useState([]);
  const [totalData, setTotalData] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [settings, setSettings] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  async function fetchData() {
    setIsLoading(true);
    try {
      const res = await transactionService.getTransactions(filters);
      setData(res.transactions);
      setTotalData(res.total);
    } catch (error) {
      toast.error("Failed to fetch transactions");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleEdit = useCallback((entry) => {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        let idsToDelete = [];
        if (Array.isArray(ids)) {
          idsToDelete = ids.map((idx) => data[idx]?._id).filter(Boolean);
        } else {
          idsToDelete = [ids];
        }

        if (idsToDelete.length === 0) return;

        await Promise.all(
          idsToDelete.map((id) => transactionService.deleteTransaction(id))
        );

        setData((prev) =>
          prev.filter((entry) => !idsToDelete.includes(entry._id))
        );
        setTotalData((total) => total - idsToDelete.length);
        setSelectedRows([]);
        toast.success("Transaction(s) deleted");
      } catch (error) {
        toast.error(error.message);
      }
    },
    [data]
  );

  function handleExportClick() {
    setIsExportDialogOpen(true);
  }

  async function handlePerformExport(scope, format, dateFormat) {
    try {
      let exportFilters = { ...filters };

      if (scope === "all") {
        // Reset all filters to default 'all', but exclude pagination
        exportFilters = {
          dateRange: "all",
          category: "all",
          sort: "desc",
          limit: "all", // Fetch all
          page: 1,
        };
      } else {
        // Filtered scope: keep current filters, but fetch all matching
        exportFilters = {
          ...filters,
          limit: "all", // Fetch all matching results
          page: 1,
        };
      }

      const res = await transactionService.getTransactions(exportFilters);

      if (!res.transactions || res.transactions.length === 0) {
        toast.warning("No data available to export");
        return;
      }

      exportData(res.transactions, format, "transactions_export", dateFormat);
      toast.success("Export started successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export data");
    }
  }

  const handleApplyFilters = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      setIsFilterOpen(false);
    },
    [setFilters]
  );

  const activeFilterCount = [
    filters.txnType?.length > 0,
    filters.category?.length > 0,
    filters.dateRange !== "all",
    !!filters.description,
  ].filter(Boolean).length;

  // Construct pagination object compatible with GenericDataTable
  const pagination = {
    page: filters.page,
    limit: filters.limit,
    selectedRows,
    selectAll: data.length > 0 && selectedRows.length === data.length,
    paginatedData: data, // Server-side paginated, so just use data
    handlePageChange: (page) => setFilters((prev) => ({ ...prev, page })),
    handleLimitChange: (val) =>
      setFilters((prev) => ({
        ...prev,
        limit: val === "all" ? totalData : Number(val),
        page: 1,
      })),
    toggleSelectAll: (checked) => {
      if (checked) {
        setSelectedRows(data.map((_, i) => i));
      } else {
        setSelectedRows([]);
      }
    },
    toggleSelectRow: (index, checked) => {
      if (checked) {
        setSelectedRows((prev) => [...prev, index]);
      } else {
        setSelectedRows((prev) => prev.filter((i) => i !== index));
      }
    },
  };

  const currencyCode = settings?.general?.currency || "USD";
  const Icon = currencyIcons[currencyCode];
  const symbol = currencySymbols[currencyCode] || "$";

  const columns = useMemo(
    () => [
      {
        header: "Date",
        accessor: "txnDate",
        render: (entry) => (
          <span className="whitespace-nowrap">
            {formatDateSafe(
              entry.txnDate,
              settings?.importTransactionSettings?.mapFields?.dateFormat || "PP"
            )}
          </span>
        ),
      },
      {
        header: "Type",
        accessor: "txnType",
        render: (entry) => (
          <Badge
            variant="secondary"
            className={cn("capitalize", getColorForValue(entry.txnType))}
          >
            {entry.txnType}
          </Badge>
        ),
      },
      {
        header: "Category",
        accessor: "category",
        render: (entry) => {
          if (!entry.category) return null;
          return (
            <Badge
              variant="secondary"
              className={cn("capitalize", getColorForValue(entry.category))}
            >
              {entry.category}
            </Badge>
          );
        },
      },
      {
        header: "Description",
        accessor: "description",
        cellClassName: "w-[250px] break-all whitespace-normal",
      },
      {
        header: (
          <div className="flex items-center justify-end gap-1">
            <span>Amount</span>
            {Icon ? <Icon className="w-3 h-3" /> : <span>{symbol}</span>}
          </div>
        ),
        accessor: "amount",
        className: "text-right",
        cellClassName: "text-right font-medium",
        render: (entry) => entry.amount.toLocaleString(),
      },
      {
        header: "Actions",
        className: "text-right",
        cellClassName: "text-right",
        render: (entry, index) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-9 md:w-9"
              onClick={() => handleEdit(entry)}
            >
              <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </Button>
            <ConfirmationDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:h-9 md:w-9 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
              }
              title="Delete Transaction"
              description="Are you sure you want to delete this transaction?"
              onConfirm={() => handleDelete(entry._id)}
              confirmText="Delete"
            />
          </div>
        ),
      },
    ],
    [handleEdit, handleDelete]
  );

  return (
    <>
      <GenericDataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        loadingAnimationType="skeleton"
        title="Transactions"
        pagination={pagination}
        paginationOptions={[10, 50, 100, 150]}
        onDelete={handleDelete}
        totalCount={totalData}
        className="min-h-[500px]"
        actions={
          <TooltipProvider>
            <div className="flex items-center gap-1 md:gap-2">
              {/* Filter Mechanism */}
              {isMobile ? (
                <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="relative h-8 w-8 md:h-9 md:w-9"
                    >
                      <ListFilter className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3 md:h-4 md:w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground pointer-events-none">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto w-[90vw] rounded-lg">
                    <div className="font-semibold text-lg mb-2">Filters</div>
                    <TransactionFilters
                      activeFilters={filters}
                      onApply={handleApplyFilters}
                      isOpen={isFilterOpen}
                      categories={
                        settings?.transactionSettings?.categories || []
                      }
                      txnTypes={settings?.transactionSettings?.txnTypes || []}
                    />
                  </DialogContent>
                </Dialog>
              ) : (
                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="relative h-8 w-8 md:h-9 md:w-9"
                        >
                          <ListFilter className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3 md:h-4 md:w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground pointer-events-none">
                              {activeFilterCount}
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Filter Transactions</TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-[340px] p-0" align="end">
                    <div className="p-4">
                      <TransactionFilters
                        activeFilters={filters}
                        onApply={handleApplyFilters}
                        isOpen={isFilterOpen}
                        categories={
                          settings?.transactionSettings?.categories || []
                        }
                        txnTypes={settings?.transactionSettings?.txnTypes || []}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Add */}
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <Tooltip delayDuration={500}>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 md:h-9 md:w-9"
                      >
                        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Add Transaction</TooltipContent>
                </Tooltip>
                <DialogContent className="lg:max-w-2xl">
                  <TransactionEntryForm
                    setData={setData}
                    filters={filters}
                    setTotalData={setTotalData}
                    close={() => setIsAddDialogOpen(false)}
                    settings={settings}
                    onSettingsUpdate={setSettings}
                  />
                </DialogContent>
              </Dialog>

              {/* Export */}
              <Tooltip delayDuration={500}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleExportClick}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 md:h-9 md:w-9"
                  >
                    <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export Transactions</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        }
      />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="lg:max-w-2xl">
          <TransactionEntryForm
            editingEntry={editingEntry}
            setData={setData}
            close={() => setIsEditDialogOpen(false)}
            settings={settings}
            onSettingsUpdate={setSettings}
          />
        </DialogContent>
      </Dialog>

      <ExportTransactionDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        onExport={handlePerformExport}
        defaultDateFormat={
          settings?.importTransactionSettings?.mapFields?.dateFormat || "PP"
        }
      />
    </>
  );
}

export default TransactionTable;

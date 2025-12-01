import { useState, useCallback, useMemo } from "react";

export function useTable({ data, initialLimit = 10 }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Reset selection when data changes or page changes (optional, depending on UX)
  // For now, we'll keep selection across pages if needed, but usually it's per page.
  // The original implementation seemed to reset on delete.

  const paginatedData = useMemo(() => {
    if (!data) return [];
    const skip = (page - 1) * limit;
    return data.slice(skip, skip + limit);
  }, [data, page, limit]);

  const totalPages = useMemo(() => {
    return Math.ceil((data?.length || 0) / limit);
  }, [data, limit]);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
    // Reset selection on page change? Usually yes for simple tables.
    setSelectedRows([]);
    setSelectAll(false);
  }, []);

  const handleLimitChange = useCallback(
    (newLimit) => {
      setLimit(newLimit === "all" ? data?.length || 0 : Number(newLimit));
      setPage(1);
      setSelectedRows([]);
      setSelectAll(false);
    },
    [data]
  );

  const toggleSelectAll = useCallback(
    (checked) => {
      setSelectAll(checked);
      if (checked) {
        // Select all rows on the CURRENT PAGE
        // We need to know the indices relative to the global data or local page?
        // The original implementation used indices relative to the global data for deletion,
        // but the checkbox state was often managed with local indices or global.
        // Let's stick to returning global indices for consistency with deleteRow action.

        // Wait, paginatedData doesn't have global index unless we add it.
        // But we can calculate it.

        // Actually, let's look at how the original code did it.
        // MappedDataTable: setSelectedRows(data.map((_, i) => (page - 1) * limit + i));
        // TransformedDataTable: setSelectedRows(data.map((_, i) => i)); // This looks like local index?
        // Let's standardize on GLOBAL indices for selection to make deletion easier.

        // However, if we filter/sort, global index might change.
        // But here we are just slicing.

        // Let's pass the current page's global indices.
        const start = (page - 1) * limit;
        const currentIndices = Array.from(
          { length: paginatedData.length },
          (_, i) => start + i
        );
        setSelectedRows(currentIndices);
      } else {
        setSelectedRows([]);
      }
    },
    [page, limit, paginatedData]
  );

  const toggleSelectRow = useCallback((globalIndex, checked) => {
    setSelectedRows((prev) => {
      if (checked) return [...prev, globalIndex];
      return prev.filter((i) => i !== globalIndex);
    });
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedRows([]);
    setSelectAll(false);
  }, []);

  return {
    page,
    limit,
    selectedRows,
    selectAll,
    paginatedData,
    totalPages,
    handlePageChange,
    handleLimitChange,
    toggleSelectAll,
    toggleSelectRow,
    resetSelection,
    setPage, // Expose if needed
  };
}

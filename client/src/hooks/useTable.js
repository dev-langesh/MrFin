import { useState, useCallback, useMemo } from "react";

export function useTable({ data, initialLimit = 10 }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

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
    setPage,
  };
}

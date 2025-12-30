"use client";

import React, { useState, useEffect } from "react";
import {
  Pagination as UIPagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  total,
  limit,
  currentPage,
  handlePageChange,
  maxVisiblePages = 5,
}) {
  const [visiblePagesCount, setVisiblePagesCount] = useState(maxVisiblePages);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setVisiblePagesCount(3);
      } else {
        setVisiblePagesCount(maxVisiblePages);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [maxVisiblePages]);

  const totalPages = Math.ceil(total / limit);

  if (totalPages === 0) return null;

  // Compute visible page numbers
  let startPage = Math.max(1, currentPage - Math.floor(visiblePagesCount / 2));
  let endPage = Math.min(totalPages, startPage + visiblePagesCount - 1);

  if (endPage - startPage + 1 < visiblePagesCount) {
    startPage = Math.max(1, endPage - visiblePagesCount + 1);
  }

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <UIPagination className="w-auto mx-0">
      <PaginationContent>
        {/* Previous */}
        <PaginationItem>
          <PaginationPrevious
            href="#"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) handlePageChange(currentPage - 1);
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </PaginationPrevious>
        </PaginationItem>

        {/* Page Numbers */}
        {pageNumbers.map((pageNum) => (
          <PaginationItem key={pageNum}>
            <PaginationLink
              href="#"
              isActive={pageNum === currentPage}
              size="icon"
              className="h-8 w-8 md:h-9 md:w-9 text-xs md:text-sm"
              onClick={(e) => {
                e.preventDefault();
                handlePageChange(pageNum);
              }}
            >
              {pageNum}
            </PaginationLink>
          </PaginationItem>
        ))}

        {/* Ellipsis if needed */}
        {endPage < totalPages && (
          <PaginationItem>
            <PaginationEllipsis className="h-8 w-8 md:h-9 md:w-9 flex items-center justify-center" />
          </PaginationItem>
        )}

        {/* Next */}
        <PaginationItem>
          <PaginationNext
            href="#"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) handlePageChange(currentPage + 1);
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </PaginationNext>
        </PaginationItem>
      </PaginationContent>
    </UIPagination>
  );
}

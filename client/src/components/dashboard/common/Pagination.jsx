"use client";

import React from "react";
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
  const totalPages = Math.ceil(total / limit);

  if (totalPages === 0) return null;

  // Compute visible page numbers
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
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
              onClick={(e) => {
                e.preventDefault();
                handlePageChange(pageNum);
              }}
                    className=""
            >
              {pageNum}
            </PaginationLink>
          </PaginationItem>
        ))}

        {/* Ellipsis if needed */}
        {endPage < totalPages && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {/* Next */}
        <PaginationItem>
          <PaginationNext
            href="#"
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

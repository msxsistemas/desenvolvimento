import { useState, useMemo, useCallback } from 'react';

export interface PaginationConfig {
  pageSize?: number;
  initialPage?: number;
}

export interface PaginationState<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  startIndex: number;
  endIndex: number;
}

export interface PaginationActions {
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

export function usePagination<T>(
  items: T[],
  config: PaginationConfig = {}
): PaginationState<T> & PaginationActions {
  const { pageSize: initialPageSize = 20, initialPage = 1 } = config;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page is valid
  const validPage = useMemo(() => {
    return Math.min(Math.max(1, currentPage), totalPages);
  }, [currentPage, totalPages]);

  // Paginated data
  const data = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, validPage, pageSize]);

  const startIndex = (validPage - 1) * pageSize + 1;
  const endIndex = Math.min(validPage * pageSize, totalItems);

  const goToPage = useCallback((page: number) => {
    const newPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(newPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSizeState(initialPageSize);
  }, [initialPage, initialPageSize]);

  return {
    data,
    currentPage: validPage,
    totalPages,
    totalItems,
    pageSize,
    hasNextPage: validPage < totalPages,
    hasPrevPage: validPage > 1,
    startIndex: totalItems > 0 ? startIndex : 0,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    reset,
  };
}

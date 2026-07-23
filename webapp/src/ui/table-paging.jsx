import React, { useMemo } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon,
  ChevronDoubleLeftIcon,
} from '@heroicons/react/20/solid';
import { Button } from './button';
import { clsx } from 'clsx';

export const TablePaging = ({
  handlePrevPage,
  handleNextPage,
  goToPage,
  totalPages,
  minPage,
  maxPage,
  currentPage,
  pageSize,
  resultCount,
  className,
}) => {
  const { minResult, maxResult } = useMemo(() => {
    const min = (currentPage - 1) * pageSize + 1;
    const max = Math.min(currentPage * pageSize, resultCount);
    return { minResult: min, maxResult: max };
  }, [currentPage, pageSize, resultCount]);

  return (
    <div
      className={clsx(
        'sticky bottom-0 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 dark:border-white/10 dark:bg-gray-600',
        className
      )}
    >
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
          onClick={handlePrevPage}
        >
          Previous
        </Button>
        <Button
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
          onClick={handleNextPage}
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Showing <span className="font-medium">{minResult}</span> to{' '}
            <span className="font-medium">{maxResult}</span> of{' '}
            <span className="font-medium">{resultCount}</span> results
          </p>
        </div>
        <div>
          <nav
            aria-label="Pagination"
            className="isolate inline-flex -space-x-px rounded-md shadow-xs dark:shadow-none"
          >
            <div
              onClick={() => goToPage(1)}
              className="w-10 cursor-pointer relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:inset-ring-gray-700 dark:hover:bg-white/5"
            >
              <span className="sr-only">First</span>
              <ChevronDoubleLeftIcon aria-hidden="true" className="size-5" />
            </div>
            <div
              className="w-10 cursor-pointer relative inline-flex items-center px-2 py-2 text-gray-400 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:inset-ring-gray-700 dark:hover:bg-white/5"
              onClick={handlePrevPage}
            >
              <span className="sr-only">Previous</span>
              <ChevronLeftIcon aria-hidden="true" className="size-5" />
            </div>
            {/* Current: "z-10 bg-indigo-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:focus-visible:outline-indigo-500", Default: "text-gray-900 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:outline-offset-0 dark:text-gray-200 dark:inset-ring-gray-700 dark:hover:bg-white/5" */}
            {Array.from(
              { length: maxPage - minPage + 1 },
              (_, i) => minPage + i
            ).map((page) => (
              <div
                key={page}
                onClick={() => goToPage(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                className={clsx(
                  'w-10 cursor-pointer relative inline-flex items-center justify-center',
                  page === currentPage
                    ? 'bg-blue-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:focus-visible:outline-blue-500'
                    : 'text-gray-900 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:outline-offset-0 dark:text-gray-200 dark:inset-ring-gray-700 dark:hover:bg-white/5'
                )}
              >
                {page}
              </div>
            ))}
            <div
              className="w-10 cursor-pointer relative inline-flex items-center px-2 py-2 text-gray-400 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:inset-ring-gray-700 dark:hover:bg-white/5"
              onClick={handleNextPage}
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon aria-hidden="true" className="size-5" />
            </div>
            <div
              className="w-10 cursor-pointer relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:inset-ring-gray-700 dark:hover:bg-white/5"
              onClick={() => goToPage(totalPages)}
            >
              <span className="sr-only">Last</span>
              <ChevronDoubleRightIcon aria-hidden="true" className="size-5" />
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

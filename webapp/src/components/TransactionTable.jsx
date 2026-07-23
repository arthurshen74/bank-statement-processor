import React, { useMemo, useState, useEffect } from 'react';
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDoubleLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { TablePaging } from '../ui/table-paging';

const TransactionTable = ({
  className,
  transactions,
  pageSize = 20,
  paginationItemCount = 10,
  selectable = false,
  selectedTransactions = [],
  onSelectionChange = () => {},
  onRowClick = null,
  onDeleteTransaction = null,
  showCategory = true,
  sortField = null,
  sortDirection = 'asc',
  onSortChange = null,
  ...props
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setTotalPages((prev) => {
      const newTotalPages = Math.ceil(transactions.length / pageSize);
      if (newTotalPages != prev) {
        setCurrentPage(1);
      }
      return newTotalPages;
    });
  }, [transactions, pageSize]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => {
        const amountToAdd =
          paginationItemCount -
          (prev < paginationItemCount ? prev : prev % paginationItemCount) +
          1;
        return Math.min(
          prev +
            (amountToAdd > paginationItemCount
              ? amountToAdd - paginationItemCount
              : amountToAdd),
          totalPages
        );
      });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => {
        const amountToSubtract = prev % paginationItemCount;
        return Math.max(
          prev -
            (amountToSubtract === 0 ? paginationItemCount : amountToSubtract),
          1
        );
      });
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const paginatedTransactions = useMemo(
    () =>
      transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [transactions, currentPage, pageSize]
  );

  // Check if ALL transactions are selected (across all pages)
  const allSelected =
    selectable &&
    transactions.length > 0 &&
    transactions.every((t) => selectedTransactions.includes(t.rowId));

  // Handle select all - selects/deselects ALL transactions across all pages
  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all transactions
      onSelectionChange([]);
    } else {
      // Select all transactions
      const allIds = transactions.map((t) => t.rowId);
      onSelectionChange(allIds);
    }
  };

  // Handle individual transaction selection
  const handleTransactionSelect = (rowId) => {
    if (selectedTransactions.includes(rowId)) {
      onSelectionChange(selectedTransactions.filter((id) => id !== rowId));
    } else {
      onSelectionChange([...selectedTransactions, rowId]);
    }
  };

  // Handle row click
  const handleRowClick = (transaction) => {
    if (onRowClick) {
      onRowClick(transaction);
    }
  };

  // Handle column header click for sorting
  const handleColumnSort = (field) => {
    if (onSortChange) {
      onSortChange(field);
    }
  };

  // Render sort indicator
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="inline h-4 w-4 ml-1" />
    ) : (
      <ChevronDownIcon className="inline h-4 w-4 ml-1" />
    );
  };

  const { minPage, maxPage } = useMemo(() => {
    // determine which pageWindow the currentPage is in
    const currentPageWindow = Math.floor(
      (currentPage - 1) / paginationItemCount
    );
    const minPage = currentPageWindow * paginationItemCount + 1;
    const maxPage = Math.min(minPage + paginationItemCount - 1, totalPages);
    return { minPage, maxPage };
  }, [currentPage, totalPages, paginationItemCount]);
  return (
    <div
      className={clsx(
        'bg-white rounded-lg shadow-sm border border-gray-400 relative overflow-x-auto dark:bg-transparent dark:border-gray-200',
        className
      )}
      {...props}
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-600 sticky top-0">
          <tr>
            {selectable && (
              <th className="px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer dark:text-blue-200"
                  title="Select/Deselect all transactions"
                />
              </th>
            )}
            <th
              onClick={() => onSortChange && handleColumnSort('date')}
              className={`px-3 py-2 text-left text-xs font-medium text-gray-200 uppercase tracking-wider ${
                onSortChange ? 'cursor-pointer hover:bg-gray-700' : ''
              }`}
            >
              Buchungsdatum
              {renderSortIndicator('date')}
            </th>
            {!selectable && (
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                Konto
              </th>
            )}
            {showCategory && (
              <th
                onClick={() => onSortChange && handleColumnSort('name')}
                className={`px-3 py-2 text-left text-xs font-medium text-gray-200 uppercase tracking-wider ${
                  onSortChange ? 'cursor-pointer hover:bg-gray-700' : ''
                }`}
              >
                Name
                {renderSortIndicator('name')}
              </th>
            )}
            <th
              onClick={() => onSortChange && handleColumnSort('description')}
              className={`px-3 py-2 text-left text-xs font-medium text-gray-200 uppercase tracking-wider ${
                onSortChange ? 'cursor-pointer hover:bg-gray-700' : ''
              }`}
            >
              Buchungstext
              {renderSortIndicator('description')}
            </th>
            {showCategory && (
              <th
                onClick={() => onSortChange && handleColumnSort('category')}
                className={`px-3 py-2 text-left text-xs font-medium text-gray-200 uppercase tracking-wider ${
                  onSortChange ? 'cursor-pointer hover:bg-gray-700' : ''
                }`}
              >
                Kategorie
                {renderSortIndicator('category')}
              </th>
            )}
            <th
              onClick={() => onSortChange && handleColumnSort('amount')}
              className={`px-3 py-2 text-right text-xs font-medium text-gray-200 uppercase tracking-wider ${
                onSortChange ? 'cursor-pointer hover:bg-gray-700' : ''
              }`}
            >
              Betrag
              {renderSortIndicator('amount')}
            </th>
            {onDeleteTransaction && (
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-200 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-400 dark:bg-transparent dark:divide-gray-200">
          {paginatedTransactions.map((transaction, idx) => (
            <tr
              key={idx}
              className={`hover:bg-blue-400/50 dark:hover:bg-blue-400/30 ${
                idx % 2 === 0
                  ? 'bg-white dark:bg-transparent'
                  : 'bg-indigo-200/50 dark:bg-gray-700'
              }`}
            >
              {selectable && (
                <td className="px-3 py-2 align-top">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.includes(transaction.rowId)}
                    onChange={() => handleTransactionSelect(transaction.rowId)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer dark:text-blue-200 dark:focus:ring-blue-300"
                  />
                </td>
              )}
              <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-200 align-top">
                {transaction.date.toLocaleDateString('de-DE')}
              </td>
              {!selectable && (
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-200 align-top capitalize">
                  {transaction.statementType || '-'}
                </td>
              )}
              {showCategory && (
                <td
                  className={`px-3 py-2 text-sm text-gray-900 dark:text-gray-200 align-top ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick && handleRowClick(transaction)}
                >
                  {transaction.name || '-'}
                </td>
              )}
              <td
                className={`px-3 py-2 text-sm text-gray-900 dark:text-gray-200 max-w-xs align-top ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick && handleRowClick(transaction)}
              >
                <div className="whitespace-pre-wrap break-words">
                  {transaction.description}
                </div>
              </td>
              {showCategory && (
                <td
                  className={`px-3 py-2 text-sm align-top ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick && handleRowClick(transaction)}
                >
                  {transaction.category ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-600 text-white">
                      {transaction.category}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-full px-2 py-1 rounded text-xs font-medium text-gray-200 bg-red-600/50">
                      -
                    </span>
                  )}
                </td>
              )}
              <td
                className={`px-3 py-2 text-sm text-right align-top ${
                  transaction.amount < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {`${transaction.amount.toFixed(2).replace('.', ',')} €`}
              </td>
              {onDeleteTransaction && (
                <td className="px-3 py-2 text-center align-top">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTransaction(transaction);
                    }}
                    className="cursor-pointer inline-flex items-center justify-center p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                    title="Delete transaction"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <TablePaging
        handlePrevPage={handlePrevPage}
        handleNextPage={handleNextPage}
        goToPage={goToPage}
        totalPages={totalPages}
        minPage={minPage}
        maxPage={maxPage}
        currentPage={currentPage}
        pageSize={pageSize}
        resultCount={transactions.length}
        className="absolute bottom-0 left-0 right-0"
      />
    </div>
  );
};

export default TransactionTable;

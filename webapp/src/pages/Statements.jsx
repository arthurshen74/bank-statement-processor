import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading } from '../ui/heading';
import { Button } from '../ui/button';
import { useStatementsData } from '../hooks/useStatementsData';
import { useStatementFilters } from '../hooks/useStatementFilters';
import {
  TrashIcon,
  DocumentTextIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/20/solid';
import { Select } from '../ui/select';
import {
  Dialog,
  DialogActions,
  DialogDescription,
  DialogTitle,
  DialogBody,
} from '../ui/dialog';

function Statements() {
  const {
    statements,
    loading,
    error,
    selectedIds,
    deleting,
    loadStatements,
    toggleSelection,
    deleteStatement,
    addStatementSelections,
    clearSelection,
  } = useStatementsData();

  const {
    filteredAndSortedStatements,
    filteredCount,
    sortField,
    sortDirection,
    handleSortChange,
    statementTypeFilter,
    setStatementTypeFilter,
    statementYearFilter,
    setStatementYearFilter,
    availableYears,
    hasActiveFilters,
    clearFilters,
  } = useStatementFilters(statements);

  const navigate = useNavigate();

  // Delete confirmation state for single deletion
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [totalToDelete, setTotalToDelete] = useState(0);

  // Bulk delete state
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleDelete = (statement) => {
    setDeleteConfirm(statement);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteStatement(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete statement:', err);
      // Error is already handled by deleteStatement
    }
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteDialog(true);
  };

  const confirmBulkDelete = async () => {
    setTotalToDelete(selectedIds.size);
    setIsBulkDeleting(true);
    setBulkDeleteProgress(0);

    const idsToDelete = Array.from(selectedIds);

    for (let i = 0; i < idsToDelete.length; i++) {
      try {
        await deleteStatement(idsToDelete[i]);
        setBulkDeleteProgress((prev) => prev + 1);
      } catch (err) {
        console.error(`Failed to delete statement ${idsToDelete[i]}:`, err);
        // Continue with next deletion even if one fails
      }
    }

    // Reset state after completion
    setIsBulkDeleting(false);
    setBulkDeleteProgress(0);
    setShowBulkDeleteDialog(false);
  };

  const handleViewSelected = () => {
    // Navigate to StatementViewer with statement IDs passed via state
    // BACKWARD COMPATIBILITY NOTE: This passes selected statement IDs to StatementViewer
    // which fetches and adapts the data for TransactionResults. Once TransactionResults
    // is migrated to work directly with MongoDB data, this navigation can be simplified.
    navigate('/statements/view', {
      state: {
        statementIds: Array.from(selectedIds),
      },
    });
  };

  const selectAllStatements = useCallback(() => {
    const allIds = filteredAndSortedStatements.map((s) => s.id);
    addStatementSelections(allIds);
  }, [filteredAndSortedStatements, addStatementSelections]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const getStatementTypeLabel = (type) => {
    switch (type?.toLowerCase()) {
      case 'girokonto':
        return 'Bank Account';
      case 'kreditkarte':
        return 'Credit Card';
      default:
        return type || 'Unknown';
    }
  };

  const getStatementTypeBadgeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'girokonto':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'kreditkarte':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Heading>Statements</Heading>
        <div className="mt-8 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Heading>Statements</Heading>
        <div className="mt-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-400 font-medium">Error</p>
          <p className="text-red-600 dark:text-red-500 text-sm mt-1">{error}</p>
          <Button onClick={loadStatements} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Heading>Statements</Heading>
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <div
              onClick={handleViewSelected}
              className="flex items-center rounded-lg cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-3 py-2"
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              <span className="leading-6">
                View Selected ({selectedIds.size})
              </span>
            </div>
            <div
              onClick={handleBulkDelete}
              className="flex items-center rounded-lg cursor-pointer bg-red-600 hover:bg-red-700 text-white px-3 py-2"
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              <span className="leading-6">
                Delete Selected ({selectedIds.size})
              </span>
            </div>
          </div>
        )}
      </div>

      {statements.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
          <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Statements Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Upload PDF statements from the Ingest menu to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Filters and Sort Controls */}
          <div className="mb-6 space-y-4">
            {/* Filters and Sort Controls */}
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type:
                </label>
                <Select
                  value={statementTypeFilter}
                  onChange={(e) => setStatementTypeFilter(e.target.value)}
                  className="w-40"
                >
                  <option value="all">All Types</option>
                  <option value="girokonto">Bank Account</option>
                  <option value="kreditkarte">Credit Card</option>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Year:
                </label>
                <Select
                  value={statementYearFilter}
                  onChange={(e) => setStatementYearFilter(e.target.value)}
                  className="w-32"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Select>
              </div>

              {hasActiveFilters && (
                <Button onClick={clearFilters} plain color="blue">
                  <span className="text-blue-600 hover:underline dark:text-blue-400">
                    Clear Filters
                  </span>
                </Button>
              )}

              {/* Sorting */}
              <div className="flex justify-start items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort by:
                </span>
                <Button
                  plain
                  onClick={() => handleSortChange('statementDate')}
                  className="text-sm"
                >
                  Statement Date
                  {sortField === 'statementDate' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUpIcon className="inline h-4 w-4 ml-1" />
                    ) : (
                      <ChevronDownIcon className="inline h-4 w-4 ml-1" />
                    ))}
                </Button>
                <Button
                  plain
                  onClick={() => handleSortChange('ingestDate')}
                  className="text-sm"
                >
                  Ingest Date
                  {sortField === 'ingestDate' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUpIcon className="inline h-4 w-4 ml-1" />
                    ) : (
                      <ChevronDownIcon className="inline h-4 w-4 ml-1" />
                    ))}
                </Button>
                <Button
                  plain
                  onClick={() => handleSortChange('numberOfTransactions')}
                  className="text-sm"
                >
                  Transactions
                  {sortField === 'numberOfTransactions' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUpIcon className="inline h-4 w-4 ml-1" />
                    ) : (
                      <ChevronDownIcon className="inline h-4 w-4 ml-1" />
                    ))}
                </Button>
              </div>

              <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredCount} of {statements.length} statement
                {statements.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Select All and Statement Count */}
          <div className="mb-4 flex items-center justify-start">
            {selectedIds.size < 1 ? (
              <div
                onClick={selectAllStatements}
                className="cursor-pointer text-gray-600 leading-6 dark:text-white hover:underline hover:text-blue-600 dark:hover:text-blue-400 text-sm"
              >
                Select All
              </div>
            ) : (
              <div
                onClick={clearSelection}
                className="cursor-pointer text-gray-600 leading-6 dark:text-white hover:underline hover:text-blue-600 dark:hover:text-blue-400 text-sm"
              >
                Clear Selections ({selectedIds.size})
              </div>
            )}
          </div>

          {filteredAndSortedStatements.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
              <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Statements Match Filters
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Try adjusting your filters to see more results.
              </p>
              <Button onClick={clearFilters} color="blue">
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedStatements.map((statement) => (
                <div
                  key={statement.id}
                  className={`cursor-pointer relative border rounded-lg p-4 transition-all ${
                    selectedIds.has(statement.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                      : 'border-gray-400 bg-white hover:border-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => toggleSelection(statement.id)}
                      className={`cursor-pointer h-6 w-6 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedIds.has(statement.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-400 dark:border-gray-600 hover:border-blue-500'
                      }`}
                    >
                      {selectedIds.has(statement.id) && (
                        <CheckIcon className="h-4 w-4 text-white" />
                      )}
                    </button>
                  </div>

                  {/* Statement Type Badge */}
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatementTypeBadgeColor(
                        statement.statementType
                      )}`}
                    >
                      {getStatementTypeLabel(statement.statementType)}
                    </span>
                  </div>

                  {/* File Name */}
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 pr-8 break-words">
                    {statement.fileName}
                  </h3>

                  {/* Statement Details */}
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span className="font-medium">Provider:</span>
                      <span className="capitalize">
                        {statement.statementProvider}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Statement Year:</span>
                      <span>{statement.statementYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Statement Date:</span>
                      <span>{formatDate(statement.statementDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Transactions:</span>
                      <span>{statement.numberOfTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Pages:</span>
                      <span>{statement.pageCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Ingested:</span>
                      <span>{formatDate(statement.ingestDate)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700 flex justify-end">
                    <button
                      onClick={() => handleDelete(statement)}
                      disabled={deleting.has(statement.id)}
                      className="cursor-pointer text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete statement"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Single Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Statement</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete "{deleteConfirm?.fileName}"? This
          action cannot be undone.
        </DialogDescription>
        <DialogActions>
          <Button
            plain
            onClick={() => setDeleteConfirm(null)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={confirmDelete}
            className="cursor-pointer"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={showBulkDeleteDialog}
        size="lg"
        onClose={() => setShowBulkDeleteDialog(false)}
      >
        <DialogTitle>Delete Multiple Statements</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete {selectedIds.size} statement
          {selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.
        </DialogDescription>

        <DialogBody>
          {/* File List */}
          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {Array.from(selectedIds).map((id) => {
                const statement = statements.find((s) => s.id === id);
                return statement ? (
                  <li key={id} className="truncate" title={statement.fileName}>
                    • {statement.fileName}
                  </li>
                ) : null;
              })}
            </ul>
          </div>

          {/* Progress Indicator */}
          {isBulkDeleting && (
            <div className="mt-4 space-y-2 max-w-lg">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Deleting statements...</span>
                <span>
                  {bulkDeleteProgress} of {totalToDelete} completed
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${(bulkDeleteProgress / totalToDelete) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogActions>
          <Button
            plain
            onClick={() => setShowBulkDeleteDialog(false)}
            disabled={isBulkDeleting}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={confirmBulkDelete}
            disabled={isBulkDeleting}
            className="cursor-pointer"
          >
            {isBulkDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Statements;

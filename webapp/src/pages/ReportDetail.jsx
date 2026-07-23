import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heading } from '../ui/heading';
import { Button } from '../ui/button';
import { Field, Label } from '../ui/fieldset';
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from '../ui/dropdown';
import { Text } from '../ui/text';
import { transactionReportsApi } from '../api/transactionReports';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import ConfirmationDialog from '../components/ConfirmationDialog';
import CategoryAssignmentBulkModal from '../components/categorization/CategoryAssignmentBulkModal';
import AutoCategorizeBulkModal from '../components/categorization/AutoCategorizeBulkModal';
import TransactionDetailModal from '../components/TransactionDetailModal';
import DuplicateTransaction from '../components/DuplicateTransaction';
import TransactionNameAssignmentBulkModal from '../components/naming/TransactionNameAssignmentBulkModal';
import EuerReportDialog from '../components/reports/EuerReportDialog';
import AutoAssignNamesModal from '../components/namingRules/AutoAssignNamesModal';
import UpdateReportModal from '../components/reports/UpdateReportModal';
import { CategorizationStats } from '../components/reports/CategorizationStats';
import { exportReportTransactions } from '../utils/exportData';
import { useReportData } from '../hooks/useReportData';
import { useModalManager } from '../hooks/useModalManager';
import { useReportFilters } from '../hooks/useReportFilters';
import { useReportStatistics } from '../hooks/useReportStatistics';
import { useBulkOperations } from '../hooks/useBulkOperations';
import { ReportDetailProvider } from '../contexts/ReportDetailContext';
import TransactionView from '../components/reports/TransactionView';
import ReportView from '../components/reports/ReportView';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // View state: 'transaction' or 'report'
  const [currentView, setCurrentView] = useState('report');
  const toggleViewState = () =>
    setCurrentView((prev) => (prev === 'report' ? 'transaction' : 'report'));

  // Use custom hooks
  const { summary, loading, error, setError, refreshReport } =
    useReportData(id);

  console.log('Report:', summary);

  const modals = useModalManager([
    'deleteReport',
    'deleteTransaction',
    'bulkDelete',
    'deleteTransactionsInCategory',
    'categorize',
    'bulkCategorize',
    'bulkName',
    'autoCategorize',
    'autoAssignNames',
    'euer',
    'transactionDetail',
    'updateReport',
    'duplicateTransaction',
  ]);

  // Use bulk operations hook
  const bulkOps = useBulkOperations();

  // TransactionDetailModal state
  const [transactionDetailMode, setTransactionDetailMode] = useState('edit');

  // Convert API transactions to format expected by TransactionTable
  const normalizedTransactions = useMemo(
    () =>
      summary?.transactions.map((t, index) => ({
        id: t.id,
        rowId: index + 1,
        date: new Date(t.date),
        name: t.name,
        description: t.description,
        amount: t.amount,
        statementType: t.statementType,
        category: t.category,
      })) || [],
    [summary]
  );

  // Use filter hook
  const {
    selectedTransactionIds,
    setSelectedTransactionIds,
    showUncategorizedOnly,
    setShowUncategorizedOnly,
    showUnnamedOnly,
    setShowUnnamedOnly,
    setDescriptionFilter,
    selectedKonto,
    setSelectedKonto,
    selectedCategories,
    setSelectedCategories,
    resetKey,
    kontoTypes,
    sortField,
    sortDirection,
    handleSortChange,
    filteredAndSortedTransactions,
    hasActiveFilters,
    clearFilters,
  } = useReportFilters(normalizedTransactions);

  // Use statistics hook
  const {
    categorizationStats,
    namingStats,
    getGaugeColor,
    getThermometerColor,
  } = useReportStatistics(normalizedTransactions);

  const [showStatistics, setShowStatistics] = useState(false);

  // Delete report
  const handleDeleteClick = () => {
    modals.open('deleteReport');
  };

  const confirmDelete = async () => {
    setError('');
    modals.close('deleteReport');
    try {
      await transactionReportsApi.deleteReport(id);
      navigate('/reports');
    } catch (err) {
      setError(`Failed to delete report: ${err.message}`);
    }
  };

  // Update report
  const handleUpdateClick = () => {
    modals.open('updateReport', summary.report);
  };

  const confirmUpdate = async (updatedReport) => {
    setError('');
    try {
      await transactionReportsApi.updateReport(updatedReport.id, {
        name: updatedReport.name,
        description: updatedReport.description,
      });
      modals.close('updateReport');
      await refreshReport();
    } catch (err) {
      setError(`Failed to update report: ${err.message}`);
    }
  };
  // Transaction click handlers
  const handleTransactionClick = (transaction) => {
    setTransactionDetailMode('edit');
    modals.open('transactionDetail', transaction);
  };

  const handleDuplicateTransaction = (transaction) => {
    modals.open('duplicateTransaction', transaction);
  };

  const handleAddTransaction = () => {
    setTransactionDetailMode('add');
    modals.open('transactionDetail', null);
  };

  const handleTransactionDetailComplete = async () => {
    modals.close('transactionDetail');
    await refreshReport();
  };

  // Single transaction deletion
  const handleDeleteTransaction = (transaction) => {
    modals.open('deleteTransaction', transaction);
  };

  const confirmDeleteTransaction = async () => {
    const transaction = modals.getData('deleteTransaction');
    if (!transaction) return;

    setError('');
    modals.close('deleteTransaction');

    try {
      await transactionReportsApi.deleteTransaction(transaction.id);
      await refreshReport();
    } catch (err) {
      setError(`Failed to delete transaction: ${err.message}`);
    }
  };

  // Bulk operations
  const handleBulkDelete = () => {
    if (selectedTransactionIds.length === 0) return;
    modals.open('bulkDelete');
  };

  const confirmBulkDelete = async () => {
    if (selectedTransactionIds.length === 0) return;

    setError('');
    modals.close('bulkDelete');

    // Get transactions to delete
    const transactionsToDelete = selectedTransactionIds
      .map((rowId) => normalizedTransactions.find((t) => t.rowId === rowId))
      .filter(Boolean);

    // Execute bulk delete operation
    await bulkOps.executeBulkOperation(
      transactionsToDelete,
      async (transaction) => {
        await transactionReportsApi.deleteTransaction(transaction.id);
      },
      {
        onComplete: async (results) => {
          // Reload and reset selection
          try {
            await refreshReport();
            setSelectedTransactionIds([]);

            if (results.errors.length > 0) {
              setError(
                `Deleted ${results.successCount} transaction(s), but ${
                  results.errors.length
                } failed. ${results.errors.join('; ')}`
              );
            }
          } catch (err) {
            setError(
              `Deleted ${results.successCount} transaction(s), but failed to refresh: ${err.message}`
            );
          }
        },
      }
    );
  };

  const handleBulkCategorize = () => {
    if (selectedTransactionIds.length === 0) return;
    modals.open('bulkCategorize');
  };

  const handleBulkCategorizationComplete = async () => {
    modals.close('bulkCategorize');
    await refreshReport();
    setSelectedTransactionIds([]);
  };

  const handleAutoCategorize = () => {
    if (selectedTransactionIds.length === 0) return;
    modals.open('autoCategorize');
  };

  const handleAutoCategorizeComplete = async () => {
    modals.close('autoCategorize');
    await refreshReport();
    setSelectedTransactionIds([]);
  };

  const handleBulkNameAssignment = () => {
    if (selectedTransactionIds.length === 0) return;
    modals.open('bulkName');
  };

  const handleBulkNameAssignmentComplete = async () => {
    modals.close('bulkName');
    await refreshReport();
    setSelectedTransactionIds([]);
  };

  const handleAutoAssignNames = () => {
    if (selectedTransactionIds.length === 0) return;
    modals.open('autoAssignNames');
  };

  const handleAutoAssignNamesComplete = async () => {
    modals.close('autoAssignNames');
    await refreshReport();
    setSelectedTransactionIds([]);
  };

  const handleExportToExcel = () => {
    exportReportTransactions(
      filteredAndSortedTransactions,
      summary.report.name
    );
  };

  // Delete all transactions in a category
  const handleDeleteTransactionsInCategory = (categoryName, transactions) => {
    modals.open('deleteTransactionsInCategory', { categoryName, transactions });
  };

  const confirmDeleteTransactionsInCategory = async () => {
    const data = modals.getData('deleteTransactionsInCategory');
    if (!data || !data.transactions) return;

    setError('');
    modals.close('deleteTransactionsInCategory');

    // Execute bulk delete operation with progress
    await bulkOps.executeBulkOperation(
      data.transactions,
      async (transaction) => {
        await transactionReportsApi.deleteTransaction(transaction.id);
      },
      {
        onComplete: async (results) => {
          // Reload
          try {
            await refreshReport();

            if (results.errors.length > 0) {
              setError(
                `Deleted ${
                  results.successCount
                } transaction(s) from category "${data.categoryName}", but ${
                  results.errors.length
                } failed. ${results.errors.join('; ')}`
              );
            }
          } catch (err) {
            setError(
              `Deleted ${results.successCount} transaction(s) from category "${data.categoryName}", but failed to refresh: ${err.message}`
            );
          }
        },
      }
    );
  };

  // Formatting helpers
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-2 max-w-7xl mx-auto">
        <div className="mb-6">
          <Heading>Loading Report...</Heading>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <div className="ml-3 text-gray-600">Loading report details...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !summary) {
    return (
      <div className="p-2 max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <Button
            outline
            onClick={() => navigate('/reports')}
            className="cursor-pointer"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Reports
          </Button>
          <Heading>Error Loading Report</Heading>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm text-red-600">{error}</span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  // Context value for provider
  const contextValue = {
    normalizedTransactions,
    filteredAndSortedTransactions,
    selectedTransactionIds,
    setSelectedTransactionIds,
    showUncategorizedOnly,
    setShowUncategorizedOnly,
    showUnnamedOnly,
    setShowUnnamedOnly,
    setDescriptionFilter,
    selectedKonto,
    setSelectedKonto,
    selectedCategories,
    setSelectedCategories,
    resetKey,
    kontoTypes,
    sortField,
    sortDirection,
    handleSortChange,
    hasActiveFilters,
    clearFilters,
    handleAddTransaction,
    handleTransactionClick,
    handleDeleteTransaction,
    handleDeleteTransactionsInCategory,
    handleDuplicateTransaction,
    handleBulkNameAssignment,
    handleAutoAssignNames,
    handleAutoCategorize,
    handleBulkCategorize,
    handleBulkDelete,
    toggleViewState,
    bulkOps,
  };

  return (
    <ReportDetailProvider value={contextValue}>
      <div className="py-3 max-w-7xl mx-auto flex flex-col gap-4 justify-start items-stretch h-screen max-h-screen">
        {/* Header */}
        <div className="flex items-start justify-between">
          <Heading className="flex gap-2 items-center justify-start">
            <Button
              outline
              onClick={() => navigate('/reports')}
              className="cursor-pointer"
            >
              <Text>Reports</Text>
            </Button>
            <Text>/</Text>
            <Dropdown>
              <DropdownButton outline>
                <Text>{summary.report.name}</Text>
                <EllipsisVerticalIcon />
              </DropdownButton>
              <DropdownMenu>
                <DropdownItem onClick={handleUpdateClick}>Modify</DropdownItem>
                {currentView === 'report' && (
                  <DropdownItem onClick={() => modals.open('euer')}>
                    PDF Export
                  </DropdownItem>
                )}
                {currentView === 'transaction' && (
                  <DropdownItem onClick={handleExportToExcel}>
                    Excel Export
                  </DropdownItem>
                )}
                <DropdownItem onClick={handleDeleteClick}>Delete</DropdownItem>
              </DropdownMenu>
            </Dropdown>
            <Text>/</Text>
            <Text>
              {currentView === 'report' ? 'Report View' : 'Transaction View'}
            </Text>
            <Button plain onClick={toggleViewState} className="cursor-pointer">
              <span className="text-blue-600 dark:text-blue-200 hover:underline hover:font-bold">
                change
              </span>
            </Button>
          </Heading>
          <div className="grid grid-cols-4 gap-4">
            <Field>
              <Label>Einnahme</Label>
              <Text>{formatCurrency(summary.totalIncome)}</Text>
            </Field>
            <Field>
              <Label>Ausgabe</Label>
              <Text>{formatCurrency(summary.totalExpenses)}</Text>
            </Field>
            <Field>
              <Label>Saldo</Label>
              <Text>
                {summary.netTotal >= 0 ? '+' : ''}
                {formatCurrency(summary.netTotal)}
              </Text>
            </Field>
            <Field>
              <Button onClick={() => setShowStatistics((prev) => !prev)} plain>
                <span className="text-sm text-blue-600 dark:text-blue-200 hover:underline hover:font-bold">
                  {showStatistics ? 'less' : 'more'}
                </span>
              </Button>
            </Field>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        {/* Categorization Status */}
        {showStatistics && (
          <CategorizationStats
            categorizationStats={categorizationStats}
            namingStats={namingStats}
            getGaugeColor={getGaugeColor}
            getThermometerColor={getThermometerColor}
          />
        )}

        {/* Conditional View Rendering */}
        <div className="flex-1 overflow-y-auto">
          {currentView === 'transaction' ? <TransactionView /> : <ReportView />}
        </div>

        {/* Delete Report Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={modals.isOpen('deleteReport')}
          onClose={() => modals.close('deleteReport')}
          onConfirm={confirmDelete}
          title="Delete Report"
          message={`Are you sure you want to delete "${
            summary?.report.name
          }"? This will also delete all ${
            summary?.totalTransactions || 0
          } linked transaction(s).`}
          confirmText="Delete Report"
          cancelText="Cancel"
          variant="danger"
        />

        {/* Delete Transaction Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={modals.isOpen('deleteTransaction')}
          onClose={() => modals.close('deleteTransaction')}
          onConfirm={confirmDeleteTransaction}
          title="Delete Transaction"
          message={`Are you sure you want to delete this transaction: "${
            modals.getData('deleteTransaction')?.description || ''
          }" (${
            modals.getData('deleteTransaction')?.amount
              ? new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(modals.getData('deleteTransaction').amount)
              : ''
          })?`}
          confirmText="Delete Transaction"
          cancelText="Cancel"
          variant="danger"
        />

        {/* Bulk Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={modals.isOpen('bulkDelete')}
          onClose={() => modals.close('bulkDelete')}
          onConfirm={confirmBulkDelete}
          title="Delete Multiple Transactions"
          message={`Are you sure you want to delete ${selectedTransactionIds.length} selected transaction(s)? This action cannot be undone.`}
          confirmText={`Delete ${selectedTransactionIds.length} Transaction${
            selectedTransactionIds.length > 1 ? 's' : ''
          }`}
          cancelText="Cancel"
          variant="danger"
        />

        {/* Delete All Transactions in Category Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={modals.isOpen('deleteTransactionsInCategory')}
          onClose={() => modals.close('deleteTransactionsInCategory')}
          onConfirm={confirmDeleteTransactionsInCategory}
          title="Delete All Transactions in Category"
          message={`Are you sure you want to delete all ${
            modals.getData('deleteTransactionsInCategory')?.transactions
              ?.length || 0
          } transaction(s) in category "${
            modals.getData('deleteTransactionsInCategory')?.categoryName || ''
          }"? This action cannot be undone.`}
          confirmText={`Delete ${
            modals.getData('deleteTransactionsInCategory')?.transactions
              ?.length || 0
          } Transaction${
            (modals.getData('deleteTransactionsInCategory')?.transactions
              ?.length || 0) > 1
              ? 's'
              : ''
          }`}
          cancelText="Cancel"
          variant="danger"
        />

        {/* Bulk Category Assignment Modal */}
        <CategoryAssignmentBulkModal
          isOpen={modals.isOpen('bulkCategorize')}
          onClose={() => modals.close('bulkCategorize')}
          selectedTransactions={normalizedTransactions.filter((t) =>
            selectedTransactionIds.includes(t.rowId)
          )}
          onComplete={handleBulkCategorizationComplete}
        />

        {/* Bulk Name Assignment Modal */}
        <TransactionNameAssignmentBulkModal
          isOpen={modals.isOpen('bulkName')}
          onClose={() => modals.close('bulkName')}
          selectedTransactions={normalizedTransactions.filter((t) =>
            selectedTransactionIds.includes(t.rowId)
          )}
          onComplete={handleBulkNameAssignmentComplete}
        />

        {/* Auto Categorize Bulk Modal */}
        <AutoCategorizeBulkModal
          isOpen={modals.isOpen('autoCategorize')}
          onClose={() => modals.close('autoCategorize')}
          selectedTransactions={normalizedTransactions.filter((t) =>
            selectedTransactionIds.includes(t.rowId)
          )}
          onComplete={handleAutoCategorizeComplete}
        />

        {/* Auto Assign Names Modal */}
        <AutoAssignNamesModal
          isOpen={modals.isOpen('autoAssignNames')}
          onClose={() => modals.close('autoAssignNames')}
          selectedTransactions={normalizedTransactions.filter((t) =>
            selectedTransactionIds.includes(t.rowId)
          )}
          onComplete={handleAutoAssignNamesComplete}
        />

        {/* Transaction Detail Modal */}
        <TransactionDetailModal
          isOpen={modals.isOpen('transactionDetail')}
          onClose={() => modals.close('transactionDetail')}
          mode={transactionDetailMode}
          transaction={modals.getData('transactionDetail')}
          reportId={id}
          onComplete={handleTransactionDetailComplete}
        />

        {/* Duplicate Transaction Modal */}
        <DuplicateTransaction
          isOpen={modals.isOpen('duplicateTransaction')}
          onClose={() => modals.close('duplicateTransaction')}
          transaction={modals.getData('duplicateTransaction')}
        />

        {/* EÜR Report Dialog */}
        <EuerReportDialog
          isOpen={modals.isOpen('euer')}
          onClose={() => modals.close('euer')}
          transactions={normalizedTransactions}
          reportName={summary.report.name}
        />

        {/* Update Report Modal */}
        <UpdateReportModal
          isOpen={modals.isOpen('updateReport')}
          report={summary.report}
          onClose={() => modals.close('updateReport')}
          onUpdate={confirmUpdate}
          loading={loading}
        />
      </div>
    </ReportDetailProvider>
  );
};

export default ReportDetail;

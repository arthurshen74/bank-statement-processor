import React, { useState } from 'react';
import { Modal } from '../Modal';
import { exportData } from '../../utils/exportData';
import TransactionTable from '../TransactionTable';
import SummaryCard from '../SummaryCard';
import AutoSelectModal from '../categorization/AutoSelectModal';
import TransactionFilters from './TransactionFilters';
import TransactionActions from './TransactionActions';
import ReportWorkflow from './ReportWorkflow';
import { useTransactionData } from '../../hooks/useTransactionData';
import { useTransactionFilters } from '../../hooks/useTransactionFilters';
import { useReportWorkflow } from '../../hooks/useReportWorkflow';
import { useAuthenticatedImage } from '../../hooks/useAuthenticatedImage';
import { getStatementConfig } from './config';
import { ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

/**
 * Helper component to load and display authenticated images
 */
const AuthenticatedImage = ({ fileId, alt, className, style }) => {
  const { imageUrl, loading, error } = useAuthenticatedImage(fileId);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={style}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 border border-red-200 rounded p-4"
        style={style}
      >
        <p className="text-sm text-red-600">Failed to load image: {error}</p>
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return <img src={imageUrl} alt={alt} className={className} style={style} />;
};

/**
 * Unified TransactionResults component for both girokonto and kreditkarte statements
 * Supports viewing mixed statement types together - each transaction knows its own type
 * @param {Object} results - Results object containing normalized statements from MongoDB
 */
const TransactionResults = ({ results }) => {
  // Page modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const [showCroppedView, setShowCroppedView] = useState(true);
  const [selectedStatementIndex, setSelectedStatementIndex] = useState(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState(null);

  // Auto-select modal state
  const [showAutoSelect, setShowAutoSelect] = useState(false);

  // Use custom hooks for data processing
  const {
    statements,
    allTransactions,
    normalizedTransactions,
    getSelectedTransactionDetails,
  } = useTransactionData(results);

  // Use custom hooks for filtering and sorting
  const {
    selectedTransactions,
    setSelectedTransactions,
    transactionType,
    setTransactionType,
    sortField,
    sortDirection,
    handleSortChange,
    showSelectedOnly,
    setShowSelectedOnly,
    descriptionFilter,
    setDescriptionFilter,
    resetKey,
    filteredAndSortedTransactions,
    clearFilters,
  } = useTransactionFilters(normalizedTransactions);

  // Use custom hooks for report workflow
  const {
    showConfirmation,
    showCreateReport,
    showSelectReport,
    reports,
    loadingReports,
    pendingReport,
    processing,
    error,
    handleCreateNewReport,
    handleLinkToExisting,
    handleCreateReport,
    handleSelectReport,
    handleConfirmLink,
    handleCloseConfirmation,
    handleCloseCreateReport,
    handleCloseSelectReport,
  } = useReportWorkflow(getSelectedTransactionDetails);

  // Handle transaction selection change
  const handleSelectionChange = (newSelection) => {
    setSelectedTransactions(newSelection);
  };

  // Open page modal
  const openPageModal = (page, statementIndex, pageIndex) => {
    console.log(
      'Opening page modal for statement index:',
      statementIndex,
      'page index:',
      pageIndex
    );
    console.log('Page data:', page);
    const statement = statements[statementIndex];
    const statementType =
      statement?.statementType?.toLowerCase() || 'girokonto';
    const config = getStatementConfig(statementType);

    setSelectedPage(page);
    setSelectedStatementIndex(statementIndex);
    setSelectedPageIndex(pageIndex);
    setModalOpen(true);
    // Default to cropped view if available for this statement type
    setShowCroppedView(config.hasCroppedView && !!page.croppedImageFileId);
  };

  // Close page modal
  const closeModal = () => {
    setModalOpen(false);
    setSelectedPage(null);
  };

  if (!statements || statements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 relative">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Summary Card */}
      <SummaryCard
        statements={statements}
        transactions={allTransactions}
        onExport={exportData}
        onOpenPageModal={openPageModal}
        onAutoSelect={() => setShowAutoSelect(true)}
      />

      {/* Action buttons when transactions are selected */}
      <TransactionActions
        selectedCount={selectedTransactions.length}
        onClearSelection={() => setSelectedTransactions([])}
        onCreateNewReport={() => handleCreateNewReport(selectedTransactions)}
        onLinkToExisting={() => handleLinkToExisting(selectedTransactions)}
      />

      {/* Filter Controls */}
      <TransactionFilters
        descriptionFilter={descriptionFilter}
        onDescriptionFilterChange={setDescriptionFilter}
        selectedTransactionType={transactionType}
        onTransactionTypeChange={setTransactionType}
        showSelectedOnly={showSelectedOnly}
        onShowSelectedOnlyChange={setShowSelectedOnly}
        selectedCount={selectedTransactions.length}
        filteredCount={filteredAndSortedTransactions.length}
        totalCount={normalizedTransactions.length}
        onClearFilters={clearFilters}
        resetKey={resetKey}
      />

      {/* All Transactions Table */}
      <TransactionTable
        transactions={filteredAndSortedTransactions}
        selectable={true}
        selectedTransactions={selectedTransactions}
        onSelectionChange={handleSelectionChange}
        showCategory={false}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />

      {/* Report Workflow Modals */}
      <ReportWorkflow
        showConfirmation={showConfirmation}
        showCreateReport={showCreateReport}
        showSelectReport={showSelectReport}
        reports={reports}
        loadingReports={loadingReports}
        pendingReport={pendingReport}
        processing={processing}
        onCloseConfirmation={handleCloseConfirmation}
        onCloseCreateReport={handleCloseCreateReport}
        onCloseSelectReport={handleCloseSelectReport}
        onCreateReport={handleCreateReport}
        onSelectReport={handleSelectReport}
        onConfirmLink={() => handleConfirmLink(selectedTransactions)}
      />

      {/* Auto Select Modal */}
      <AutoSelectModal
        isOpen={showAutoSelect}
        onClose={() => setShowAutoSelect(false)}
        transactions={normalizedTransactions}
        currentlySelected={selectedTransactions}
        onComplete={(newSelections) => {
          setSelectedTransactions(newSelections);
          setShowAutoSelect(false);
        }}
      />

      {/* Page Image Modal */}
      {selectedPage &&
        (() => {
          // Get config for the currently selected statement
          const currentStatement = statements[selectedStatementIndex];
          const currentStatementType =
            currentStatement?.statementType?.toLowerCase() || 'girokonto';
          const modalConfig = getStatementConfig(currentStatementType);

          return (
            <Modal
              isOpen={modalOpen}
              onClose={closeModal}
              title={`Page ${selectedPage.pageNumber}${
                modalConfig.hasCroppedView
                  ? ` - ${showCroppedView ? 'Table View' : 'Full Page'}`
                  : ''
              }`}
              size="xl"
            >
              <div className="space-y-4">
                {/* Toggle buttons - only if this statement type has cropped view */}
                {modalConfig.hasCroppedView &&
                  selectedPage.croppedImageFileId &&
                  selectedPage.imageFileId && (
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => setShowCroppedView(true)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          showCroppedView
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Table View
                      </button>
                      <button
                        onClick={() => setShowCroppedView(false)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          !showCroppedView
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Full Page
                      </button>
                    </div>
                  )}

                {/* Image display */}
                <div className="flex justify-center relative">
                  <div className="max-w-full max-h-[70vh] overflow-auto border border-gray-200 rounded-lg">
                    <AuthenticatedImage
                      fileId={
                        modalConfig.hasCroppedView &&
                        showCroppedView &&
                        selectedPage.croppedImageFileId
                          ? selectedPage.croppedImageFileId
                          : selectedPage.imageFileId
                      }
                      alt={`Page ${selectedPage.pageNumber} ${
                        modalConfig.hasCroppedView && showCroppedView
                          ? 'cropped table'
                          : 'full page'
                      }`}
                      className="max-w-full h-auto"
                      style={{ maxHeight: '70vh' }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      // Navigate to previous page if exists
                      if (
                        selectedStatementIndex !== null &&
                        selectedPageIndex !== null
                      ) {
                        const statement = statements[selectedStatementIndex];
                        if (statement && selectedPageIndex > 0) {
                          const prevPage =
                            statement.pages[selectedPageIndex - 1];
                          openPageModal(
                            prevPage,
                            selectedStatementIndex,
                            selectedPageIndex - 1
                          );
                        }
                      }
                    }}
                    disabled={
                      selectedStatementIndex === null ||
                      selectedPageIndex === null ||
                      selectedPageIndex === 0
                    }
                    className="cursor-pointer absolute top-1/2 left-2 transform -translate-y-1/2 bg-white bg-opacity-75 rounded-full p-1 hover:bg-opacity-100 disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="h-10 w-6 text-gray-700 stroke-2" />
                  </button>
                  <button
                    onClick={() => {
                      // Navigate to next page if exists
                      if (
                        selectedStatementIndex !== null &&
                        selectedPageIndex !== null
                      ) {
                        const statement = statements[selectedStatementIndex];
                        if (
                          statement &&
                          selectedPageIndex < statement.pages.length - 1
                        ) {
                          const nextPage =
                            statement.pages[selectedPageIndex + 1];
                          openPageModal(
                            nextPage,
                            selectedStatementIndex,
                            selectedPageIndex + 1
                          );
                        }
                      }
                    }}
                    disabled={
                      selectedStatementIndex === null ||
                      selectedPageIndex === null ||
                      statements[selectedStatementIndex] === undefined ||
                      selectedPageIndex >=
                        statements[selectedStatementIndex].pages.length - 1
                    }
                    className="cursor-pointer absolute top-1/2 right-2 transform -translate-y-1/2 bg-white bg-opacity-75 rounded-full p-1 hover:bg-opacity-100 disabled:opacity-50"
                  >
                    <ChevronRightIcon className="h-10 w-6 text-gray-700 stroke-2" />
                  </button>
                </div>

                {/* Image info */}
                <div className="text-center text-sm text-gray-600">
                  {modalConfig.hasCroppedView &&
                  showCroppedView &&
                  selectedPage.croppedImageFileId
                    ? 'Showing extracted table area'
                    : modalConfig.hasCroppedView
                    ? 'Showing full page view'
                    : ''}
                  {selectedPage.numberOfTransactions > 0 && (
                    <span className={modalConfig.hasCroppedView ? 'ml-2' : ''}>
                      {modalConfig.hasCroppedView && '• '}
                      {selectedPage.numberOfTransactions} transactions found
                    </span>
                  )}
                </div>
              </div>
            </Modal>
          );
        })()}
    </div>
  );
};

export default TransactionResults;

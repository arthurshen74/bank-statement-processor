import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionReportsApi } from '../api/transactionReports';
import { receiptsApi } from '../api/receipts';

/**
 * Hook to manage report creation and linking workflow
 * @param {Function} getSelectedTransactionDetails - Function to get selected transaction details
 * @returns {Object} Report workflow state and handlers
 */
export const useReportWorkflow = (getSelectedTransactionDetails) => {
  const navigate = useNavigate();

  // Modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [showSelectReport, setShowSelectReport] = useState(false);

  // Data state
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [pendingReport, setPendingReport] = useState(null); // Store report after creation/selection
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  /**
   * Load all reports from API
   */
  const loadReports = async () => {
    setLoadingReports(true);
    setError('');
    try {
      const fetchedReports = await transactionReportsApi.getAllReports();
      setReports(fetchedReports);
    } catch (err) {
      setError(`Failed to load reports: ${err.message}`);
    } finally {
      setLoadingReports(false);
    }
  };

  /**
   * Handle create new report button
   */
  const handleCreateNewReport = (selectedTransactions) => {
    if (selectedTransactions.length === 0) return;
    setShowCreateReport(true);
  };

  /**
   * Handle link to existing report button
   */
  const handleLinkToExisting = async (selectedTransactions) => {
    if (selectedTransactions.length === 0) return;
    await loadReports();
    setShowSelectReport(true);
  };

  /**
   * Handle report creation - store report and show confirmation
   */
  const handleCreateReport = async (reportData) => {
    setProcessing(true);
    setError('');
    try {
      // Create the report
      const createdReport = await transactionReportsApi.createReport(
        reportData.name,
        reportData.description
      );

      // Close create modal and store the created report
      setShowCreateReport(false);
      setPendingReport(createdReport);

      // Show confirmation dialog
      setShowConfirmation(true);
      setProcessing(false);
    } catch (err) {
      setError(`Failed to create report: ${err.message}`);
      setProcessing(false);
    }
  };

  /**
   * Handle report selection - store report and show confirmation
   */
  const handleSelectReport = (report) => {
    // Close select modal and store the selected report
    setShowSelectReport(false);
    setPendingReport(report);

    // Show confirmation dialog
    setShowConfirmation(true);
  };

  /**
   * Handle confirmation - link transactions to the pending report
   */
  const handleConfirmLink = async (selectedTransactions) => {
    if (!pendingReport) return;

    setProcessing(true);
    setError('');
    try {
      // Get transaction details for linking
      const selectedTransactionDetails = getSelectedTransactionDetails(selectedTransactions);

      // Link transactions to the report
      await transactionReportsApi.linkTransactions(
        pendingReport.id,
        selectedTransactionDetails
      );

      // Navigate to report detail page
      navigate(`/reports/${pendingReport.id}`);
    } catch (err) {
      setError(`Failed to link transactions: ${err.message}`);
      setProcessing(false);
      setShowConfirmation(false);
      setPendingReport(null);
    }
  };

  /**
   * Handle confirmation - duplicate transactions to the pending report
   */
  const handleConfirmDuplication = async (selectedTransactions) => {
    if (!pendingReport) return;

    setProcessing(true);
    setError('');
    try {
      // Get transaction details for linking
      const selectedTransactionDetails = getSelectedTransactionDetails(selectedTransactions);

      // Process each transaction to duplicate
      for (const transaction of selectedTransactionDetails) {

        const createdTransaction = await transactionReportsApi.createManualTransaction(
          pendingReport.id,
          transaction
        );

        await receiptsApi.duplicateReceipt(
          transaction.originalId,
          createdTransaction.id
        );

      }

      return pendingReport.id;
    } catch (err) {
      setError(`Failed to duplicate transactions: ${err.message}`);
      setProcessing(false);
      setShowConfirmation(false);
      setPendingReport(null);
    }
  };

  /**
   * Close confirmation dialog
   */
  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    setPendingReport(null);
  };

  /**
   * Close create report modal
   */
  const handleCloseCreateReport = () => {
    setShowCreateReport(false);
  };

  /**
   * Close select report modal
   */
  const handleCloseSelectReport = () => {
    setShowSelectReport(false);
  };

  return {
    // Modal visibility
    showConfirmation,
    showCreateReport,
    showSelectReport,

    // Data
    reports,
    loadingReports,
    pendingReport,
    processing,
    error,

    // Actions
    handleCreateNewReport,
    handleLinkToExisting,
    handleCreateReport,
    handleSelectReport,
    handleConfirmLink,
    handleConfirmDuplication,
    handleCloseConfirmation,
    handleCloseCreateReport,
    handleCloseSelectReport,

    clearError: () => setError(''),
  };
};

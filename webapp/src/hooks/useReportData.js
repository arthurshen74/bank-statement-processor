import { useState, useEffect, useCallback } from 'react';
import { transactionReportsApi } from '../api/transactionReports';

/**
 * Hook to manage report data fetching and refreshing
 * Eliminates duplicate refresh patterns throughout the component
 * @param {string} reportId - The report ID to fetch
 * @returns {Object} Report data, loading state, error, and refresh function
 */
export const useReportData = (reportId) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Single refresh function to replace all duplicate patterns
  const refreshReport = useCallback(async () => {
    if (!reportId) return;

    try {
      const fetchedSummary = await transactionReportsApi.getReportSummary(reportId);
      setSummary(fetchedSummary);
      setError('');
    } catch (err) {
      console.error('Failed to refresh report:', err);
      setError(`Failed to load report: ${err.message}`);
    }
  }, [reportId]);

  // Initial load
  useEffect(() => {
    const loadReportSummary = async () => {
      setLoading(true);
      setError('');
      try {
        const fetchedSummary = await transactionReportsApi.getReportSummary(reportId);
        setSummary(fetchedSummary);
      } catch (err) {
        setError(`Failed to load report: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      loadReportSummary();
    }
  }, [reportId]);

  return {
    summary,
    loading,
    error,
    setError,
    refreshReport,
  };
};

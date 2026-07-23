import { useMemo } from 'react';

/**
 * Hook to calculate report statistics
 * Extracts categorization and naming statistics calculation logic
 * @param {Array} transactions - Array of normalized transactions
 * @returns {Object} Statistics for categorization, naming, and gauge colors
 */
export const useReportStatistics = (transactions = []) => {
  // Calculate categorization statistics
  const categorizationStats = useMemo(() => {
    const totalTransactions = transactions.length;
    const categorizedCount = transactions.filter((t) => t.category).length;
    const uncategorizedCount = totalTransactions - categorizedCount;
    const percentage = totalTransactions > 0 ? (categorizedCount / totalTransactions) * 100 : 0;

    return {
      total: totalTransactions,
      categorized: categorizedCount,
      uncategorized: uncategorizedCount,
      percentage,
    };
  }, [transactions]);

  // Calculate naming statistics
  const namingStats = useMemo(() => {
    const totalTransactions = transactions.length;
    const namedCount = transactions.filter((t) => t.name && t.name.trim() !== '').length;
    const unnamedCount = totalTransactions - namedCount;
    const percentage = totalTransactions > 0 ? (namedCount / totalTransactions) * 100 : 0;

    return {
      total: totalTransactions,
      named: namedCount,
      unnamed: unnamedCount,
      percentage,
    };
  }, [transactions]);

  /**
   * Get gauge color based on completion percentage
   */
  const getGaugeColor = (percentage) => {
    if (percentage === 100) return 'text-green-600';
    if (percentage >= 75) return 'text-lime-600';
    if (percentage >= 50) return 'text-yellow-600';
    if (percentage >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  /**
   * Get thermometer fill color class based on completion percentage
   */
  const getThermometerColor = (percentage) => {
    if (percentage === 100) return 'fill-green-600';
    if (percentage >= 75) return 'fill-lime-600';
    if (percentage >= 50) return 'fill-yellow-600';
    if (percentage >= 25) return 'fill-orange-600';
    return 'fill-red-600';
  };

  return {
    categorizationStats,
    namingStats,
    getGaugeColor,
    getThermometerColor,
  };
};

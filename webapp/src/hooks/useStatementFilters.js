import { useState, useMemo } from 'react';

/**
 * Hook to manage statement filtering and sorting
 * @param {Array} statements - Array of statements
 * @returns {Object} Filter state, sorted/filtered statements, and handlers
 */
export const useStatementFilters = (statements) => {
  // Sorting state
  const [sortField, setSortField] = useState('ingestDate');
  const [sortDirection, setSortDirection] = useState('desc'); // Most recent first by default

  // Filter state
  const [statementTypeFilter, setStatementTypeFilter] = useState('all');
  const [statementYearFilter, setStatementYearFilter] = useState('all');

  // Handle sort change
  const handleSortChange = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // New field, default to descending for dates (most recent first)
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Extract unique years from statements
  const availableYears = useMemo(() => {
    const years = new Set();
    statements.forEach((statement) => {
      if (statement.statementYear) {
        years.add(statement.statementYear.toString());
      } else if (statement.statementDate) {
        const year = statement.statementDate.substring(0, 4);
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Most recent first
  }, [statements]);

  // Apply filters and sorting
  const filteredAndSortedStatements = useMemo(() => {
    let filtered = [...statements];

    // Filter by statement type
    if (statementTypeFilter !== 'all') {
      filtered = filtered.filter(
        (s) => s.statementType?.toLowerCase() === statementTypeFilter
      );
    }

    // Filter by statement year
    if (statementYearFilter !== 'all') {
      filtered = filtered.filter(
        (s) => s.statementYear.toString() === statementYearFilter
      );
    }

    // Sort the filtered statements
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'statementDate':
          comparison = (a.statementDate || '').localeCompare(b.statementDate || '');
          break;
        case 'ingestDate':
          comparison = (a.ingestDate || '').localeCompare(b.ingestDate || '');
          break;
        case 'numberOfTransactions':
          comparison = (a.numberOfTransactions || 0) - (b.numberOfTransactions || 0);
          break;
        case 'fileName':
          comparison = (a.fileName || '').localeCompare(b.fileName || '');
          break;
        default:
          comparison = 0;
      }

      return comparison * (sortDirection === 'asc' ? 1 : -1);
    });

    return filtered;
  }, [statements, statementTypeFilter, statementYearFilter, sortField, sortDirection]);

  // Clear all filters
  const clearFilters = () => {
    setStatementTypeFilter('all');
    setStatementYearFilter('all');
  };

  const hasActiveFilters =
    statementTypeFilter !== 'all' || statementYearFilter !== 'all';

  return {
    // Filtered and sorted data
    filteredAndSortedStatements,
    filteredCount: filteredAndSortedStatements.length,

    // Sorting state
    sortField,
    sortDirection,
    handleSortChange,

    // Filter state
    statementTypeFilter,
    setStatementTypeFilter,
    statementYearFilter,
    setStatementYearFilter,
    availableYears,

    // Filter controls
    hasActiveFilters,
    clearFilters,
  };
};

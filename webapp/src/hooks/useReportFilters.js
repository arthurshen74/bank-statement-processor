import { useState, useMemo } from 'react';

/**
 * Hook to manage report-specific filtering and sorting
 * Extends basic transaction filtering with report-specific filters
 * @param {Array} transactions - Array of normalized transactions
 * @returns {Object} Filter state, sorted/filtered data, and handlers
 */
export const useReportFilters = (transactions = []) => {
  // Selection state
  const [selectedTransactionIds, setSelectedTransactionIds] = useState([]);

  // Filter state
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);
  const [showUnnamedOnly, setShowUnnamedOnly] = useState(false);
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [selectedKonto, setSelectedKonto] = useState('all');
  const [resetKey, setResetKey] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Sort state
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');

  // Get unique Konto types for filter dropdown
  const kontoTypes = useMemo(() => {
    const types = new Set(transactions.map((t) => t.statementType));
    return Array.from(types).filter(Boolean).sort();
  }, [transactions]);

  // Apply filters and sorting
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filter by selected categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((t) =>
        selectedCategories.includes(t.category || 'Uncategorized')
      );
    }

    // Filter by uncategorized
    if (showUncategorizedOnly) {
      filtered = filtered.filter((t) => !t.category);
    }

    // Filter by unnamed
    if (showUnnamedOnly) {
      filtered = filtered.filter((t) => !t.name || t.name.trim() === '');
    }

    // Filter by Konto
    if (selectedKonto !== 'all') {
      filtered = filtered.filter((t) => t.statementType === selectedKonto);
    }

    // Filter by description text
    if (descriptionFilter.trim() !== '') {
      const filterRegex = new RegExp(descriptionFilter.trim(), 'i');
      filtered = filtered.filter((t) => filterRegex.test(t.description));
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = a.date - b.date;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name, 'de', {
            sensitivity: 'base',
          });
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description, 'de', {
            sensitivity: 'base',
          });
          break;
        case 'category': {
          // Sort alphabetically by category, with null/empty at the end
          const catA = a.category || '';
          const catB = b.category || '';
          if (!catA && catB) return 1;
          if (catA && !catB) return -1;
          comparison = catA.localeCompare(catB, 'de', {
            sensitivity: 'base',
          });
          break;
        }
        case 'amount':
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [
    transactions,
    showUncategorizedOnly,
    showUnnamedOnly,
    selectedKonto,
    sortField,
    sortDirection,
    descriptionFilter,
    selectedCategories,
  ]);

  // Handle sort change from column headers
  const handleSortChange = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setDescriptionFilter('');
    setShowUnnamedOnly(false);
    setShowUncategorizedOnly(false);
    setSelectedKonto('all');
    setSelectedCategories([]);
    setResetKey((prev) => prev + 1);
  };

  // Check if any filters are active
  const hasActiveFilters = filteredAndSortedTransactions.length < transactions.length;

  return {
    // Selection state
    selectedTransactionIds,
    setSelectedTransactionIds,

    // Filter state
    showUncategorizedOnly,
    setShowUncategorizedOnly,
    showUnnamedOnly,
    setShowUnnamedOnly,
    descriptionFilter,
    setDescriptionFilter,
    selectedKonto,
    setSelectedKonto,
    selectedCategories,
    setSelectedCategories,
    resetKey,
    kontoTypes,

    // Sort state
    sortField,
    sortDirection,
    handleSortChange,

    // Computed values
    filteredAndSortedTransactions,
    hasActiveFilters,

    // Actions
    clearFilters,
  };
};

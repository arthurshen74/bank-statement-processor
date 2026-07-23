import { useState, useMemo } from 'react';

/**
 * Hook to manage transaction filtering, sorting, and selection
 * @param {Array} normalizedTransactions - Array of normalized transactions
 * @returns {Object} Filter state and handlers
 */
export const useTransactionFilters = (normalizedTransactions) => {
  // Transaction selection state
  const [selectedTransactions, setSelectedTransactions] = useState([]);

  // Filter and sorting state
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [transactionType, setTransactionType] = useState('all');
  const [resetKey, setResetKey] = useState(0);

  // Handle sort change from column headers
  const handleSortChange = (field) => {
    console.log('Sorting by field:', field);
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply filters and sorting
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...normalizedTransactions];

    // Filter by showSelectedOnly
    if (showSelectedOnly) {
      filtered = filtered.filter((t) => selectedTransactions.includes(t.rowId));
    }

    // Filter by transaction type
    if (transactionType !== 'all') {
      filtered = filtered.filter((t) => transactionType === 'einnahme' ? t.amount > 0 : t.amount < 0);
    }

    // Filter by description text
    if (descriptionFilter.trim() !== '') {
      const filterRegex = new RegExp(descriptionFilter.trim(), 'i');
      filtered = filtered.filter((t) => filterRegex.test(t.description));
    }

    // Sort the filtered transactions
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = a.date - b.date;
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description, 'de', {
            sensitivity: 'base',
          });
          break;
        case 'amount':
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        default:
          comparison = 0;
      }
      return comparison * (sortDirection === 'asc' ? 1 : -1);
    });

    return filtered;
  }, [
    showSelectedOnly,
    normalizedTransactions,
    selectedTransactions,
    transactionType,
    sortField,
    sortDirection,
    descriptionFilter,
  ]);

  // Clear all filters
  const clearFilters = () => {
    setDescriptionFilter('');
    setShowSelectedOnly(false);
    setTransactionType('all');
    setResetKey((prev) => prev + 1);
  };

  // Check if any filters are active
  const hasActiveFilters =
    filteredAndSortedTransactions.length < normalizedTransactions.length;

  return {
    // Selection state
    selectedTransactions,
    setSelectedTransactions,

    // Transaction type filter
    transactionType,
    setTransactionType: (e) => setTransactionType(e.target.value),

    // Sorting state
    sortField,
    sortDirection,
    handleSortChange,

    // Filter state
    showSelectedOnly,
    setShowSelectedOnly,
    descriptionFilter,
    setDescriptionFilter,
    resetKey,

    // Computed values
    filteredAndSortedTransactions,
    hasActiveFilters,

    // Actions
    clearFilters,
  };
};

import { useMemo } from 'react';
import { Button } from '../../ui/button';
import { Text } from '../../ui/text';
import { Field, Label } from '../../ui/fieldset';
import { Select } from '../../ui/select';
import { SearchField } from '../../ui/search-field';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { useReportDetailContext } from '../../contexts/ReportDetailContext';
import { useReportViewState } from '../../hooks/useReportViewState';

const ReportView = () => {
  const {
    normalizedTransactions,
    handleAddTransaction,
    handleTransactionClick,
    handleDuplicateTransaction,
    handleDeleteTransaction,
    handleDeleteTransactionsInCategory,
    filteredAndSortedTransactions,
    selectedCategories,
    setSelectedCategories,
    setDescriptionFilter,
    hasActiveFilters,
    clearFilters,
    resetKey,
    bulkOps,
  } = useReportDetailContext();

  const {
    toggleSection,
    toggleCategory,
    isSectionCollapsed,
    isCategoryCollapsed,
    collapseAll,
    expandAll,
  } = useReportViewState();

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('de-DE').format(new Date(date));
  };

  // Get all unique categories for filter dropdown
  const allCategories = useMemo(() => {
    const categories = new Set();
    normalizedTransactions.forEach((t) => {
      if (t.category) {
        categories.add(t.category);
      }
    });
    return Array.from(categories).sort();
  }, [normalizedTransactions]);

  // Group and organize transactions
  const reportData = useMemo(() => {
    const uncategorized = [];
    const einnahme = [];
    const ausgabe = [];

    filteredAndSortedTransactions.forEach((t) => {
      if (!t.category) {
        uncategorized.push(t);
      } else if (t.amount > 0) {
        einnahme.push(t);
      } else {
        ausgabe.push(t);
      }
    });

    // Group by category and sort
    const groupByCategory = (transactions) => {
      const grouped = {};
      transactions.forEach((t) => {
        const category = t.category || 'Uncategorized';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(t);
      });

      // Sort categories alphabetically and sort transactions by date within each category
      const sortedCategories = Object.keys(grouped).sort();
      const result = {};
      sortedCategories.forEach((cat) => {
        result[cat] = grouped[cat].sort((a, b) => a.date - b.date);
      });
      return result;
    };

    return {
      uncategorized: groupByCategory(uncategorized),
      einnahme: groupByCategory(einnahme),
      ausgabe: groupByCategory(ausgabe),
    };
  }, [filteredAndSortedTransactions]);

  // Calculate totals
  const totals = useMemo(() => {
    const calculateSectionTotal = (section) => {
      return Object.values(section).reduce((sum, transactions) => {
        return (
          sum + transactions.reduce((catSum, t) => catSum + (t.amount || 0), 0)
        );
      }, 0);
    };

    const uncategorizedTotal = calculateSectionTotal(reportData.uncategorized);
    const einnahmeTotal = calculateSectionTotal(reportData.einnahme);
    const ausgabeTotal = calculateSectionTotal(reportData.ausgabe);
    const finalTotal = uncategorizedTotal + einnahmeTotal + ausgabeTotal;

    return {
      uncategorized: uncategorizedTotal,
      einnahme: einnahmeTotal,
      ausgabe: ausgabeTotal,
      final: finalTotal,
    };
  }, [reportData]);

  // Handle category filter change
  const handleCategoryFilterChange = (e) => {
    const options = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setSelectedCategories(options);
  };

  // Render a section (Uncategorized, Einnahme, or Ausgabe)
  const renderSection = (
    sectionKey,
    sectionTitle,
    sectionData,
    sectionTotal
  ) => {
    const isCollapsed = isSectionCollapsed(sectionKey);
    const hasData = Object.keys(sectionData).length > 0;

    return (
      hasData && (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg mb-4">
          {/* Section Header */}
          <div
            className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={() => toggleSection(sectionKey)}
          >
            <div className="flex items-center gap-3">
              {isCollapsed ? (
                <ChevronRightIcon className="h-5 w-5 dark:stroke-white" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 dark:stroke-white" />
              )}
              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                {sectionTitle}
              </h2>
            </div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(sectionTotal)}
            </div>
          </div>

          {/* Section Content */}
          {!isCollapsed && hasData && (
            <div className="p-4">
              {Object.entries(sectionData).map(([category, transactions]) =>
                renderCategory(sectionKey, category, transactions)
              )}
            </div>
          )}

          {!isCollapsed && !hasData && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No transactions
            </div>
          )}
        </div>
      )
    );
  };

  // Render a category within a section
  const renderCategory = (sectionKey, category, transactions) => {
    const isCollapsed = isCategoryCollapsed(sectionKey, category);
    const categoryTotal = transactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    return (
      <div key={category} className="mb-3 border-l-4 border-blue-500 pl-4">
        {/* Category Header */}
        <div className="flex items-center justify-between py-2 px-2 rounded">
          <div
            className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 py-1 px-1 rounded"
            onClick={() => toggleCategory(sectionKey, category)}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-4 w-4 dark:stroke-white" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 dark:stroke-white" />
            )}
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              {category}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="font-medium text-gray-700 dark:text-gray-300">
              {formatCurrency(categoryTotal)}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTransactionsInCategory(category, transactions);
              }}
              disabled={bulkOps.isProcessing}
              className="cursor-pointer inline-flex items-center justify-center p-1 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Delete all ${transactions.length} transaction(s) in this category`}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category Transactions */}
        {!isCollapsed && (
          <div className="mt-2 space-y-1">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between py-2 px-4 hover:bg-blue-50 dark:hover:bg-gray-700 rounded group"
              >
                <div
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                  onClick={() => handleTransactionClick(transaction)}
                >
                  <div className="text-sm text-gray-600 dark:text-gray-400 min-w-[100px] text-right">
                    {formatDate(transaction.date)}
                  </div>
                  <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                    {transaction.name || transaction.description}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium ${
                      transaction.amount >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatCurrency(transaction.amount)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateTransaction(transaction);
                    }}
                    className="cursor-pointer inline-flex items-center justify-center p-1 text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Duplicate transaction"
                  >
                    <DocumentDuplicateIcon className="size-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTransaction(transaction);
                    }}
                    className="cursor-pointer inline-flex items-center justify-center p-1 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete transaction"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Bulk Operation Progress Indicator */}
      {bulkOps.isProcessing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Deleting transactions...
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Progress: {bulkOps.progress.current} / {bulkOps.progress.total}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header with Filters and Controls */}
      <div className="flex items-center justify-between gap-3">
        {hasActiveFilters ? (
          <>
            <Text>
              Filtered {filteredAndSortedTransactions.length}/
              {normalizedTransactions.length}
            </Text>
            <Button
              onClick={clearFilters}
              className="cursor-pointer"
              color="blue"
              plain
            >
              <span className="text-blue-500 hover:underline hover:font-bold text-sm">
                clear
              </span>
            </Button>
          </>
        ) : (
          <Text>{normalizedTransactions.length} transaction(s)</Text>
        )}
        <div className="flex justify-start items-center gap-10 ml-auto">
          <SearchField
            placeholder="Enter description text"
            onChange={setDescriptionFilter}
            debounceMs={500}
            resetKey={resetKey}
          />
          <Field className="flex items-center gap-2">
            <Label className="text-sm text-gray-700">Categories:</Label>
            <Select
              multiple
              value={selectedCategories}
              onChange={handleCategoryFilterChange}
              className="mb-3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm cursor-pointer max-w-40"
              size={1}
            >
              <option value="Uncategorized">Uncategorized</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat} className="max-w-52 truncate">
                  {cat}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Collapse/Expand All */}
        <div className="flex gap-2">
          <Button onClick={expandAll} outline className="cursor-pointer">
            Expand All
          </Button>
          <Button onClick={collapseAll} outline className="cursor-pointer">
            Collapse All
          </Button>
        </div>

        {/* Add Transaction */}
        <Button
          onClick={handleAddTransaction}
          className="cursor-pointer select-none"
          color="blue"
        >
          <PlusIcon className="size-4 stroke-white" />
          Add
        </Button>
      </div>

      {/* Report Sections */}
      <div className="flex flex-col gap-4 overflow-y-auto">
        {/* Uncategorized Section */}
        {renderSection(
          'uncategorized',
          'Uncategorized',
          reportData.uncategorized,
          totals.uncategorized
        )}

        {/* Einnahme Section */}
        {renderSection(
          'einnahme',
          'Einnahme',
          reportData.einnahme,
          totals.einnahme
        )}

        {/* Ausgabe Section */}
        {renderSection(
          'ausgabe',
          'Ausgabe',
          reportData.ausgabe,
          totals.ausgabe
        )}

        {/* Final Total */}
        <div className="border-t-4 border-gray-800 dark:border-gray-200 pt-3 mt-2">
          <div className="flex items-center justify-between p-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Final Total
            </h2>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {totals.final >= 0 ? '+' : ''}
              {formatCurrency(totals.final)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportView;

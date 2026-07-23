import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Field, Label } from '../../ui/fieldset';
import { transactionCategorizationApi } from '../../api/transactionCategorization';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function FindSimilarTransactions({
  reportId,
  transaction,
  onPatternChange,
  onTransactionsFound,
  selectedIds,
  onSelectionChange,
}) {
  const [pattern, setPattern] = useState('');
  const [matchingTransactions, setMatchingTransactions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [debounceTimeout, setDebounceTimeout] = useState(null);

  // Debounced search function
  const searchTransactions = useCallback(
    async (searchPattern) => {
      if (!searchPattern.trim()) {
        setMatchingTransactions([]);
        onTransactionsFound([]);
        return;
      }

      try {
        setSearching(true);
        setError(null);
        const result = await transactionCategorizationApi.searchSimilar(
          reportId,
          searchPattern
        );

        if (result.success) {
          setMatchingTransactions(result.transactions);
          onTransactionsFound(result.transactions);
        } else {
          setError(result.error || 'Failed to search transactions');
          setMatchingTransactions([]);
          onTransactionsFound([]);
        }
      } catch (err) {
        setError(err.message);
        setMatchingTransactions([]);
        onTransactionsFound([]);
      } finally {
        setSearching(false);
      }
    },
    [reportId, onTransactionsFound]
  );

  // Handle pattern change with debounce
  const handlePatternChange = (newPattern) => {
    setPattern(newPattern);
    onPatternChange(newPattern);
    onSelectionChange([]); // Clear selections

    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      searchTransactions(newPattern);
    }, 2000);

    setDebounceTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  const handleAutoGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const result = await transactionCategorizationApi.generatePattern(
        transaction.description
      );

      if (result.success) {
        handlePatternChange(result.pattern);
        // Immediately search with the new pattern
        searchTransactions(result.pattern);
      } else {
        setError(result.error || 'Failed to generate pattern');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectAll = () => {
    const allIds = matchingTransactions.map((t) => t.id);
    onSelectionChange(allIds);
  };

  const handleSelectUncategorized = () => {
    const uncategorizedIds = matchingTransactions
      .filter((t) => !t.category)
      .map((t) => t.id);
    onSelectionChange(uncategorizedIds);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleTransactionToggle = (transactionId) => {
    if (selectedIds.includes(transactionId)) {
      onSelectionChange(selectedIds.filter((id) => id !== transactionId));
    } else {
      onSelectionChange([...selectedIds, transactionId]);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 dark:text-gray-200">
          Find Similar Transactions (Optional)
        </h4>
        <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">
          Enter a regex pattern to find and categorize similar transactions in
          this report.
        </p>

        <Field>
          <Label>Regex Pattern</Label>
          <div className="flex gap-2">
            <Textarea
              value={pattern}
              onChange={(e) => handlePatternChange(e.target.value)}
              placeholder="e.g., PAYPAL|PayPal.*"
              rows={2}
              className="font-mono text-sm flex-1"
            />
            <Button
              outline
              onClick={handleAutoGenerate}
              disabled={generating}
              className="self-start"
            >
              <SparklesIcon className="h-4 w-4 mr-1" />
              {generating ? 'Generating...' : 'Auto-Generate'}
            </Button>
          </div>
        </Field>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {searching && (
        <div className="flex justify-center py-4">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="ml-3 text-gray-600 dark:text-gray-200">Searching...</p>
        </div>
      )}

      {!searching && matchingTransactions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
              Found {matchingTransactions.length} matching transaction(s)
            </p>
            <div className="flex gap-2">
              <Button plain onClick={handleSelectAll} className="text-xs">
                Select All
              </Button>
              <Button
                plain
                onClick={handleSelectUncategorized}
                className="text-xs"
              >
                Select Uncategorized
              </Button>
              <Button plain onClick={handleClearAll} className="text-xs">
                Clear All
              </Button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length === matchingTransactions.length &&
                        matchingTransactions.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectAll();
                        } else {
                          handleClearAll();
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matchingTransactions.map((trans) => (
                  <tr
                    key={trans.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleTransactionToggle(trans.id)}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(trans.id)}
                        onChange={() => handleTransactionToggle(trans.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {formatDate(trans.date)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate">
                      {trans.description}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {trans.category ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                          {trans.category}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 text-sm text-right ${
                        trans.amount < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatAmount(trans.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedIds.length > 0 && (
            <p className="text-sm text-blue-600 font-medium">
              {selectedIds.length} transaction(s) selected for categorization
            </p>
          )}
        </div>
      )}

      {!searching && pattern && matchingTransactions.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">
            No transactions match this pattern in the current report
          </p>
        </div>
      )}
    </div>
  );
}

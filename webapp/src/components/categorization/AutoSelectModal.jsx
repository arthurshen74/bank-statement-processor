import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { categoryRulesApi } from '../../api/categoryRules';

export default function AutoSelectModal({
  isOpen,
  onClose,
  transactions,
  currentlySelected,
  onComplete,
}) {
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);

  // Rule selection state
  const [availableRules, setAvailableRules] = useState([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState(new Set());
  const [loadingRules, setLoadingRules] = useState(false);

  const totalTransactions = transactions.length;
  const progress =
    totalTransactions > 0 ? (currentIndex / totalTransactions) * 100 : 0;

  // Fetch rules when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRules();
      setProcessing(false);
      setCompleted(false);
      setCancelled(false);
      setCurrentIndex(0);
      setSelectedCount(0);
    }
  }, [isOpen]);

  const fetchRules = async () => {
    setLoadingRules(true);
    try {
      const rules = await categoryRulesApi.getAllRules();
      setAvailableRules(rules);
      // Initially select all rules
      setSelectedRuleIds(new Set(rules.map((r) => r.id)));
    } catch (err) {
      console.error('Error fetching rules:', err);
    } finally {
      setLoadingRules(false);
    }
  };

  const toggleRuleSelection = (ruleId) => {
    setSelectedRuleIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ruleId)) {
        newSet.delete(ruleId);
      } else {
        newSet.add(ruleId);
      }
      return newSet;
    });
  };

  const selectAllRules = () => {
    setSelectedRuleIds(new Set(availableRules.map((r) => r.id)));
  };

  const clearSelections = () => {
    setSelectedRuleIds(new Set());
  };

  const handleStart = async () => {
    setProcessing(true);
    setCompleted(false);
    setCancelled(false);
    setCurrentIndex(0);

    const selectedRowIds = new Set(currentlySelected);
    let cancelRequested = false;

    const checkCancel = () => cancelRequested;

    // Store cancel function reference
    const cancelProcess = () => {
      cancelRequested = true;
      setCancelled(true);
    };

    // Make cancel function accessible
    window.autoSelectCancel = cancelProcess;

    // Convert selected rule IDs to array for API
    const ruleIdsArray = Array.from(selectedRuleIds);

    for (let i = 0; i < transactions.length; i++) {
      if (checkCancel()) {
        break;
      }

      const transaction = transactions[i];
      setCurrentIndex(i + 1);

      try {
        // Test transaction against selected rules
        const testResult = await categoryRulesApi.testTransactionWithRules(
          transaction.description,
          ruleIdsArray
        );

        if (testResult.matched && testResult.category) {
          // Add to selection
          selectedRowIds.add(transaction.rowId);
        }
      } catch (err) {
        // Skip on error
        console.error('Error testing transaction:', err);
      }
    }

    // Cleanup
    delete window.autoSelectCancel;

    setSelectedCount(selectedRowIds.size);
    setProcessing(false);
    setCompleted(true);

    // Return new selection array
    onComplete(Array.from(selectedRowIds));
  };

  const handleCancel = () => {
    if (window.autoSelectCancel) {
      window.autoSelectCancel();
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={processing ? () => {} : handleClose}
      size="4xl"
    >
      <DialogTitle>Auto Select Transactions</DialogTitle>
      <DialogDescription>
        Select which category rules to apply during the auto-selection process.
      </DialogDescription>
      <DialogBody>
        <div className="space-y-6">
          {/* Initial State - Rule Selector */}
          {!processing && !completed && !cancelled && (
            <>
              {/* Information Banner */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Ready to Scan
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {totalTransactions} transaction
                  {totalTransactions > 1 ? 's' : ''} will be scanned against{' '}
                  {selectedRuleIds.size} category rule(s). Matching transactions
                  will be automatically selected.
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  This will add to your current selection of{' '}
                  {currentlySelected.length} transaction
                  {currentlySelected.length !== 1 ? 's' : ''}.
                </p>
              </div>

              {/* Convenience Buttons */}
              <div className="flex gap-2">
                <Button onClick={selectAllRules} outline>
                  Select All Rules
                </Button>
                <Button onClick={clearSelections} outline>
                  Clear Selections
                </Button>
              </div>

              {/* Rule Cards Grid */}
              {loadingRules ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading rules...
                </div>
              ) : availableRules.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No category rules available
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {availableRules.map((rule) => {
                    const isSelected = selectedRuleIds.has(rule.id);
                    return (
                      <div
                        key={rule.id}
                        onClick={() => toggleRuleSelection(rule.id)}
                        className={`
                          rounded-lg p-4 cursor-pointer transition-all duration-200
                          ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-800 dark:border-gray-200 text-gray-800 dark:text-gray-200'
                          }
                          hover:shadow-lg dark:hover:shadow-gray-700/50 hover:font-bold hover:border-2
                        `}
                      >
                        <h5 className="font-semibold mb-1 truncate">
                          {rule.name}
                        </h5>
                        <p
                          className={`text-sm mb-2 truncate ${
                            isSelected
                              ? 'text-blue-100'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {rule.category}
                        </p>
                        <p
                          className={`text-xs ${
                            isSelected
                              ? 'text-blue-200'
                              : 'text-gray-500 dark:text-gray-500'
                          }`}
                        >
                          {rule.patterns.length} pattern
                          {rule.patterns.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Processing State */}
          {processing && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  Scanning {currentIndex} of {totalTransactions} transactions...
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 bg-blue-600"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Complete/Cancelled State */}
          {(completed || cancelled) && (
            <div
              className={`rounded-lg p-4 border ${
                cancelled
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              }`}
            >
              <h4
                className={`text-sm font-semibold mb-2 ${
                  cancelled
                    ? 'text-orange-900 dark:text-orange-200'
                    : 'text-green-900 dark:text-green-200'
                }`}
              >
                {cancelled ? 'Testing Cancelled' : 'Testing Complete'}
              </h4>
              <p
                className={`text-sm ${
                  cancelled
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-green-700 dark:text-green-300'
                }`}
              >
                {selectedCount} transaction{selectedCount !== 1 ? 's' : ''}{' '}
                selected.
              </p>
            </div>
          )}
        </div>
      </DialogBody>
      <DialogActions>
        {!processing && !completed && !cancelled && (
          <>
            <Button plain onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleStart}
              color="blue"
              disabled={selectedRuleIds.size === 0}
            >
              Start Scan
            </Button>
          </>
        )}

        {processing && (
          <Button onClick={handleCancel} color="red">
            Cancel
          </Button>
        )}

        {(completed || cancelled) && (
          <Button onClick={handleClose} color="blue">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

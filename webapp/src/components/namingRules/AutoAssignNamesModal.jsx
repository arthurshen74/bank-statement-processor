import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { namingRulesApi } from '../../api/namingRules';
import { transactionReportsApi } from '../../api/transactionReports';

export default function AutoAssignNamesModal({
  isOpen,
  onClose,
  selectedTransactions,
  onComplete,
}) {
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Rule selection state
  const [availableRules, setAvailableRules] = useState([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState(new Set());
  const [loadingRules, setLoadingRules] = useState(false);

  // Progress and results
  const totalTransactions = selectedTransactions.length;
  const progress =
    totalTransactions > 0 ? (currentIndex / totalTransactions) * 100 : 0;

  const [nameCounts, setNameCounts] = useState({});
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [error, setError] = useState(null);

  // Load rules when opened
  useEffect(() => {
    if (isOpen) {
      fetchRules();
      setProcessing(false);
      setCompleted(false);
      setCancelled(false);
      setCurrentIndex(0);
      setNameCounts({});
      setUnmatchedCount(0);
      setError(null);
    }
  }, [isOpen]);

  const fetchRules = async () => {
    setLoadingRules(true);
    try {
      const rules = await namingRulesApi.getAllRules();
      setAvailableRules(rules);
      // Select all by default
      setSelectedRuleIds(new Set(rules.map((r) => r.id)));
    } catch (err) {
      console.error('Error fetching naming rules:', err);
      setError(err.message);
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
    setNameCounts({});
    setUnmatchedCount(0);
    setError(null);

    const nameToIds = new Map();
    let unmatched = 0;

    let cancelRequested = false;
    const checkCancel = () => cancelRequested;

    const cancelProcess = () => {
      cancelRequested = true;
      setCancelled(true);
    };
    window.autoNameAssignCancel = cancelProcess;

    const ruleIdsArray = Array.from(selectedRuleIds);

    // First pass: determine names for each transaction
    for (let i = 0; i < selectedTransactions.length; i++) {
      if (checkCancel()) break;

      const t = selectedTransactions[i];
      setCurrentIndex(i + 1);

      try {
        const testResult = await namingRulesApi.testWithRules(
          t.description,
          ruleIdsArray
        );

        if (testResult.matched && testResult.transactionName) {
          const name = testResult.transactionName;
          if (!nameToIds.has(name)) {
            nameToIds.set(name, []);
          }
          nameToIds.get(name).push(t.id);
        } else {
          unmatched++;
        }
      } catch (err) {
        console.error('Error testing transaction for naming:', err);
        unmatched++;
      }

      // update interim results
      setNameCounts(
        Object.fromEntries(
          Array.from(nameToIds.entries()).map(([k, v]) => [k, v.length])
        )
      );
      setUnmatchedCount(unmatched);
    }

    // Second pass: perform batch updates per name
    try {
      for (const [name, ids] of nameToIds.entries()) {
        await transactionReportsApi.bulkUpdateNames(ids, name);
      }
    } catch (err) {
      console.error('Error applying bulk name updates:', err);
      setError(
        `Applied partial results. Error applying some updates: ${err.message}`
      );
    }

    delete window.autoNameAssignCancel;

    setProcessing(false);
    setCompleted(true);
  };

  const handleCancel = () => {
    if (window.autoNameAssignCancel) {
      window.autoNameAssignCancel();
    }
  };

  const handleClose = () => {
    if (completed || cancelled) {
      onComplete?.();
    }
    onClose?.();
  };

  const totalNamed = Object.values(nameCounts).reduce((a, b) => a + b, 0);

  return (
    <Dialog
      open={isOpen}
      onClose={processing ? () => {} : handleClose}
      size="4xl"
    >
      <DialogTitle>Auto Assign Names</DialogTitle>
      <DialogDescription>
        Select naming rules to apply. Matching transactions will be assigned the
        corresponding names automatically.
      </DialogDescription>
      <DialogBody>
        <div className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Initial State - Rule Selector */}
          {!processing && !completed && !cancelled && (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Ready to Assign
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {totalTransactions} selected transaction
                  {totalTransactions !== 1 ? 's' : ''} will be tested against{' '}
                  {selectedRuleIds.size} naming rule
                  {selectedRuleIds.size !== 1 ? 's' : ''}. Matching transactions
                  will have names assigned automatically.
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={selectAllRules} outline>
                  Select All Rules
                </Button>
                <Button onClick={clearSelections} outline>
                  Clear Selections
                </Button>
              </div>

              {loadingRules ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading rules...
                </div>
              ) : availableRules.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No naming rules available
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
                          {rule.ruleName}
                        </h5>
                        <p
                          className={`text-sm mb-2 truncate ${
                            isSelected
                              ? 'text-blue-100'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {rule.transactionName}
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
                  Processing {currentIndex} of {totalTransactions}{' '}
                  transactions...
                </p>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 bg-blue-600"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Real-time results */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Results so far:
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {Object.entries(nameCounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([name, count]) => (
                      <div key={name} className="flex justify-between">
                        <span className="text-gray-900">{name}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unmatched:</span>
                    <span className="font-medium">{unmatchedCount}</span>
                  </div>
                </div>
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
                {cancelled ? 'Processing Cancelled' : 'Processing Complete'}
              </h4>
              <p
                className={`text-sm ${
                  cancelled
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-green-700 dark:text-green-300'
                }`}
              >
                Assigned names to {totalNamed} of {totalTransactions}{' '}
                transaction{totalTransactions !== 1 ? 's' : ''}. Unmatched:{' '}
                {unmatchedCount}.
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
              Start
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

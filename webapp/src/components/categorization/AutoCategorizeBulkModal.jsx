import { useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { categoryRulesApi } from '../../api/categoryRules';
import { transactionCategorizationApi } from '../../api/transactionCategorization';

export default function AutoCategorizeBulkModal({
  isOpen,
  onClose,
  selectedTransactions,
  onComplete,
}) {
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);

  const totalTransactions = selectedTransactions.length;
  const progress =
    totalTransactions > 0 ? (currentIndex / totalTransactions) * 100 : 0;

  const handleStart = async () => {
    setProcessing(true);
    setCompleted(false);
    setCancelled(false);
    setCurrentIndex(0);
    setResults({});
    setError(null);

    const categoryResults = {};
    let cancelRequested = false;

    const checkCancel = () => cancelRequested;

    // Store cancel function reference
    const cancelProcess = () => {
      cancelRequested = true;
      setCancelled(true);
    };

    // Make cancel function accessible
    window.autoCategorizeCancel = cancelProcess;

    for (let i = 0; i < selectedTransactions.length; i++) {
      if (checkCancel()) {
        break;
      }

      const transaction = selectedTransactions[i];
      setCurrentIndex(i + 1);

      try {
        // Test transaction against rules
        const testResult = await categoryRulesApi.testTransaction(
          transaction.description
        );

        if (testResult.matched && testResult.category) {
          // Assign category
          await transactionCategorizationApi.categorizeSingle(
            transaction.id,
            testResult.category
          );

          // Track in results
          categoryResults[testResult.category] =
            (categoryResults[testResult.category] || 0) + 1;
        } else {
          // No match - add to Unmatched
          categoryResults['Unmatched'] =
            (categoryResults['Unmatched'] || 0) + 1;
        }
      } catch (err) {
        console.error('Error processing transaction:', err);
        // On error, also count as Unmatched
        categoryResults['Unmatched'] = (categoryResults['Unmatched'] || 0) + 1;
      }

      // Update results in real-time
      setResults({ ...categoryResults });
    }

    // Cleanup
    delete window.autoCategorizeCancel;

    setProcessing(false);
    setCompleted(true);
  };

  const handleCancel = () => {
    if (window.autoCategorizeCancel) {
      window.autoCategorizeCancel();
    }
  };

  const handleClose = () => {
    if (completed || cancelled) {
      onComplete();
    }
    onClose();
  };

  const totalProcessed = Object.values(results).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <Dialog
      open={isOpen}
      onClose={processing ? () => {} : handleClose}
      size="3xl"
    >
      <DialogTitle>Auto Categorize Transactions</DialogTitle>
      <DialogDescription>
        Automatically categorize {totalTransactions} selected transaction
        {totalTransactions > 1 ? 's' : ''} using category rules.
      </DialogDescription>
      <DialogBody>
        <div className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Initial State */}
          {!processing && !completed && !cancelled && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Ready to Process
              </h4>
              <p className="text-sm text-blue-700">
                {totalTransactions} transaction
                {totalTransactions > 1 ? 's' : ''} will be automatically
                categorized using your category rules.
              </p>
              <p className="text-sm text-blue-700 mt-2">
                Existing categories will be overwritten. Transactions without
                matching rules will be skipped.
              </p>
            </div>
          )}

          {/* Processing State */}
          {processing && (
            <div className="space-y-4">
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-sm font-medium text-yellow-900">
                  Processing {currentIndex} of {totalTransactions}{' '}
                  transactions...
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 bg-blue-600"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Real-time Results */}
              {Object.keys(results).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Categories Assigned So Far:
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {Object.entries(results)
                      .sort(([a], [b]) => {
                        if (a === 'Unmatched') return 1;
                        if (b === 'Unmatched') return -1;
                        return a.localeCompare(b);
                      })
                      .map(([category, count]) => (
                        <div key={category} className="flex justify-between">
                          <span
                            className={
                              category === 'Unmatched'
                                ? 'text-gray-600'
                                : 'text-gray-900'
                            }
                          >
                            {category}:
                          </span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Complete/Cancelled State */}
          {(completed || cancelled) && (
            <div className="space-y-4">
              <div
                className={`rounded-lg p-4 border ${
                  cancelled
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <h4
                  className={`text-sm font-semibold mb-2 ${
                    cancelled ? 'text-orange-900' : 'text-green-900'
                  }`}
                >
                  {cancelled ? 'Processing Cancelled' : 'Processing Complete'}
                </h4>
                <p
                  className={`text-sm ${
                    cancelled ? 'text-orange-700' : 'text-green-700'
                  }`}
                >
                  Processed {totalProcessed} of {totalTransactions} transaction
                  {totalTransactions > 1 ? 's' : ''}.
                </p>
              </div>

              {/* Final Results */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Category Breakdown:
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {Object.entries(results)
                    .sort(([a], [b]) => {
                      if (a === 'Unmatched') return 1;
                      if (b === 'Unmatched') return -1;
                      return a.localeCompare(b);
                    })
                    .map(([category, count]) => (
                      <div
                        key={category}
                        className={`flex justify-between p-2 rounded ${
                          category === 'Unmatched'
                            ? 'bg-orange-100'
                            : 'bg-blue-100'
                        }`}
                      >
                        <span className="font-medium">{category}:</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
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
            <Button onClick={handleStart} color="blue">
              Start Auto-Categorization
            </Button>
          </>
        )}

        {processing && (
          <Button onClick={handleCancel} color="red">
            Cancel Processing
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

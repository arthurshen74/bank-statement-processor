import { useState, useCallback } from 'react';

/**
 * Hook to manage bulk operations with error tracking and progress reporting
 * Provides a standardized way to handle operations on multiple items
 * @returns {Object} Bulk operation state and execution function
 */
export const useBulkOperations = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errors, setErrors] = useState([]);

  /**
   * Execute a bulk operation on multiple items
   * @param {Array} items - Array of items to process
   * @param {Function} operation - Async function to execute on each item
   * @param {Object} options - Optional configuration
   * @param {Function} options.onSuccess - Callback when all operations succeed
   * @param {Function} options.onComplete - Callback when all operations complete (with or without errors)
   * @param {Function} options.onError - Callback when an error occurs
   * @returns {Promise<Object>} Results summary with successCount and errors
   */
  const executeBulkOperation = useCallback(async (items, operation, options = {}) => {
    if (!items || items.length === 0) {
      return { successCount: 0, errors: [] };
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: items.length });
    setErrors([]);

    const collectedErrors = [];
    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        await operation(item);
        successCount++;
      } catch (err) {
        const errorMsg = `Failed to process item: ${err.message}`;
        collectedErrors.push(errorMsg);
        if (options.onError) {
          options.onError(err, item);
        }
      }
      setProgress({ current: i + 1, total: items.length });
    }

    setErrors(collectedErrors);
    setIsProcessing(false);

    const results = { successCount, errors: collectedErrors };

    if (collectedErrors.length === 0 && options.onSuccess) {
      options.onSuccess(results);
    }

    if (options.onComplete) {
      options.onComplete(results);
    }

    return results;
  }, []);

  /**
   * Reset the bulk operation state
   */
  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress({ current: 0, total: 0 });
    setErrors([]);
  }, []);

  return {
    isProcessing,
    progress,
    errors,
    executeBulkOperation,
    reset,
  };
};

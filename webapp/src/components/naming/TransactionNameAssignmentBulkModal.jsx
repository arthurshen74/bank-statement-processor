import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { transactionReportsApi } from '../../api/transactionReports';

export default function TransactionNameAssignmentBulkModal({
  isOpen,
  onClose,
  selectedTransactions,
  onComplete,
}) {
  const [name, setName] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
    }
  }, [isOpen]);

  const handleAssignName = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      setAssigning(true);
      setError(null);

      const transactionIds = selectedTransactions.map((t) => t.id);
      await transactionReportsApi.bulkUpdateNames(transactionIds, name.trim());

      onComplete();
    } catch (err) {
      setError(`Failed to assign name: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Calculate totals
  const totalAmount = selectedTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );
  const positiveAmount = selectedTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const negativeAmount = selectedTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0);

  if (!selectedTransactions || selectedTransactions.length === 0) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="3xl">
      <DialogTitle>Assign Name to Multiple Transactions</DialogTitle>
      <DialogDescription>
        Assign a name to {selectedTransactions.length} selected transaction
        {selectedTransactions.length > 1 ? 's' : ''}.
      </DialogDescription>
      <DialogBody>
        <div className="space-y-6">
          {/* Selection Summary */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">
              Selection Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-blue-700">Total Transactions</p>
                <p className="font-bold text-blue-900">
                  {selectedTransactions.length}
                </p>
              </div>
              <div>
                <p className="text-blue-700">Net Total</p>
                <p
                  className={`font-bold ${
                    totalAmount >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {formatAmount(totalAmount)}
                </p>
              </div>
              {positiveAmount > 0 && (
                <div>
                  <p className="text-blue-700">Income</p>
                  <p className="font-bold text-green-700">
                    {formatAmount(positiveAmount)}
                  </p>
                </div>
              )}
              {negativeAmount < 0 && (
                <div>
                  <p className="text-blue-700">Expenses</p>
                  <p className="font-bold text-red-700">
                    {formatAmount(Math.abs(negativeAmount))}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 dark:text-gray-200">
              Transaction Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for the selected transactions"
              className="w-full"
            />
          </div>

          {/* Assign Button */}
          <div className="flex justify-end pt-4 border-t dark:border-t-gray-200">
            <Button
              onClick={handleAssignName}
              disabled={assigning}
              color="blue"
            >
              {assigning
                ? 'Assigning...'
                : `Assign Name to ${selectedTransactions.length} Transaction${
                    selectedTransactions.length > 1 ? 's' : ''
                  }`}
            </Button>
          </div>
        </div>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={assigning}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

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
import FindSimilarTransactions from '../categorization/FindSimilarTransactions';
import { namingRulesApi } from '../../api/namingRules';
import NamingRuleEditor from '../namingRules/NamingRuleEditor';
import { sha256Hex } from '../../utils/sha256';

export default function TransactionNameAssignmentModal({
  isOpen,
  onClose,
  transaction,
  reportId,
  onComplete,
}) {
  const [name, setName] = useState('');
  const [selectedSimilarIds, setSelectedSimilarIds] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [pattern, setPattern] = useState('');
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [initialRuleValues, setInitialRuleValues] = useState(null);

  useEffect(() => {
    if (isOpen && transaction) {
      console.log('Opening modal for transaction:', transaction);
      setName(transaction.name || '');
      setSelectedSimilarIds([]);
      setError(null);
    }
  }, [isOpen, transaction]);

  const handlePatternChange = (newPattern) => {
    setSelectedSimilarIds([]);
    setPattern(newPattern || '');
  };

  const handleAssignName = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      setAssigning(true);
      setError(null);

      const transactionIds = [transaction.id, ...selectedSimilarIds];

      if (transactionIds.length === 1) {
        await transactionReportsApi.updateTransactionName(
          transaction.id,
          name.trim()
        );
      } else {
        await transactionReportsApi.bulkUpdateNames(
          transactionIds,
          name.trim()
        );
      }

      onComplete();
    } catch (err) {
      setError(`Failed to assign name: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveAsRule = async () => {
    const trimmedName = name.trim();
    const trimmedPattern = (pattern || '').trim();

    if (!trimmedName) {
      setError('Please enter a name before saving as rule');
      return;
    }
    if (!trimmedPattern) {
      setError(
        'Please enter or generate a regex pattern before saving as rule'
      );
      return;
    }

    try {
      setAssigning(true);
      setError(null);

      const id = await sha256Hex(trimmedName);
      const existing = await namingRulesApi.getRuleById(id);

      if (existing) {
        const mergedPatterns = Array.from(
          new Set([...(existing.patterns || []), trimmedPattern])
        );
        await namingRulesApi.updateRule(existing.id, {
          ruleName: existing.ruleName || trimmedName,
          patterns: mergedPatterns,
          priority: existing.priority ?? 100,
          enabled: existing.enabled ?? true,
        });
      } else {
        setInitialRuleValues({
          transactionName: trimmedName,
          ruleName: trimmedName,
          patterns: [trimmedPattern],
          priority: 100,
          enabled: true,
        });
        setShowRuleEditor(true);
      }
    } catch (err) {
      setError(`Failed to save rule: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (date) => {
    if (date instanceof Date) {
      return date.toLocaleDateString('de-DE');
    }
    return new Date(date).toLocaleDateString('de-DE');
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (!transaction) return null;

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} size="4xl">
        <DialogTitle>Assign Transaction Name</DialogTitle>
        <DialogDescription>
          Assign a name to this transaction and optionally find similar
          transactions to name together.
        </DialogDescription>
        <DialogBody>
          <div className="space-y-6">
            {/* Transaction Details */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Transaction Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Date</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(transaction.date)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Type</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {transaction.statementType}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">
                    {transaction.name || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Description</p>
                  <p className="font-medium text-gray-900 whitespace-pre-wrap">
                    {transaction.description}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Amount</p>
                  <p
                    className={`font-medium ${
                      transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {formatAmount(transaction.amount)}
                  </p>
                </div>
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
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                Transaction Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name for this transaction"
                className="w-full"
              />
            </div>

            {/* Find Similar Transactions */}
            <div className="space-y-4 border-t dark:border-t-gray-200 pt-4">
              <FindSimilarTransactions
                reportId={reportId}
                transaction={transaction}
                onPatternChange={handlePatternChange}
                onTransactionsFound={() => {}}
                selectedIds={selectedSimilarIds}
                onSelectionChange={setSelectedSimilarIds}
              />
            </div>

            {/* Assign / Save Rule Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t dark:border-t-gray-200">
              <Button onClick={handleSaveAsRule} outline disabled={assigning}>
                Save as Rule
              </Button>
              <Button
                onClick={handleAssignName}
                disabled={assigning}
                color="blue"
              >
                {assigning
                  ? 'Assigning...'
                  : `Assign Name to ${
                      1 + selectedSimilarIds.length
                    } Transaction${selectedSimilarIds.length > 0 ? 's' : ''}`}
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
      <NamingRuleEditor
        isOpen={showRuleEditor}
        onClose={() => setShowRuleEditor(false)}
        rule={null}
        onSave={async (data) => {
          await namingRulesApi.createRule(data);
          setShowRuleEditor(false);
        }}
        initialValues={initialRuleValues}
        lockTransactionName={true}
      />
    </>
  );
}

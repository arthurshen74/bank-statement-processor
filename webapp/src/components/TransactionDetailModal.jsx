import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { transactionReportsApi } from '../api/transactionReports';
import { receiptsApi } from '../api/receipts';
import { categoryRulesApi } from '../api/categoryRules';
import CategorySelector from './categorization/CategorySelector';
import TransactionNameAssignmentModal from './naming/TransactionNameAssignmentModal';
import CategoryAssignmentModal from './categorization/CategoryAssignmentModal';
import ReceiptUploader from './receipts/ReceiptUploader';
import { useTransactionForm } from '../hooks/useTransactionForm';
import { useCategories } from '../hooks/useCategories';

const MODES = {
  ADD: 'add',
  EDIT: 'edit',
};

export default function TransactionDetailModal({
  isOpen,
  onClose,
  mode = MODES.ADD,
  transaction = null,
  reportId,
  onComplete,
}) {
  // Use transaction form hook
  const {
    formData,
    hasChanges,
    error,
    setError,
    handleInputChange,
    handleCategorySelect,
    validateForm,
    getUpdates,
    getTransactionData,
    markHasChanges,
  } = useTransactionForm(mode, transaction, isOpen);

  // Use categories hook
  const { categories, loading: loadingCategories } = useCategories();

  // Receipt state
  const [receiptFile, setReceiptFile] = useState(null);
  const [existingReceipt, setExistingReceipt] = useState(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState(null);

  // Modal state
  const [showNameModal, setShowNameModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load existing receipt for edit mode
  const loadExistingReceipt = useCallback(async () => {
    if (!transaction?.id) return;

    try {
      const metadata = await receiptsApi.getReceiptMetadata(transaction.id);
      if (metadata.hasReceipt) {
        setExistingReceipt(metadata.receipt);
        // Load receipt for preview
        const { blob } = await receiptsApi.downloadReceipt(transaction.id);
        const url = URL.createObjectURL(blob);
        setExistingReceiptUrl(url);
      } else {
        setExistingReceipt(null);
        setExistingReceiptUrl(null);
      }
    } catch (err) {
      console.error('Failed to load receipt:', err);
    }
  }, [transaction?.id]);

  // Auto-assign category
  const handleAutoAssign = useCallback(async () => {
    try {
      const result = await categoryRulesApi.testTransaction(
        transaction.description
      );
      handleCategorySelect(result);
    } catch (err) {
      setError(`Failed to auto-assign: ${err.message}`);
    }
  }, [transaction?.description, handleCategorySelect, setError]);

  // Receipt handlers
  const handleFileSelect = (file) => {
    console.log('Selected receipt file:', file);
    setReceiptFile(file);
    markHasChanges();
  };

  const handleFileRemove = () => {
    setReceiptFile(null);
    markHasChanges();
  };

  const handleExistingReceiptDelete = async () => {
    try {
      setDeleting(true);
      await receiptsApi.deleteReceipt(transaction.id);
      setExistingReceipt(null);
      setExistingReceiptUrl(null);
      setReceiptFile(null);
      onComplete();
    } catch (err) {
      setError(`Failed to delete receipt: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Save transaction
  const handleSave = async () => {
    console.log('Saving transaction...');
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);

      if (mode === MODES.ADD) {
        // Create manual transaction
        const transactionData = getTransactionData();
        const createdTransaction =
          await transactionReportsApi.createManualTransaction(
            reportId,
            transactionData
          );

        // Upload receipt if provided
        if (receiptFile) {
          await receiptsApi.uploadReceipt(createdTransaction.id, receiptFile);
        }

        onComplete();
      } else if (mode === MODES.EDIT) {
        // Update transaction amount/description
        const updates = getUpdates();

        if (Object.keys(updates).length > 0) {
          await transactionReportsApi.updateTransaction(
            transaction.id,
            updates
          );
        }

        // Upload new receipt if provided
        if (receiptFile) {
          console.log('Uploading new receipt:', receiptFile);
          await receiptsApi.uploadReceipt(transaction.id, receiptFile);
        }

        console.log('Calling onComplete...');
        onComplete();
      }
    } catch (err) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Format date for display
  const formatDate = (date) => {
    if (date instanceof Date) {
      return date.toLocaleDateString('de-DE');
    }
    return new Date(date).toLocaleDateString('de-DE');
  };

  // debug existingReceipt
  useEffect(() => {
    console.log('existingReceipt:', existingReceipt);
  }, [existingReceipt]);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === MODES.EDIT && transaction) {
        loadExistingReceipt();
      } else {
        setExistingReceipt(null);
        setExistingReceiptUrl(null);
      }

      setReceiptFile(null);
    }
  }, [isOpen, mode, transaction, loadExistingReceipt]);

  useEffect(() => {
    if (receiptFile) {
      console.log('Receipt file set:', receiptFile);
    }
  });

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} size="5xl" className="relative">
        <DialogTitle>
          {mode === MODES.ADD
            ? 'Add Manual Transaction'
            : 'Transaction Details'}
        </DialogTitle>
        <DialogDescription>
          {mode === MODES.ADD
            ? 'Add a new manually entered transaction to this report.'
            : 'View and edit transaction details.'}
        </DialogDescription>
        <DialogBody>
          <div className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* ADD MODE */}
            {mode === MODES.ADD && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Transaction Date *
                    </label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        handleInputChange('date', e.target.value)
                      }
                      required
                    />
                  </div>
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange('name', e.target.value)
                      }
                      placeholder="Enter transaction name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Description */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Description *
                    </label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange('description', e.target.value)
                      }
                      placeholder="Enter description"
                      rows={3}
                      required
                    />
                  </div>
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        handleInputChange('amount', e.target.value)
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  {formData.category ? (
                    <div className="rounded-lg p-4 border border-blue-200">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                        Selected Category:{' '}
                        <span className="font-bold">{formData.category}</span>
                        {' · '}
                        <button
                          onClick={() => handleCategorySelect('')}
                          className="text-blue-700 hover:text-blue-900 underline font-medium cursor-pointer dark:text-blue-300"
                        >
                          change
                        </button>
                      </p>
                    </div>
                  ) : (
                    <CategorySelector
                      categories={categories}
                      loading={loadingCategories}
                      selected={formData.category}
                      onCategorySelect={handleCategorySelect}
                      onCreateNew={() => setShowCategoryModal(true)}
                      onAutoAssign={handleAutoAssign}
                    />
                  )}
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Receipt (Optional)
                  </label>
                  <ReceiptUploader
                    file={receiptFile}
                    onFileSelect={handleFileSelect}
                    onFileRemove={handleFileRemove}
                    mode="add"
                    inputId="receipt-file-input-add"
                  />
                </div>
              </div>
            )}

            {/* EDIT MODE */}
            {mode === MODES.EDIT && transaction && (
              <div className="space-y-4">
                {/* Read-only fields */}
                <div className="rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Date</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Type</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {transaction.statementType}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Description
                      </p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {transaction.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Name (with Change link) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Name
                    </label>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {transaction.name || '-'}
                      </span>
                      <button
                        onClick={() => setShowNameModal(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer dark:text-blue-300"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                  {/* Category (with Change link) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Category
                    </label>
                    <div className="flex items-center justify-between p-3 rounded-md border border-gray-200">
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {transaction.category || '-'}
                      </span>
                      <button
                        onClick={() => setShowCategoryModal(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer dark:text-blue-300"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                  {/* Amount (editable) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Amount
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        handleInputChange('amount', e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Receipt (editable) */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Receipt
                  </label>
                  <ReceiptUploader
                    file={receiptFile}
                    onFileSelect={handleFileSelect}
                    onFileRemove={handleFileRemove}
                    existingReceipt={existingReceipt}
                    existingReceiptUrl={existingReceiptUrl}
                    onExistingReceiptDelete={handleExistingReceiptDelete}
                    deleting={deleting}
                    mode="edit"
                    inputId="receipt-file-input-edit"
                  />
                </div>
              </div>
            )}
          </div>
        </DialogBody>
        <DialogActions className="sticky bottom-0 bg-white/75 dark:bg-zinc-900 py-2 px-2">
          <Button plain onClick={onClose} disabled={saving || deleting}>
            Cancel
          </Button>
          {mode === MODES.ADD ? (
            <Button onClick={handleSave} disabled={saving} color="blue">
              {saving ? 'Saving...' : 'Save Transaction'}
            </Button>
          ) : (
            hasChanges && (
              <Button onClick={handleSave} disabled={saving} color="blue">
                {saving ? 'Saving...' : 'Save Pending Changes'}
              </Button>
            )
          )}
        </DialogActions>
      </Dialog>

      {/* Name Assignment Modal (EDIT mode only) */}
      {mode === MODES.EDIT && transaction && (
        <TransactionNameAssignmentModal
          isOpen={showNameModal}
          onClose={() => setShowNameModal(false)}
          transaction={transaction}
          reportId={reportId}
          onComplete={() => {
            setShowNameModal(false);
            onComplete();
          }}
        />
      )}

      {/* Category Assignment Modal (EDIT mode only) */}
      {mode === MODES.EDIT && transaction && (
        <CategoryAssignmentModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          transaction={transaction}
          reportId={reportId}
          onComplete={() => {
            setShowCategoryModal(false);
            onComplete();
          }}
        />
      )}
    </>
  );
}

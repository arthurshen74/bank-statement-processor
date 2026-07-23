import { useState, useEffect } from 'react';

const MODES = {
  ADD: 'add',
  EDIT: 'edit',
};

/**
 * Hook to manage transaction form state and validation
 * @param {string} mode - 'add' or 'edit' mode
 * @param {Object|null} transaction - Existing transaction for edit mode
 * @param {boolean} isOpen - Whether the modal is open
 * @returns {Object} Form state and handlers
 */
export const useTransactionForm = (mode, transaction = null, isOpen = false) => {
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    description: '',
    amount: '',
    category: null,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);

  // Initialize form data when modal opens or transaction changes
  useEffect(() => {
    if (isOpen) {
      if (mode === MODES.ADD) {
        // Reset form for ADD mode
        setFormData({
          date: new Date().toISOString().split('T')[0],
          name: '',
          description: '',
          amount: '',
          category: null,
        });
        setHasChanges(false);
      } else if (mode === MODES.EDIT && transaction) {
        // Populate form for EDIT mode
        setFormData({
          date: transaction.date,
          name: transaction.name || '',
          description: transaction.description,
          amount: transaction.amount.toString(),
          category: transaction.category || null,
        });
        setHasChanges(false);
      }
      setError(null);
    }
  }, [isOpen, mode, transaction]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Track changes for edit mode (only for amount and description)
    if (mode === MODES.EDIT && (field === 'amount' || field === 'description')) {
      setHasChanges(true);
    }
  };

  // Handle category selection
  const handleCategorySelect = (category) => {
    setFormData((prev) => ({ ...prev, category }));
  };

  // Validate form data
  const validateForm = () => {
    if (mode === MODES.ADD) {
      if (!formData.date) {
        setError('Please select a transaction date');
        return false;
      }
      if (!formData.name.trim()) {
        setError('Please enter a transaction name');
        return false;
      }
      if (!formData.description.trim()) {
        setError('Please enter a description');
        return false;
      }
      if (!formData.amount || parseFloat(formData.amount) === 0) {
        setError('Please enter a valid amount (cannot be zero)');
        return false;
      }
    } else if (mode === MODES.EDIT) {
      if (formData.amount && parseFloat(formData.amount) === 0) {
        setError('Amount cannot be zero');
        return false;
      }
    }

    setError(null);
    return true;
  };

  // Get updates for edit mode (only changed fields)
  const getUpdates = () => {
    if (mode !== MODES.EDIT || !transaction) return {};

    const updates = {};

    if (formData.amount !== transaction.amount.toString()) {
      updates.amount = parseFloat(formData.amount);
    }
    if (formData.description !== transaction.description) {
      updates.description = formData.description;
    }

    return updates;
  };

  // Get transaction data for creation (add mode)
  const getTransactionData = () => {
    return {
      date: formData.date,
      name: formData.name,
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
    };
  };

  // Mark that changes have been made (for receipt upload in edit mode)
  const markHasChanges = () => {
    if (mode === MODES.EDIT) {
      setHasChanges(true);
    }
  };

  return {
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
  };
};

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { categoriesApi } from '../../api/categories';
import { transactionCategorizationApi } from '../../api/transactionCategorization';
import CategorySelector from './CategorySelector';
import CategoryEditor from '../categories/CategoryEditor';
import { useCategories } from '../../hooks/useCategories';

export default function CategoryAssignmentBulkModal({
  isOpen,
  onClose,
  selectedTransactions,
  onComplete,
}) {
  const {
    categories,
    loading,
    error: categoriesError,
    refreshCategories,
  } = useCategories();

  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [categorizing, setCategorizing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setSelectedCategory(null);
    setError(null);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const handleCreateCategory = async (categoryData) => {
    try {
      const newCategory = await categoriesApi.createCategory(categoryData);
      await refreshCategories();
      setSelectedCategory(newCategory.name);
      setShowCategoryEditor(false);
    } catch (err) {
      throw new Error(`Failed to create category: ${err.message}`);
    }
  };

  const handleCategorize = async () => {
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    try {
      setCategorizing(true);
      setError(null);

      const transactionIds = selectedTransactions.map((t) => t.id);

      await transactionCategorizationApi.categorizeBulk(
        transactionIds,
        selectedCategory
      );

      onComplete();
    } catch (err) {
      setError(`Failed to categorize: ${err.message}`);
    } finally {
      setCategorizing(false);
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
    <>
      <Dialog open={isOpen} onClose={onClose} size="3xl">
        <DialogTitle>Categorize Multiple Transactions</DialogTitle>
        <DialogDescription>
          Assign a category to {selectedTransactions.length} selected
          transaction{selectedTransactions.length > 1 ? 's' : ''}.
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
            {(error || categoriesError) && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error || categoriesError}</p>
              </div>
            )}

            {/* Category Selector */}
            {selectedCategory ? (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm font-medium text-green-900">
                  Selected Category:{' '}
                  <span className="font-bold">{selectedCategory}</span>
                  {' · '}
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-green-700 hover:text-green-900 underline font-medium cursor-pointer"
                  >
                    change
                  </button>
                </p>
              </div>
            ) : (
              <CategorySelector
                categories={categories}
                loading={loading}
                onCategorySelect={handleCategorySelect}
                onCreateNew={() => setShowCategoryEditor(true)}
              />
            )}

            {/* Categorize Button */}
            {selectedCategory && (
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleCategorize}
                  disabled={categorizing}
                  color="blue"
                >
                  {categorizing
                    ? 'Categorizing...'
                    : `Categorize ${selectedTransactions.length} Transaction${
                        selectedTransactions.length > 1 ? 's' : ''
                      }`}
                </Button>
              </div>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={onClose} disabled={categorizing}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Editor Modal */}
      <CategoryEditor
        isOpen={showCategoryEditor}
        onClose={() => setShowCategoryEditor(false)}
        onSave={handleCreateCategory}
      />
    </>
  );
}

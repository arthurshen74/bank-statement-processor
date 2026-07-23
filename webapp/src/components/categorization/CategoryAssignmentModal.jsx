import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { categoriesApi } from '../../api/categories';
import { categoryRulesApi } from '../../api/categoryRules';
import { transactionCategorizationApi } from '../../api/transactionCategorization';
import CategorySelector from './CategorySelector';
import CategoryEditor from '../categories/CategoryEditor';
import AutoAssignResult from './AutoAssignResult';
import FindSimilarTransactions from './FindSimilarTransactions';
import RuleEditor from '../categoryRules/RuleEditor';
import { categoryRulesApi as rulesApi } from '../../api/categoryRules';
import { useCategories } from '../../hooks/useCategories';

export default function CategoryAssignmentModal({
  isOpen,
  onClose,
  transaction,
  reportId,
  onComplete,
}) {
  const {
    categories,
    loading: loadingCategories,
    error: categoriesError,
    setError: setCategoriesError,
    refreshCategories,
  } = useCategories();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rules, setRules] = useState([]);

  // Workflow state
  const [step, setStep] = useState('selectCategory'); // selectCategory, autoAssign, findSimilar, saveRule
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [autoAssignResult, setAutoAssignResult] = useState(null);
  const [selectedSimilarIds, setSelectedSimilarIds] = useState([]);
  const [pattern, setPattern] = useState('');
  const [saveAsRule, setSaveAsRule] = useState(false);
  const [rule, setRule] = useState({
    id: '',
    name: '',
    category: '',
    patterns: [],
    priority: 100,
    enabled: true,
  });

  // Modal states
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [categorizing, setCategorizing] = useState(false);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await categoryRulesApi.getAllRules();
      console.log('Loaded rules:', data);
      setRules(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRules();
      resetState();
    }
  }, [isOpen]);

  const existingRuleIds = useMemo(
    () => rules.map((rule) => rule.ruleId),
    [rules]
  );

  const resetState = () => {
    setStep('selectCategory');
    setSelectedCategory(null);
    setAutoAssignResult(null);
    setSelectedSimilarIds([]);
    setPattern('');
    setSaveAsRule(false);
    setError(null);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setStep('findSimilar');
  };

  const handleCreateCategory = async (categoryData) => {
    try {
      const newCategory = await categoriesApi.createCategory(categoryData);
      await refreshCategories();
      setSelectedCategory(newCategory.name);
      setShowCategoryEditor(false);
      setStep('findSimilar');
    } catch (err) {
      throw new Error(`Failed to create category: ${err.message}`);
    }
  };

  const handleAutoAssign = async () => {
    try {
      setLoading(true);
      const result = await categoryRulesApi.testTransaction(
        transaction.description
      );
      setAutoAssignResult(result);
      setStep('autoAssign');
    } catch (err) {
      setError(`Failed to auto-assign: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAutoAssign = () => {
    setSelectedCategory(autoAssignResult.category);
    setStep('findSimilar');
  };

  const handleRejectAutoAssign = () => {
    setAutoAssignResult(null);
    setStep('selectCategory');
  };

  const handlePatternChange = (newPattern) => {
    setPattern(newPattern);
    // Clear selections when pattern changes
    setSelectedSimilarIds([]);
  };

  const handleCategorize = async () => {
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    try {
      setCategorizing(true);
      setError(null);

      const transactionIds = [transaction.id, ...selectedSimilarIds];

      if (transactionIds.length === 1) {
        await transactionCategorizationApi.categorizeSingle(
          transaction.id,
          selectedCategory
        );
      } else {
        await transactionCategorizationApi.categorizeBulk(
          transactionIds,
          selectedCategory
        );
      }

      // If save as rule is checked, show rule editor
      if (saveAsRule && pattern) {
        const existingRule = rules?.find(
          (r) => r.category === selectedCategory
        );
        if (existingRule) {
          setRule((prev) => ({
            ...prev,
            ...existingRule,
            patterns: Array.from(new Set([...existingRule.patterns, pattern])),
          }));
        } else {
          setRule({
            id: '',
            name: `${selectedCategory}`,
            category: selectedCategory,
            patterns: [pattern],
            priority: 100,
            enabled: true,
          });
        }
        setStep('saveRule');
      } else {
        onComplete();
      }
    } catch (err) {
      setError(`Failed to categorize: ${err.message}`);
    } finally {
      setCategorizing(false);
    }
  };

  const handleSaveRule = useCallback(
    async (ruleData) => {
      try {
        console.log('Saving rule:', ruleData);
        console.log('Existing rules:', rules);
        const existingRule = rules.find((r) => r.ruleId === ruleData.ruleId);
        if (existingRule) {
          await rulesApi.updateRule(existingRule.id, ruleData);
        } else {
          await rulesApi.createRule(ruleData);
        }
        onComplete();
      } catch (err) {
        throw new Error(`Failed to save rule: ${err.message}`);
      }
    },
    [rules, onComplete]
  );

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
        <DialogTitle>Categorize Transaction</DialogTitle>
        <DialogDescription>
          Assign a category to this transaction and optionally find similar
          transactions to categorize together.
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
                <div className="col-span-2">
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
            {(error || categoriesError) && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error || categoriesError}</p>
              </div>
            )}

            {/* Step: Select Category */}
            {step === 'selectCategory' && (
              <CategorySelector
                categories={categories}
                loading={loadingCategories || loading}
                onCategorySelect={handleCategorySelect}
                onCreateNew={() => setShowCategoryEditor(true)}
                onAutoAssign={handleAutoAssign}
              />
            )}

            {/* Step: Auto Assign Result */}
            {step === 'autoAssign' && autoAssignResult && (
              <AutoAssignResult
                result={autoAssignResult}
                onAccept={handleAcceptAutoAssign}
                onReject={handleRejectAutoAssign}
              />
            )}

            {/* Step: Find Similar Transactions */}
            {step === 'findSimilar' && selectedCategory && (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">
                    Selected Category:{' '}
                    <span className="font-bold">{selectedCategory}</span>
                    {' · '}
                    <button
                      onClick={() => setStep('selectCategory')}
                      className="text-blue-700 hover:text-blue-900 underline font-medium cursor-pointer"
                    >
                      change
                    </button>
                  </p>
                </div>

                <FindSimilarTransactions
                  reportId={reportId}
                  transaction={transaction}
                  onPatternChange={handlePatternChange}
                  onTransactionsFound={() => {}}
                  selectedIds={selectedSimilarIds}
                  onSelectionChange={setSelectedSimilarIds}
                />

                {/* Categorize Button and Save as Rule Option */}
                <div className="flex items-center justify-between pt-4 border-t dark:border-t-gray-200">
                  <div className="flex items-center gap-2">
                    {pattern && selectedSimilarIds.length > 0 && (
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAsRule}
                          onChange={(e) => setSaveAsRule(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        Save as Rule
                      </label>
                    )}
                  </div>
                  <Button
                    onClick={handleCategorize}
                    disabled={categorizing}
                    color="blue"
                  >
                    {categorizing
                      ? 'Categorizing...'
                      : `Classify ${1 + selectedSimilarIds.length} Transaction${
                          selectedSimilarIds.length > 0 ? 's' : ''
                        }`}
                  </Button>
                </div>
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

      {/* Rule Editor Modal */}
      {step === 'saveRule' && rule && (
        <RuleEditor
          isOpen={true}
          onClose={onComplete}
          onSave={handleSaveRule}
          rule={rule}
          existingRuleIds={existingRuleIds}
        />
      )}
    </>
  );
}

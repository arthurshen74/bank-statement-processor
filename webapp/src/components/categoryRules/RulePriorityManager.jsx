import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import LoadingSpinner from '../../ui/loading-spinner';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import { categoryRulesApi } from '../../api/categoryRules';

export default function RulePriorityManager({
  isOpen,
  onClose,
  onSave,
  onSuccess,
}) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRules();
    }
  }, [isOpen]);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoryRulesApi.getAllRules();
      setRules(data);
      setHasChanges(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const moveUp = (index) => {
    if (index === 0) return;

    const newRules = [...rules];
    const currentRule = newRules[index];
    const aboveRule = newRules[index - 1];

    // Swap priorities
    const tempPriority = currentRule.priority;
    currentRule.priority = aboveRule.priority;
    aboveRule.priority = tempPriority;

    // Swap positions in array
    newRules[index] = aboveRule;
    newRules[index - 1] = currentRule;

    setRules(newRules);
    setHasChanges(true);
  };

  const moveDown = (index) => {
    if (index === rules.length - 1) return;

    const newRules = [...rules];
    const currentRule = newRules[index];
    const belowRule = newRules[index + 1];

    // Swap priorities
    const tempPriority = currentRule.priority;
    currentRule.priority = belowRule.priority;
    belowRule.priority = tempPriority;

    // Swap positions in array
    newRules[index] = belowRule;
    newRules[index + 1] = currentRule;

    setRules(newRules);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const priorityUpdates = rules.map((rule) => ({
        ruleId: rule.ruleId,
        priority: rule.priority,
      }));

      await categoryRulesApi.reorderRules(priorityUpdates);
      await onSave();
      setHasChanges(false);
      if (onSuccess) {
        onSuccess('Rule priorities updated successfully');
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>Manage Rule Priorities</DialogTitle>
      <DialogDescription>
        Reorder rules by priority. Rules with higher priority are evaluated
        first when matching transactions.
      </DialogDescription>
      <DialogBody>
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!loading && rules.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            No rules found
          </p>
        )}

        {!loading && rules.length > 0 && (
          <div className="space-y-2">
            {rules.map((rule, index) => (
              <div
                key={rule.id}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                {/* Priority Controls */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className={`p-1 rounded ${
                      index === 0
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                    title="Move up"
                  >
                    <ChevronUpIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === rules.length - 1}
                    className={`p-1 rounded ${
                      index === rules.length - 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                    title="Move down"
                  >
                    <ChevronDownIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Priority Badge */}
                <div className="w-20">
                  <Badge
                    color={
                      rule.priority >= 500
                        ? 'green'
                        : rule.priority >= 100
                        ? 'blue'
                        : 'zinc'
                    }
                  >
                    {rule.priority}
                  </Badge>
                </div>

                {/* Rule Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {rule.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge color="indigo">{rule.category}</Badge>
                    <span className="text-xs text-gray-500">
                      {rule.patterns.length} pattern
                      {rule.patterns.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  {rule.enabled ? (
                    <Badge color="green">Enabled</Badge>
                  ) : (
                    <Badge color="zinc">Disabled</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {hasChanges && (
          <div className="mt-4 rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              You have unsaved changes. Click "Save Changes" to apply the new
              priority order.
            </p>
          </div>
        )}
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

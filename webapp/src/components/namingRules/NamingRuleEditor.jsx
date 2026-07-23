import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Field, Label } from '../../ui/fieldset';
import { Switch } from '../../ui/switch';
import { PlusIcon, XMarkIcon } from '@heroicons/react/20/solid';

export default function NamingRuleEditor({
  isOpen,
  onClose,
  rule,
  onSave,
  initialValues,
  lockTransactionName = false,
}) {
  const [formData, setFormData] = useState({
    transactionName: '',
    ruleName: '',
    patterns: [''],
    priority: 100,
    enabled: true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (rule) {
        setFormData({
          transactionName: rule.transactionName || '',
          ruleName: rule.ruleName || rule.transactionName || '',
          patterns: rule.patterns?.length ? rule.patterns : [''],
          priority: rule.priority ?? 100,
          enabled: rule.enabled ?? true,
        });
      } else if (initialValues) {
        setFormData({
          transactionName: initialValues.transactionName || '',
          ruleName:
            initialValues.ruleName || initialValues.transactionName || '',
          patterns: initialValues.patterns?.length
            ? initialValues.patterns
            : [''],
          priority: initialValues.priority ?? 100,
          enabled: initialValues.enabled ?? true,
        });
      } else {
        setFormData({
          transactionName: '',
          ruleName: '',
          patterns: [''],
          priority: 100,
          enabled: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, rule, initialValues]);

  const validate = () => {
    const newErrors = {};
    if (!formData.transactionName.trim()) {
      newErrors.transactionName = 'Transaction Name is required';
    }
    if (!formData.ruleName.trim()) {
      newErrors.ruleName = 'Rule Name is required';
    }
    const validPatterns = formData.patterns.filter((p) => p.trim());
    if (validPatterns.length === 0) {
      newErrors.patterns = 'At least one pattern is required';
    }
    if (formData.priority < 1 || formData.priority > 1000) {
      newErrors.priority = 'Priority must be between 1 and 1000';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const cleaned = {
        ...formData,
        patterns: formData.patterns.filter((p) => p.trim()),
      };
      await onSave(cleaned);
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPattern = () => {
    setFormData((prev) => ({ ...prev, patterns: [...prev.patterns, ''] }));
  };

  const removePattern = (index) => {
    if (formData.patterns.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      patterns: prev.patterns.filter((_, i) => i !== index),
    }));
  };

  const updatePattern = (index, value) => {
    const list = [...formData.patterns];
    list[index] = value;
    setFormData({ ...formData, patterns: list });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>{rule ? 'Edit Naming Rule' : 'New Naming Rule'}</DialogTitle>
      <DialogDescription>
        {rule
          ? 'Update the naming rule information below.'
          : 'Create a new naming rule for transaction name assignment.'}
      </DialogDescription>
      <DialogBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field>
            <Label>Transaction Name *</Label>
            <Input
              value={formData.transactionName}
              onChange={(e) =>
                setFormData({ ...formData, transactionName: e.target.value })
              }
              placeholder="e.g., PayPal"
              invalid={!!errors.transactionName}
              disabled={!!rule || lockTransactionName} // immutable when editing existing rule
            />
            {errors.transactionName && (
              <p className="text-sm text-red-600 mt-1">
                {errors.transactionName}
              </p>
            )}
          </Field>

          <Field>
            <Label>Rule Name *</Label>
            <Input
              value={formData.ruleName}
              onChange={(e) =>
                setFormData({ ...formData, ruleName: e.target.value })
              }
              placeholder="e.g., PayPal Naming"
              invalid={!!errors.ruleName}
            />
            {errors.ruleName && (
              <p className="text-sm text-red-600 mt-1">{errors.ruleName}</p>
            )}
          </Field>

          <Field>
            <Label>Patterns * (Regex)</Label>
            <div className="space-y-2">
              {formData.patterns.map((pattern, index) => (
                <div key={index} className="flex gap-2">
                  <Textarea
                    value={pattern}
                    onChange={(e) => updatePattern(index, e.target.value)}
                    placeholder="e.g., PAYPAL|PayPal.*"
                    rows={2}
                    className="font-mono text-sm flex-1"
                  />
                  {formData.patterns.length > 1 && (
                    <Button
                      type="button"
                      plain
                      onClick={() => removePattern(index)}
                      className="self-start"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" outline onClick={addPattern} className="mt-2">
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Pattern
            </Button>
            {errors.patterns && (
              <p className="text-sm text-red-600 mt-1">{errors.patterns}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Patterns are stored as-is. No validation is performed.
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label>Priority *</Label>
              <Input
                type="number"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: parseInt(e.target.value || '0', 10),
                  })
                }
                min="1"
                max="1000"
                invalid={!!errors.priority}
              />
              {errors.priority && (
                <p className="text-sm text-red-600 mt-1">{errors.priority}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Higher priority rules are evaluated first (1-1000)
              </p>
            </Field>

            <Field>
              <Label>Enabled</Label>
              <div className="flex items-center gap-2 mt-2">
                <Switch
                  checked={formData.enabled}
                  onChange={(checked) =>
                    setFormData({ ...formData, enabled: checked })
                  }
                  color="green"
                />
                <span className="text-sm text-gray-700">
                  {formData.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </Field>
          </div>

          {errors.submit && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{errors.submit}</p>
            </div>
          )}
        </form>
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : rule ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

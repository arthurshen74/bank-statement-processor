import { useState, useEffect, useCallback } from 'react';
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
import { Select } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { PlusIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useCategories } from '../../hooks/useCategories';

export default function RuleEditor({
  isOpen,
  onClose,
  rule,
  onSave,
  existingRuleIds,
}) {
  const [formData, setFormData] = useState({
    ruleId: '',
    name: '',
    category: '',
    patterns: [''],
    priority: 100,
    enabled: true,
  });

  const { categories, loading: loadingCategories } = useCategories();

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getNewCategoryRuleId = useCallback(
    (categoryName) => {
      const prefix = categoryName.toLowerCase().replace(/\s+/g, '_');
      const index = existingRuleIds.reduce((max, id) => {
        const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 1);
      return `${prefix}-${String(index + 1).padStart(3, '0')}`;
    },
    [existingRuleIds]
  );

  useEffect(() => {
    if (rule) {
      setFormData({
        ruleId: rule.ruleId || getNewCategoryRuleId(rule.category),
        name: rule.name || '',
        category: rule.category || '',
        patterns: rule.patterns?.length > 0 ? rule.patterns : [''],
        priority: rule.priority || 100,
        enabled: rule.enabled !== undefined ? rule.enabled : true,
      });
    } else {
      setFormData({
        ruleId: '',
        name: '',
        category: '',
        patterns: [''],
        priority: 100,
        enabled: true,
      });
    }
    setErrors({});
  }, [rule, isOpen, getNewCategoryRuleId]);

  const validate = () => {
    const newErrors = {};

    if (!formData.ruleId.trim() && !rule) {
      newErrors.ruleId = 'Rule ID is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
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
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Filter out empty patterns
      const cleanedData = {
        ...formData,
        patterns: formData.patterns.filter((p) => p.trim()),
      };
      await onSave(cleanedData);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPattern = () => {
    setFormData({
      ...formData,
      patterns: [...formData.patterns, ''],
    });
  };

  const removePattern = (index) => {
    if (formData.patterns.length > 1) {
      setFormData({
        ...formData,
        patterns: formData.patterns.filter((_, i) => i !== index),
      });
    }
  };

  const updatePattern = (index, value) => {
    const newPatterns = [...formData.patterns];
    newPatterns[index] = value;
    setFormData({
      ...formData,
      patterns: newPatterns,
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>{rule ? 'Edit Rule' : 'New Rule'}</DialogTitle>
      <DialogDescription>
        {rule
          ? 'Update the rule information below.'
          : 'Create a new categorization rule for transaction matching.'}
      </DialogDescription>
      <DialogBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {!rule && (
            <Field>
              <Label>Rule ID *</Label>
              <Input
                value={formData.ruleId}
                onChange={(e) =>
                  setFormData({ ...formData, ruleId: e.target.value })
                }
                placeholder="e.g., paypal-001"
                invalid={!!errors.ruleId}
                disabled={!!rule}
              />
              {errors.ruleId && (
                <p className="text-sm text-red-600 mt-1">{errors.ruleId}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Unique identifier for this rule
              </p>
            </Field>
          )}

          <Field>
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., PayPal Transactions"
              invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </Field>

          <Field>
            <Label>Category *</Label>
            {loadingCategories ? (
              <p className="text-sm text-gray-500">Loading categories...</p>
            ) : (
              <Select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                invalid={!!errors.category}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            )}
            {errors.category && (
              <p className="text-sm text-red-600 mt-1">{errors.category}</p>
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
                    priority: parseInt(e.target.value) || 0,
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

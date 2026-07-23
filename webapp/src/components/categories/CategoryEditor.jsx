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
import { Textarea } from '../../ui/textarea';
import { Field, Label } from '../../ui/fieldset';
import CategoryColorPicker from './CategoryColorPicker';
import {
  ArrowLeftStartOnRectangleIcon,
  ArrowRightEndOnRectangleIcon,
} from '@heroicons/react/24/outline';

export default function CategoryEditor({ isOpen, onClose, category, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#4F46E5',
    iconName: '',
    categoryType: 'Ausgabe',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        color: category.color || '#4F46E5',
        iconName: category.iconName || '',
        categoryType: category.categoryType || 'Ausgabe',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#4F46E5',
        iconName: '',
        categoryType: 'Ausgabe',
      });
    }
    setErrors({});
  }, [category, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.color.match(/^#[0-9A-Fa-f]{6}$/)) {
      newErrors.color = 'Invalid color format (use #RRGGBB)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{category ? 'Edit Category' : 'New Category'}</DialogTitle>
      <DialogDescription>
        {category
          ? 'Update the category information below.'
          : 'Create a new category for organizing transaction rules.'}
      </DialogDescription>
      <DialogBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field>
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Payment Services"
              invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </Field>

          <Field>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional description..."
              rows={3}
            />
          </Field>

          <Field>
            <Label>Color *</Label>
            <CategoryColorPicker
              value={formData.color}
              onChange={(color) => setFormData({ ...formData, color })}
            />
            {errors.color && (
              <p className="text-sm text-red-600 mt-1">{errors.color}</p>
            )}
          </Field>

          <Field>
            <Label>Category Type *</Label>
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, categoryType: 'Ausgabe' })
                }
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  formData.categoryType === 'Ausgabe'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-50'
                }`}
              >
                <ArrowLeftStartOnRectangleIcon className="w-6 h-6" />
                <span className="font-medium">Ausgabe</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, categoryType: 'Einnahme' })
                }
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  formData.categoryType === 'Einnahme'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-50'
                }`}
              >
                <ArrowRightEndOnRectangleIcon className="w-6 h-6" />
                <span className="font-medium">Einnahme</span>
              </button>
            </div>
          </Field>

          <Field>
            <Label>Icon Name</Label>
            <Input
              value={formData.iconName}
              onChange={(e) =>
                setFormData({ ...formData, iconName: e.target.value })
              }
              placeholder="Optional icon name for future use"
            />
          </Field>

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
          {isSubmitting ? 'Saving...' : category ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

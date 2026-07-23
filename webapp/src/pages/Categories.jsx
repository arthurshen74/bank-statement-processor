import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Button } from '../ui/button';
import { Heading } from '../ui/heading';
import LoadingSpinner from '../ui/loading-spinner';
import CategoryCard from '../components/categories/CategoryCard';
import CategoryEditor from '../components/categories/CategoryEditor';
import { categoriesApi } from '../api/categories';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog';
import { Notification } from '../ui/notification';
import { useCategories } from '../hooks/useCategories';

export default function Categories() {
  const {
    categories,
    loading,
    error,
    refreshCategories,
  } = useCategories();

  const [showEditor, setShowEditor] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [notification, setNotification] = useState(null);

  const handleCreate = () => {
    setEditingCategory(null);
    setShowEditor(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowEditor(true);
  };

  const handleSave = async (formData) => {
    try {
      if (editingCategory) {
        await categoriesApi.updateCategory(editingCategory.id, formData);
        setNotification({
          type: 'success',
          message: 'Category updated successfully',
        });
      } else {
        await categoriesApi.createCategory(formData);
        setNotification({
          type: 'success',
          message: 'Category created successfully',
        });
      }
      await refreshCategories();
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Failed to save category: ${error.message}`,
      });
      throw error;
    }
  };

  const handleDelete = (category) => {
    setDeleteConfirm(category);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await categoriesApi.deleteCategory(deleteConfirm.id);
      await refreshCategories();
      setDeleteConfirm(null);
      setNotification({
        type: 'success',
        message: 'Category deleted successfully',
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Failed to delete category: ${error.message}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Notifications */}
      {notification && (
        <div className="mb-6">
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
            autoCloseAfter={5000}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Heading>Categories</Heading>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage category definitions for organizing transaction rules
          </p>
        </div>
        <Button
          onClick={handleCreate}
          color="indigo"
          className="cursor-pointer"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          New Category
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && categories.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No categories
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new category.
          </p>
          <div className="mt-6">
            <Button
              onClick={handleCreate}
              color="indigo"
              className="cursor-pointer"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              New Category
            </Button>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <CategoryEditor
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        category={editingCategory}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete "{deleteConfirm?.name}"? This action
          cannot be undone.
        </DialogDescription>
        <DialogActions>
          <Button
            plain
            onClick={() => setDeleteConfirm(null)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={confirmDelete}
            className="cursor-pointer"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

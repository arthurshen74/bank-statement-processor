import { useState, useEffect, useCallback } from 'react';
import { categoriesApi } from '../api/categories';

/**
 * Hook to manage category data fetching and refreshing
 * Eliminates duplicate category loading patterns throughout the application
 * @returns {Object} Categories data, loading state, error, and refresh function
 */
export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Single refresh function to replace all duplicate patterns
  const refreshCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await categoriesApi.getAllCategories();
      setCategories(data);
      setError('');
    } catch (err) {
      console.error('Failed to refresh categories:', err);
      setError(`Failed to load categories: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  return {
    categories,
    loading,
    error,
    setError,
    refreshCategories,
  };
};

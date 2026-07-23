import { useState, useEffect, useCallback } from 'react';
import statementsApi from '../api/statements';

/**
 * Hook to manage statements data fetching, selection, and deletion
 * @returns {Object} Statements data, loading state, error, selection state, and action functions
 */
export const useStatementsData = () => {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(new Set());

  // Load all statements
  const loadStatements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await statementsApi.getAllStatements();
      setStatements(data);
    } catch (err) {
      setError(err.message || 'Failed to load statements');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStatements();
  }, [loadStatements]);

  // Toggle selection of a statement
  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const addStatementSelections = useCallback((ids) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      ids.forEach((id) => newSet.add(id));
      return newSet;
    });
  }, []);

  // Toggle select all/none
  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === statements.length) {
        return new Set();
      } else {
        return new Set(statements.map((s) => s.id));
      }
    });
  }, [statements]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Delete a statement
  const deleteStatement = useCallback(async (id) => {
    try {
      setDeleting((prev) => new Set(prev).add(id));
      await statementsApi.deleteStatement(id);

      // Remove from state
      setStatements((prev) => prev.filter((s) => s.id !== id));
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });

      return true;
    } catch (err) {
      throw new Error(err.message || 'Failed to delete statement');
    } finally {
      setDeleting((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, []);

  return {
    statements,
    loading,
    error,
    selectedIds,
    deleting,
    loadStatements,
    toggleSelection,
    toggleSelectAll,
    addStatementSelections,
    clearSelection,
    deleteStatement,
  };
};

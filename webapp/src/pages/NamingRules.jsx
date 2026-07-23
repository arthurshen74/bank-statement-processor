import { useEffect, useMemo, useState } from 'react';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Button } from '../ui/button';
import { Heading } from '../ui/heading';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import LoadingSpinner from '../ui/loading-spinner';
import { Notification } from '../ui/notification';
import NamingRuleCard from '../components/namingRules/NamingRuleCard';
import NamingRuleEditor from '../components/namingRules/NamingRuleEditor';
import { namingRulesApi } from '../api/namingRules';
import {
  Dialog,
  DialogActions,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog';

export default function NamingRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('priority');

  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await namingRulesApi.getAllRules();
      setRules(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id, enabled) => {
    try {
      const rule = rules.find((r) => r.id === id);
      if (!rule) return;
      await namingRulesApi.updateRule(id, {
        ruleName: rule.ruleName,
        patterns: rule.patterns,
        priority: rule.priority,
        enabled,
      });
      await loadRules();
      setNotification({
        type: 'success',
        message: `Rule ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Failed to toggle rule: ${err.message}`,
      });
    }
  };

  const handleCreate = () => {
    setEditingRule(null);
    setShowEditor(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setShowEditor(true);
  };

  const handleSave = async (formData) => {
    try {
      if (editingRule) {
        await namingRulesApi.updateRule(editingRule.id, {
          ruleName: formData.ruleName,
          patterns: formData.patterns,
          priority: formData.priority,
          enabled: formData.enabled,
        });
        setNotification({
          type: 'success',
          message: 'Rule updated successfully',
        });
      } else {
        await namingRulesApi.createRule({
          transactionName: formData.transactionName,
          ruleName: formData.ruleName,
          patterns: formData.patterns,
          priority: formData.priority,
          enabled: formData.enabled,
        });
        setNotification({
          type: 'success',
          message: 'Rule created successfully',
        });
      }
      await loadRules();
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Failed to save rule: ${err.message}`,
      });
      throw err;
    }
  };

  const handleDelete = (rule) => {
    setDeleteConfirm(rule);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await namingRulesApi.deleteRule(deleteConfirm.id);
      await loadRules();
      setDeleteConfirm(null);
      setNotification({
        type: 'success',
        message: 'Rule deleted successfully',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Failed to delete rule: ${err.message}`,
      });
    }
  };

  const filteredAndSortedRules = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const filtered = rules.filter((r) => {
      if (!search) return true;
      return (
        r.ruleName.toLowerCase().includes(search) ||
        r.transactionName.toLowerCase().includes(search) ||
        (r.patterns || []).some((p) => p.toLowerCase().includes(search))
      );
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priority - a.priority;
        case 'name':
          return a.ruleName.localeCompare(b.ruleName);
        case 'matches':
          return (b.matchCount || 0) - (a.matchCount || 0);
        case 'date':
          return new Date(b.createdDate || 0) - new Date(a.createdDate || 0);
        default:
          return 0;
      }
    });
    return filtered;
  }, [rules, searchTerm, sortBy]);

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
          <Heading>Naming Rules</Heading>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage transaction naming rules
          </p>
        </div>
        <Button
          onClick={handleCreate}
          color="indigo"
          className="cursor-pointer"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          New Rule
        </Button>
      </div>

      {/* Search and Sort */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="text"
          placeholder="Search rules by rule name, transaction name, or pattern..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="priority">Sort by Priority</option>
          <option value="name">Sort by Name</option>
          <option value="matches">Sort by Matches</option>
          <option value="date">Sort by Date</option>
        </Select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && rules.length === 0 && (
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
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No rules</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new naming rule.
          </p>
          <div className="mt-6">
            <Button onClick={handleCreate}>
              <PlusIcon className="h-5 w-5 mr-1" />
              New Rule
            </Button>
          </div>
        </div>
      )}

      {/* No Results State */}
      {!loading && rules.length > 0 && filteredAndSortedRules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">
            No rules match your search criteria
          </p>
        </div>
      )}

      {/* Rules Grid */}
      {filteredAndSortedRules.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">
            Showing {filteredAndSortedRules.length} of {rules.length} rule
            {rules.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedRules.map((rule) => (
              <NamingRuleCard
                key={rule.id}
                rule={rule}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rule Editor Modal */}
      <NamingRuleEditor
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        rule={editingRule}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Rule</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete "{deleteConfirm?.ruleName}"? This
          action cannot be undone.
        </DialogDescription>
        <DialogActions>
          <Button plain onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

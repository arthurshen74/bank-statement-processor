import { useState, useEffect, useMemo } from 'react';
import {
  PlusIcon,
  BeakerIcon,
  ChartBarIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/20/solid';
import { Button } from '../ui/button';
import { Heading } from '../ui/heading';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import LoadingSpinner from '../ui/loading-spinner';
import RuleCard from '../components/categoryRules/RuleCard';
import RuleEditor from '../components/categoryRules/RuleEditor';
import PatternTester from '../components/categoryRules/PatternTester';
import CoverageStats from '../components/categoryRules/CoverageStats';
import RulePriorityManager from '../components/categoryRules/RulePriorityManager';
import { categoryRulesApi } from '../api/categoryRules';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog';
import { Notification } from '../ui/notification';

export default function CategoryRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('priority');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [showTester, setShowTester] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPriorityManager, setShowPriorityManager] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await categoryRulesApi.getAllRules();
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
      await categoryRulesApi.toggleRule(id, enabled);
      await loadRules();
      setNotification({
        type: 'success',
        message: `Rule ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Failed to toggle rule: ${error.message}`,
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
        await categoryRulesApi.updateRule(editingRule.id, formData);
        setNotification({
          type: 'success',
          message: 'Rule updated successfully',
        });
      } else {
        await categoryRulesApi.createRule(formData);
        setNotification({
          type: 'success',
          message: 'Rule created successfully',
        });
      }
      await loadRules();
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Failed to save rule: ${error.message}`,
      });
      throw error;
    }
  };

  const handleDelete = (rule) => {
    setDeleteConfirm(rule);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await categoryRulesApi.deleteRule(deleteConfirm.id);
      await loadRules();
      setDeleteConfirm(null);
      setNotification({
        type: 'success',
        message: 'Rule deleted successfully',
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Failed to delete rule: ${error.message}`,
      });
    }
  };

  // Filter and sort rules
  const filteredAndSortedRules = useMemo(
    () =>
      rules
        .filter((rule) => {
          if (!searchTerm) return true;
          const search = searchTerm.toLowerCase();
          return (
            rule.name.toLowerCase().includes(search) ||
            rule.category.toLowerCase().includes(search) ||
            rule.patterns.some((p) => p.toLowerCase().includes(search))
          );
        })
        .sort((a, b) => {
          switch (sortBy) {
            case 'priority':
              return b.priority - a.priority;
            case 'name':
              return a.name.localeCompare(b.name);
            case 'matches':
              return b.matchCount - a.matchCount;
            case 'date':
              return new Date(b.createdDate) - new Date(a.createdDate);
            default:
              return 0;
          }
        }),
    [rules, searchTerm, sortBy]
  );

  const existingRuleIds = useMemo(
    () => filteredAndSortedRules.map((rule) => rule.ruleId),
    [filteredAndSortedRules]
  );

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
          <Heading>Category Rules</Heading>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage transaction categorization rules
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

      {/* Action Bar */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Button
          onClick={() => setShowTester(true)}
          outline
          className="cursor-pointer"
        >
          <BeakerIcon className="h-5 w-5 mr-1 stroke-white" />
          Test Transaction
        </Button>
        <Button
          onClick={() => setShowStats(true)}
          outline
          className="cursor-pointer"
        >
          <ChartBarIcon className="h-5 w-5 mr-1 stroke-white" />
          View Statistics
        </Button>
        <Button
          onClick={() => setShowPriorityManager(true)}
          outline
          className="cursor-pointer"
        >
          <ArrowsRightLeftIcon className="h-5 w-5 mr-1 stroke-white" />
          Manage Priorities
        </Button>
      </div>

      {/* Search and Sort */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="text"
          placeholder="Search rules by name, category, or pattern..."
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
            Get started by creating a new categorization rule.
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
              <RuleCard
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
      <RuleEditor
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        rule={editingRule}
        onSave={handleSave}
        existingRuleIds={existingRuleIds}
      />

      {/* Pattern Tester Modal */}
      <PatternTester isOpen={showTester} onClose={() => setShowTester(false)} />

      {/* Coverage Statistics Modal */}
      <CoverageStats isOpen={showStats} onClose={() => setShowStats(false)} />

      {/* Priority Manager Modal */}
      <RulePriorityManager
        isOpen={showPriorityManager}
        onClose={() => setShowPriorityManager(false)}
        onSave={loadRules}
        onSuccess={(message) => setNotification({ type: 'success', message })}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Rule</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete "{deleteConfirm?.name}"? This action
          cannot be undone.
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

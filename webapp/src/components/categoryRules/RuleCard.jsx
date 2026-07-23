import { useState } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { Heading } from '../../ui/heading';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid';
import { TrashIcon } from '@heroicons/react/24/outline';

export default function RuleCard({ rule, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  const priorityColor =
    rule.priority >= 500 ? 'green' : rule.priority >= 100 ? 'blue' : 'zinc';

  return (
    <div
      className={`cursor-pointer relative border rounded-lg p-4 transition-all border-gray-400 bg-white hover:border-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600`}
      onClick={() => onEdit(rule)}
    >
      {/* Header */}
      <div className="mb-4">
        <div
          className="flex justify-between items-center gap-3 mb-2"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 pr-8 break-words truncate">
            {rule.name}
          </h3>
          <Switch
            checked={rule.enabled}
            onChange={(checked) => onToggle(rule.id, checked)}
            color="green"
            className="cursor-pointer"
          />
        </div>
        <Badge color="indigo">{rule.category}</Badge>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-gray-600 mb-4 dark:text-gray-300 dark:hover:text-white transition-colors">
        <span className="flex items-center gap-1">
          Priority:
          <Badge color={priorityColor}>{rule.priority}</Badge>
        </span>
        <span>Matches: {rule.matchCount.toLocaleString()}</span>
      </div>

      {/* Patterns Section */}
      <div className="mb-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="flex items-center gap-2 text-xs font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
        >
          <span>
            📋 {rule.patterns.length} Pattern
            {rule.patterns.length !== 1 ? 's' : ''}
          </span>
          {expanded ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>

        {expanded && (
          <div className="mt-2 space-y-2">
            {rule.patterns.map((pattern, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded px-3 py-2 text-xs font-mono text-gray-800"
              >
                {pattern}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4 dark:text-gray-400">
        <span>Created {new Date(rule.createdDate).toLocaleDateString()}</span>
        {rule.lastModifiedDate && (
          <span>
            Modified {new Date(rule.lastModifiedDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-400 dark:border-gray-700 flex gap-2 justify-end">
        <button
          onClick={(e) => {
            // Prevent card onClick
            e.stopPropagation();
            onDelete(rule);
          }}
          className="cursor-pointer text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete rule"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

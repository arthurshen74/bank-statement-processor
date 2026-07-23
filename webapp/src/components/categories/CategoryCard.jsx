import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Heading } from '../../ui/heading';
import {
  ArrowLeftStartOnRectangleIcon,
  ArrowRightEndOnRectangleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

export default function CategoryCard({ category, onEdit, onDelete }) {
  const isSystem = category.isSystem;

  return (
    <div
      className={`${
        isSystem ? '' : 'cursor-pointer'
      } relative border rounded-lg p-4 transition-all border-gray-400 bg-white hover:border-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600`}
      {...(!isSystem ? { onClick: () => onEdit(category) } : {})}
    >
      {/* Color Swatch and Title */}
      <div className="flex items-start gap-4 w-full">
        <div
          className="w-10 h-10 rounded-lg flex-shrink-0 shadow-sm"
          style={{ backgroundColor: category.color }}
        />
        <div className="flex-1 flex items-center gap-2 mb-1 justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 pr-8 break-words">
            {category.name}
          </h3>
          {category.categoryType === 'Ausgabe' ? (
            <ArrowLeftStartOnRectangleIcon className="size-8 text-red-600 dark:text-red-300 stroke-2" />
          ) : (
            <ArrowRightEndOnRectangleIcon className="size-8 text-green-600 dark:text-green-300 stroke-2" />
          )}
          {isSystem && (
            <Badge color="zinc" className="text-xs">
              System
            </Badge>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 mb-4">
        {category.color}
      </div>

      {/* Description */}
      {category.description && (
        <p className="text-xs text-gray-700 mb-2 line-clamp-2 dark:text-gray-400">
          {category.description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-600 mb-4 dark:text-gray-400">
        <span>
          Used in {category.usageCount} rule
          {category.usageCount !== 1 ? 's' : ''}
        </span>
        <span>
          Created {new Date(category.createdDate).toLocaleDateString()}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-auto pt-4 border-t border-gray-400 dark:border-gray-700 flex gap-2 justify-end">
        <button
          onClick={(e) => {
            // Prevent card onClick
            e.stopPropagation();
            onDelete(category);
          }}
          disabled={isSystem || category.usageCount > 0}
          className="cursor-pointer text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete category"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
      {isSystem && (
        <p className="text-xs text-gray-500 mt-2 text-center dark:text-gray-400">
          System categories cannot be modified
        </p>
      )}
      {!isSystem && category.usageCount > 0 && (
        <p className="text-xs text-gray-500 mt-2 text-center dark:text-gray-400">
          Cannot delete category in use
        </p>
      )}
    </div>
  );
}

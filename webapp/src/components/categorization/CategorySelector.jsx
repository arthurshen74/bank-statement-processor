import { useState, useEffect, useMemo } from 'react';
import { Button } from '../../ui/button';
import { PlusIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function CategorySelector({
  categories,
  loading,
  selected,
  onCategorySelect,
  onCreateNew,
  onAutoAssign,
}) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input with 1 second delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filter categories based on debounced search term
  const filteredCategories = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return categories;
    }
    const regex = new RegExp(debouncedSearch, 'i');
    return categories.filter((category) => regex.test(category.name));
  }, [categories, debouncedSearch]);

  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedSearch('');
  };
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <p className="ml-3 text-gray-600 dark:text-gray-200">
          Loading categories...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200">
            Select a Category{selected ? `: ${selected}` : ''}
          </h4>
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search categories..."
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 dark:text-gray-200"
            />
            {searchInput && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-200 dark:hover:text-gray-400 cursor-pointer"
                title="Clear search"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button outline onClick={onAutoAssign} className="flex items-center">
            <SparklesIcon className="h-4 w-4 mr-1" />
            Auto-Assign
          </Button>
          <Button outline onClick={onCreateNew} className="flex items-center">
            <PlusIcon className="h-4 w-4 mr-1" />
            New Category
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-4">No categories available</p>
          <Button onClick={onCreateNew}>Create First Category</Button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-2">No categories match your search</p>
          <p className="text-sm text-gray-500">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
          {filteredCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.name)}
              className="flex flex-col items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group cursor-pointer"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-3"
                style={{ backgroundColor: category.color }}
              >
                {category.name.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-200 text-center group-hover:text-blue-700">
                {category.name}
              </span>
              {category.description && (
                <span className="text-xs text-gray-500 text-center mt-1 line-clamp-2 mt-auto">
                  {category.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

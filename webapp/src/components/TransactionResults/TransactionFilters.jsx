import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button } from '../../ui/button';
import { Switch, SwitchField } from '../../ui/switch';
import { Label, Field } from '../../ui/fieldset';
import { Select } from '../../ui/select';
import { SearchField } from '../../ui/search-field';

/**
 * Transaction filter controls component
 */
const TransactionFilters = ({
  onDescriptionFilterChange,
  selectedTransactionType,
  onTransactionTypeChange,
  showSelectedOnly,
  onShowSelectedOnlyChange,
  selectedCount,
  filteredCount,
  totalCount,
  onClearFilters,
  resetKey,
}) => {
  const hasActiveFilters = filteredCount < totalCount;

  return (
    <div className="w-full flex items-center justify-start gap-6">
      <div className="pt-2">
        <SearchField
          labelText="Search:"
          placeholder="Enter description text"
          onChange={onDescriptionFilterChange}
          debounceMs={500}
          resetKey={resetKey}
          supportDarkMode={true}
        />
      </div>
      <div className="pt-2">
        <SwitchField disabled={selectedCount === 0}>
          <div className="flex items-center justify-start gap-2">
            <Label className="cursor-pointer">Show Selected Only:</Label>
            <Switch
              className="cursor-pointer"
              checked={showSelectedOnly}
              onChange={onShowSelectedOnlyChange}
            />
          </div>
        </SwitchField>
      </div>
      <Field className="flex justify-start items-center gap-2">
        <Label
          htmlFor="transaction-type-select"
          className="cursor-pointer whitespace-nowrap pt-2"
        >
          Transaction Type:
        </Label>
        <Select
          id="transaction-type-select"
          className="w-48 cursor-pointer"
          value={selectedTransactionType}
          onChange={onTransactionTypeChange}
          Icon={ChevronDownIcon}
        >
          <option value="all">All</option>
          <option value="einnahme">Income</option>
          <option value="ausgabe">Expenses</option>
        </Select>
      </Field>
      {hasActiveFilters && (
        <>
          <span className="text-sm text-gray-600 dark:text-gray-200">
            Displaying {filteredCount} of {totalCount} transactions
          </span>

          <Button
            onClick={onClearFilters}
            className="cursor-pointer"
            color="blue"
            plain
          >
            <span className="text-blue-500 hover:underline dark:text-blue-200">
              Clear Filters
            </span>
          </Button>
        </>
      )}
    </div>
  );
};

export default TransactionFilters;

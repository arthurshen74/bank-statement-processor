import { Button } from '../../ui/button';
import { Checkbox, CheckboxField } from '../../ui/checkbox';
import { Field, Label } from '../../ui/fieldset';
import { Text } from '../../ui/text';
import { Select } from '../../ui/select';
import TransactionTable from '../TransactionTable';
import {
  TrashIcon,
  TagIcon,
  PlusIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { SearchField } from '../../ui/search-field';
import { useReportDetailContext } from '../../contexts/ReportDetailContext';

const TransactionView = () => {
  const {
    normalizedTransactions,
    filteredAndSortedTransactions,
    selectedTransactionIds,
    setSelectedTransactionIds,
    showUncategorizedOnly,
    setShowUncategorizedOnly,
    showUnnamedOnly,
    setShowUnnamedOnly,
    setDescriptionFilter,
    selectedKonto,
    setSelectedKonto,
    resetKey,
    kontoTypes,
    sortField,
    sortDirection,
    handleSortChange,
    hasActiveFilters,
    clearFilters,
    handleAddTransaction,
    handleTransactionClick,
    handleDeleteTransaction,
    handleBulkNameAssignment,
    handleAutoAssignNames,
    handleAutoCategorize,
    handleBulkCategorize,
    handleBulkDelete,
    bulkOps,
  } = useReportDetailContext();

  return (
    <>
      {/* Table Header with Actions */}
      <div className="flex items-center justify-between gap-3">
        {hasActiveFilters ? (
          <>
            <Text>
              Filtered {filteredAndSortedTransactions.length}/
              {normalizedTransactions.length}
            </Text>
            <Button
              onClick={clearFilters}
              className="cursor-pointer"
              color="blue"
              plain
            >
              <span className="text-blue-500 hover:underline hover:font-bold text-sm">
                clear
              </span>
            </Button>
          </>
        ) : (
          <Text>{normalizedTransactions.length} transaction(s)</Text>
        )}

        <div className="flex justify-start items-center gap-10 ml-auto">
          <SearchField
            placeholder="Enter description text"
            onChange={setDescriptionFilter}
            debounceMs={500}
            resetKey={resetKey}
          />
          <CheckboxField>
            <Checkbox
              name="showUnnamedOnly"
              checked={showUnnamedOnly}
              onChange={setShowUnnamedOnly}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <Label>Show only unnamed</Label>
          </CheckboxField>
          <CheckboxField>
            <Checkbox
              name="showUncategorizedOnly"
              checked={showUncategorizedOnly}
              onChange={setShowUncategorizedOnly}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <Label>Show only uncategorized</Label>
          </CheckboxField>
          {/* Konto Filter */}
          <Field className="flex items-center gap-2">
            <Text className="text-sm text-gray-700">Konto:</Text>
            <Select
              value={selectedKonto}
              onChange={(e) => setSelectedKonto(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Kontos</option>
              {kontoTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button
          onClick={handleAddTransaction}
          className="cursor-pointer select-none"
          color="blue"
        >
          <PlusIcon className="size-4 stroke-white" />
          Add
        </Button>
      </div>

      {selectedTransactionIds.length > 0 && (
        <div className="flex gap-2">
          <Button
            onClick={handleBulkNameAssignment}
            className="cursor-pointer"
            color="purple"
          >
            <PencilIcon className="size-4 mr-2 stroke-white" />
            {`Name Selected (${selectedTransactionIds.length})`}
          </Button>
          <Button
            onClick={handleAutoAssignNames}
            className="cursor-pointer"
            color="purple"
          >
            <PencilIcon className="size-4 mr-2 stroke-white" />
            {`Auto-Assign Names (${selectedTransactionIds.length})`}
          </Button>
          <Button
            onClick={handleAutoCategorize}
            className="cursor-pointer"
            color="green"
          >
            <TagIcon className="size-4 mr-2 stroke-white" />
            {`Auto Categorize Selected (${selectedTransactionIds.length})`}
          </Button>
          <Button
            onClick={handleBulkCategorize}
            className="cursor-pointer"
            color="blue"
          >
            <TagIcon className="size-4 mr-2 stroke-white" />
            {`Categorize Selected (${selectedTransactionIds.length})`}
          </Button>
          <Button
            onClick={handleBulkDelete}
            disabled={bulkOps.isProcessing}
            className="cursor-pointer"
            color="red"
          >
            <TrashIcon className="size-4 mr-2 stroke-white" />
            {bulkOps.isProcessing
              ? 'Deleting...'
              : `Delete Selected (${selectedTransactionIds.length})`}
          </Button>
          <Button onClick={() => setSelectedTransactionIds([])} plain>
            <span className="text-sm text-blue-600 dark:text-blue-200 hover:underline hover:font-bold">
              Clear Selection(s)
            </span>
          </Button>
        </div>
      )}

      <TransactionTable
        transactions={filteredAndSortedTransactions}
        selectable={true}
        selectedTransactions={selectedTransactionIds}
        onSelectionChange={setSelectedTransactionIds}
        onRowClick={handleTransactionClick}
        onDeleteTransaction={handleDeleteTransaction}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        className="flex-grow mb-8 mt-4"
      />
    </>
  );
};

export default TransactionView;

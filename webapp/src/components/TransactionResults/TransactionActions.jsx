import React from 'react';
import { Button } from '../../ui/button';

/**
 * Action bar showing selected transaction count and actions
 */
const TransactionActions = ({
  selectedCount,
  onClearSelection,
  onCreateNewReport,
  onLinkToExisting,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <p className="text-sm font-medium text-blue-900">
            {selectedCount} transaction(s) selected
          </p>
          <Button
            onClick={onClearSelection}
            className="ml-3 cursor-pointer"
            plain
          >
            <span className="text-blue-600 hover:underline hover:font-bold">
              Clear Selection(s)
            </span>
          </Button>
        </div>
        <div className="flex space-x-3 items-center">
          <Button
            onClick={onCreateNewReport}
            className="cursor-pointer"
            color="blue"
          >
            Create New Report
          </Button>
          <Button onClick={onLinkToExisting} className="cursor-pointer" plain>
            <span className="text-blue-600 hover:underline hover:font-bold">
              Link to Existing Report
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TransactionActions;

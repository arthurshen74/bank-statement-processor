// a component to duplicate a given transaction to another report
import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useReportWorkflow } from '../../hooks/useReportWorkflow';

import { Button } from '../../ui/button';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog';
import { Field, FieldGroup, Label } from '../../ui/fieldset';
import { Text } from '../../ui/text';
import { Input } from '../../ui/input';
import ReportSelector from '../reports/ReportSelector';
import CreateReportModal from '../reports/CreateReportModal';
import ConfirmationDialog from '../ConfirmationDialog';
import clsx from 'clsx';

const parseIsoDate = (isoDateString) => {
  const dateString = isoDateString.split('T')[0];
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
};

const DuplicateTransaction = ({ isOpen, onClose, transaction }) => {
  const navigate = useNavigate();
  const [transactionDate, setTransactionDate] = useState(null);
  const getSelectedTransactionDetails = (transactions) =>
    transactions.map((t) => ({
      originalId: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      statementType: t.statementType,
      statementDate: t.statementDate,
      statementYear: t.statementYear,
      statementProvider: t.statementProvider,
      pageNumber: t.pageNumber,
      filename: t.filename,
      name: t.name,
      category: t.category, // don't persist the receipt here. this will be handled by the receiptApi.
    }));

  // Use custom hooks for report workflow
  const {
    showConfirmation,
    showCreateReport,
    showSelectReport,
    reports,
    loadingReports,
    pendingReport,
    processing,
    error,
    handleCreateNewReport,
    handleLinkToExisting,
    handleCreateReport,
    handleSelectReport,
    handleConfirmDuplication,
    handleCloseConfirmation,
    handleCloseCreateReport,
    handleCloseSelectReport,
    clearError,
  } = useReportWorkflow(getSelectedTransactionDetails);

  useEffect(() => {
    if (transaction) {
      setTransactionDate(transaction.date);
    }
  }, [transaction]);

  useEffect(() => {
    clearError();
  }, [transaction, clearError]);

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} size="5xl" className="relative">
        <DialogTitle>
          Duplicate Transaction: {transaction?.name ?? 'Unnamed'}
        </DialogTitle>

        <DialogBody>
          {transaction && (
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col justify-start items-start gap-2">
                <span className="text-gray-700 dark:text-gray-100 text-sm font-semibold">
                  Name
                </span>
                <span className="text-gray-500 text-sm">
                  {transaction?.name ?? 'Unnamed'}
                </span>
              </div>
              <div className="flex flex-col justify-start items-start gap-2">
                <span className="text-gray-700 dark:text-gray-100 text-sm font-semibold">
                  Date
                </span>
                <Input
                  type="date"
                  value={transactionDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) =>
                    setTransactionDate(parseIsoDate(e.target.value))
                  }
                />
              </div>{' '}
              <div className="flex flex-col justify-start items-start gap-2">
                <span className="text-gray-700 dark:text-gray-100 text-sm font-semibold">
                  Amount
                </span>
                <span
                  className={clsx(
                    'text-sm font-semibold',
                    transaction?.amount < 0 ? 'text-red-600' : 'text-green-600'
                  )}
                >
                  {transaction?.amount?.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  }) ?? ''}
                </span>
              </div>
              <div className="col-span-3 flex flex-col justify-start items-start gap-2">
                <span className="text-gray-700 dark:text-gray-100 text-sm font-semibold">
                  Description
                </span>
                <div className="text-gray-500 text-sm whitespace-pre-wrap border border-gray-500 rounded-lg p-2 w-full bg-gray-200 font-mono max-h-[25vh] overflow-y-auto">
                  {transaction?.description ?? 'No description provided'}
                </div>
              </div>
            </div>
          )}
          <div className="text-gray-600 dark:text-gray-100 text-sm mt-3">
            Duplicate this transaction to a new report or select an existing
            report.
          </div>

          {error && (
            <div className="p-2 bg-red-100 border border-red-200 rounded-lg relative mt-4">
              <span className="text-sm text-red-600">{error}</span>
              <div className="absolute top-2 right-2 text-red-600">
                <XMarkIcon
                  className="h-5 w-5 cursor-pointer"
                  onClick={clearError}
                />
              </div>
            </div>
          )}
        </DialogBody>
        <DialogActions>
          <Button
            onClick={() =>
              handleCreateNewReport([{ ...transaction, date: transactionDate }])
            }
            className="cursor-pointer"
            color="blue"
          >
            New Report
          </Button>
          <Button
            onClick={() =>
              handleLinkToExisting([{ ...transaction, date: transactionDate }])
            }
            className="cursor-pointer"
            color="green"
          >
            Existing Report
          </Button>
          <Button
            onClick={onClose}
            color="dark/zinc"
            className="cursor-pointer"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      {/* Create Report Modal */}
      <CreateReportModal
        isOpen={showCreateReport}
        onClose={handleCloseCreateReport}
        onCreate={handleCreateReport}
        loading={processing}
      />

      {/* Select Report Modal */}
      <ReportSelector
        isOpen={showSelectReport}
        onClose={handleCloseSelectReport}
        onSelect={handleSelectReport}
        reports={reports}
        loading={loadingReports}
      />

      {/* Confirmation Dialog - Shows after report created/selected */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={handleCloseConfirmation}
        onConfirm={async () => {
          const reportId = await handleConfirmDuplication([
            { ...transaction, date: transactionDate },
          ]);
          onClose();
          if (reportId) {
            navigate(`/reports/${reportId}`);
          }
        }}
        title="Duplicate Transactions to Report"
        message={`Are you sure you want to duplicate these transactions to "${pendingReport?.name}"?`}
        confirmText="Duplicate Transactions"
        cancelText="Cancel"
        variant="warning"
      />
    </>
  );
};

export default DuplicateTransaction;

import React, { useState, useMemo } from 'react';
import { Modal } from '../Modal';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

/**
 * ReportSelector - Modal dialog for selecting an existing report
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onSelect - Callback when report is selected (receives report object)
 * @param {Array} reports - Array of available reports
 * @param {boolean} loading - Whether reports are being loaded
 */
const ReportSelector = ({
  isOpen,
  onClose,
  onSelect,
  reports = [],
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  // Filter reports based on search term
  const filteredReports = useMemo(() => {
    if (!searchTerm) return reports;

    const lowerSearch = searchTerm.toLowerCase();
    return reports.filter(
      (report) =>
        report.name.toLowerCase().includes(lowerSearch) ||
        (report.description &&
          report.description.toLowerCase().includes(lowerSearch))
    );
  }, [reports, searchTerm]);

  const handleSelect = () => {
    if (selectedReport) {
      onSelect(selectedReport);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedReport(null);
    onClose();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Select Report"
      size="lg"
      showCloseButton={false}
    >
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search reports by name or description..."
            disabled={loading}
          />
        </div>

        {/* Reports list */}
        <div className="border border-gray-200 rounded-md max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-2">Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {reports.length === 0 ? (
                <p>No reports available. Create a new report first.</p>
              ) : (
                <p>No reports match your search.</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedReport?.id === report.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {report.name}
                      </h4>
                      {report.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {report.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Created: {formatDate(report.createdDate)}</span>
                        <span>•</span>
                        <span>{report.transactionCount} transactions</span>
                      </div>
                    </div>
                    {selectedReport?.id === report.id && (
                      <div className="ml-3 flex-shrink-0">
                        <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg
                            className="h-3 w-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSelect}
            disabled={!selectedReport}
            className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select Report
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReportSelector;

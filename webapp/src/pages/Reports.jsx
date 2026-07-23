import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Heading } from '../ui/heading';
import { Button } from '../ui/button';
import { transactionReportsApi } from '../api/transactionReports';
import { DocumentTextIcon, TrashIcon } from '@heroicons/react/24/outline';
import CreateReportModal from '../components/reports/CreateReportModal';
import ConfirmationDialog from '../components/ConfirmationDialog';

const Reports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const fetchedReports = await transactionReportsApi.getAllReports();
      setReports(fetchedReports);
    } catch (err) {
      setError(`Failed to load reports: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (report) => {
    setDeleteConfirm(report);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setDeletingId(deleteConfirm.id);
    setError('');
    try {
      await transactionReportsApi.deleteReport(deleteConfirm.id);
      setReports(reports.filter((r) => r.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(`Failed to delete report: ${err.message}`);
      setDeleteConfirm(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateReport = async (reportData) => {
    setCreating(true);
    setError('');
    try {
      const createdReport = await transactionReportsApi.createReport(
        reportData.name,
        reportData.description
      );
      setShowCreateModal(false);
      // Navigate to the new report detail page
      navigate(`/reports/${createdReport.id}`);
    } catch (err) {
      setError(`Failed to create report: ${err.message}`);
      setCreating(false);
      throw err; // Re-throw to prevent modal from closing on error
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-2 max-w-7xl mx-auto">
        <div className="mb-6">
          <Heading>Transaction Reports</Heading>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage your transaction reports
          </p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="ml-3 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Heading>Transaction Reports</Heading>
            <p className="text-gray-600 dark:text-gray-400">
              View and manage your transaction reports
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            color="indigo"
            className="cursor-pointer"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            New Report
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No reports</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by extracting transactions and creating your first
            report.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="cursor-pointer relative border rounded-lg p-4 transition-all border-gray-400 bg-white hover:border-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
              onClick={() => navigate(`/reports/${report.id}`)}
            >
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 pr-8 break-words">
                {report.name}
              </h3>

              {report.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {report.description}
                </p>
              )}

              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Transactions:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {report.transactionCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(report.createdDate)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700 flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(report);
                  }}
                  disabled={deletingId === report.id}
                  className="cursor-pointer text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete report"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Report Modal */}
      <CreateReportModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateReport}
        loading={creating}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete Report"
        message={`Are you sure you want to delete "${
          deleteConfirm?.name
        }"? This will also delete all ${
          deleteConfirm?.transactionCount || 0
        } linked transaction(s).`}
        confirmText="Delete Report"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Reports;

import React from 'react';
import ConfirmationDialog from '../ConfirmationDialog';
import CreateReportModal from '../reports/CreateReportModal';
import ReportSelector from '../reports/ReportSelector';

/**
 * Component that orchestrates all report-related modals
 */
const ReportWorkflow = ({
  showConfirmation,
  showCreateReport,
  showSelectReport,
  reports,
  loadingReports,
  pendingReport,
  processing,
  onCloseConfirmation,
  onCloseCreateReport,
  onCloseSelectReport,
  onCreateReport,
  onSelectReport,
  onConfirmLink,
}) => {
  return (
    <>
      {/* Create Report Modal */}
      <CreateReportModal
        isOpen={showCreateReport}
        onClose={onCloseCreateReport}
        onCreate={onCreateReport}
        loading={processing}
      />

      {/* Select Report Modal */}
      <ReportSelector
        isOpen={showSelectReport}
        onClose={onCloseSelectReport}
        onSelect={onSelectReport}
        reports={reports}
        loading={loadingReports}
      />

      {/* Confirmation Dialog - Shows after report created/selected */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={onCloseConfirmation}
        onConfirm={onConfirmLink}
        title="Link Transactions to Report"
        message={`Once you link these transactions to "${pendingReport?.name}", the current extraction results will be cleared. Do you want to continue?`}
        confirmText="Link Transactions"
        cancelText="Cancel"
        variant="warning"
      />
    </>
  );
};

export default ReportWorkflow;

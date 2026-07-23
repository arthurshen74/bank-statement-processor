import { createApiClient, get, post, patch, del } from './client';

const client = createApiClient('/transaction-reports');

export const transactionReportsApi = {
    /**
     * Get all transaction reports
     * @returns {Promise<Array>} Array of transaction reports
     */
    getAllReports: () => client.getAll('Failed to fetch reports'),

    /**
     * Get a single report by ID
     * @param {string} id - Report ID
     * @returns {Promise<Object>} Report details
     */
    getReportById: (id) => client.getById(id, 'Failed to fetch report'),

    /**
     * Create a new report
     * @param {string} name - Report name
     * @param {string} description - Report description (optional)
     * @returns {Promise<Object>} Created report
     */
    createReport: (name, description = null) =>
        client.create({ name, description }, 'Failed to create report'),

    /**
     * Delete a report
     * @param {string} id - Report ID
     * @returns {Promise<void>}
     */
    deleteReport: (id) => client.delete(id, 'Failed to delete report'),

    /**
     * Link transactions to a report
     * @param {string} reportId - Report ID
     * @param {Array} transactions - Array of transactions to link
     * @returns {Promise<Object>} Link result with success status and counts
     */
    linkTransactions: (reportId, transactions) =>
        post('/transaction-reports/link', { reportId, transactions }, 'Failed to link transactions'),

    /**
     * Get report summary with all transactions
     * @param {string} id - Report ID
     * @returns {Promise<Object>} Report summary with transactions and financials
     */
    getReportSummary: (id) =>
        get(`/transaction-reports/${id}/summary`, 'Failed to fetch report summary'),

    /**
     * Update transaction category
     * @param {string} transactionId - Transaction ID
     * @param {string} category - New category
     * @returns {Promise<void>}
     */
    updateTransactionCategory: (transactionId, category) =>
        patch(`/transaction-reports/transactions/${transactionId}/category`,
            { category }, 'Failed to update transaction category'),

    /**
     * Delete a transaction from a report
     * @param {string} transactionId - Transaction ID
     * @returns {Promise<void>}
     */
    deleteTransaction: (transactionId) =>
        del(`/transaction-reports/transactions/${transactionId}`, 'Failed to delete transaction'),

    /**
     * Update report details
     * @param {string} reportId - Report ID
     * @param {Object} updates - Updates object with optional name and/or description
     * @returns {Promise<void>} 
     */
    updateReport: (reportId, updates) =>
        patch(`/transaction-reports/${reportId}`,
            updates, 'Failed to update report'),

    /**
     * Update transaction name
     * @param {string} transactionId - Transaction ID
     * @param {string} name - New transaction name
     * @returns {Promise<void>}
     */
    updateTransactionName: (transactionId, name) =>
        patch(`/transaction-reports/transactions/${transactionId}/name`,
            { name }, 'Failed to update transaction name'),

    /**
     * Update names for multiple transactions
     * @param {Array<string>} transactionIds - Array of transaction IDs
     * @param {string} name - New name for all transactions
     * @returns {Promise<void>}
     */
    bulkUpdateNames: (transactionIds, name) =>
        post('/transaction-reports/transactions/name-bulk',
            { transactionIds, name }, 'Failed to update transaction names'),

    /**
     * Create a manual transaction
     * @param {string} reportId - Report ID
     * @param {Object} transactionData - Transaction data (date, name, description, amount, category)
     * @returns {Promise<Object>} Created transaction
     */
    createManualTransaction: (reportId, transactionData) =>
        post('/transaction-reports/transactions/manual', {
            reportId,
            date: transactionData.date,
            name: transactionData.name,
            description: transactionData.description,
            amount: transactionData.amount,
            category: transactionData.category || null
        }, 'Failed to create manual transaction'),

    /**
     * Update transaction amount and/or description
     * @param {string} transactionId - Transaction ID
     * @param {Object} updates - Updates object with optional amount and/or description
     * @returns {Promise<void>}
     */
    updateTransaction: (transactionId, updates) =>
        patch(`/transaction-reports/transactions/${transactionId}`,
            updates, 'Failed to update transaction')
};

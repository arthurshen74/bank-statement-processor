import { get, post, put } from './client';

export const transactionCategorizationApi = {
    // Categorize a single transaction
    categorizeSingle: (transactionId, category) =>
        put(`/transactions/${transactionId}/category`,
            { category }, 'Failed to categorize transaction'),

    // Bulk categorize multiple transactions
    categorizeBulk: (transactionIds, category) =>
        post('/transactions/categorize-bulk',
             { transactionIds, category }, 'Failed to categorize transactions'),

    // Search for similar transactions using a regex pattern
    searchSimilar: (reportId, pattern) =>
        post('/transactions/search-similar',
             { reportId, pattern }, 'Failed to search similar transactions'),

    // Generate a regex pattern using ChatGPT
    generatePattern: (buchungstext) =>
        post('/pattern-generator',
             { buchungstext }, 'Failed to generate pattern'),

    // Get categorization statistics for a report
    getCategorizationStats: (reportId) =>
        get(`/transaction-reports/${reportId}/categorization-stats`,
            'Failed to fetch categorization statistics')
};

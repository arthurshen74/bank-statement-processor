import { createApiClient, get, post, patch } from './client';

const client = createApiClient('/category-rules');

export const categoryRulesApi = {
    getAllRules: () => client.getAll('Failed to fetch rules'),
    getRuleById: (id) => client.getById(id, 'Failed to fetch rule'),
    createRule: (rule) => client.create(rule, 'Failed to create rule'),
    updateRule: (id, rule) => client.update(id, rule, 'Failed to update rule'),
    deleteRule: (id) => client.delete(id, 'Failed to delete rule'),

    testTransaction: (buchungstext) =>
        post('/category-rules/test', { buchungstext }, 'Failed to test transaction'),

    testTransactionWithRules: (buchungstext, ruleIds) =>
        post('/category-rules/test-with-rules', { buchungstext, ruleIds }, 'Failed to test transaction with rules'),

    getCoverageStats: () =>
        get('/category-rules/statistics/coverage', 'Failed to fetch statistics'),

    toggleRule: (id, enabled) =>
        patch(`/category-rules/${id}/toggle?enabled=${enabled}`, null, 'Failed to toggle rule'),

    reorderRules: (rules) =>
        post('/category-rules/reorder', { rules }, 'Failed to reorder rules'),

    exportRules: () =>
        get('/category-rules/export', 'Failed to export rules'),

    importRules: (rules, replaceExisting = false) =>
        post('/category-rules/import', { rules, replaceExisting }, 'Failed to import rules')
};

import { createApiClient, post } from './client';
import { getConfig } from '../config';

const client = createApiClient('/naming-rules');

export const namingRulesApi = {
    getAllRules: () => client.getAll('Failed to fetch naming rules'),

    getRuleById: async (id) => {
        // Special handling for 404 - return null instead of throwing
        try {
            const config = getConfig();
            const response = await fetch(`${config.apiBaseUrl}/naming-rules/${id}`);
            if (response.status === 404) return null;
            if (!response.ok) throw new Error('Failed to fetch naming rule');
            return response.json();
        } catch (error) {
            throw error;
        }
    },

    createRule: (rule) => client.create(rule, 'Failed to create naming rule'),

    updateRule: (id, rule) => client.update(id, rule, 'Failed to update naming rule'),

    deleteRule: (id) => client.delete(id, 'Failed to delete naming rule'),

    test: (description) =>
        post('/naming-rules/test', { description }, 'Failed to test naming'),

    testWithRules: (description, ruleIds) =>
        post('/naming-rules/test', { description, ruleIds }, 'Failed to test naming with rules')
};

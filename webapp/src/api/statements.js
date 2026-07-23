/**
 * Statement Management API Client
 *
 * Provides methods for statement retrieval, deletion, and image access.
 */

import { createApiClient } from './client';
import { getConfig } from '../config';

// Create base client for statement endpoints
const statementClient = createApiClient('/statements');

/**
 * Get all statements
 * @returns {Promise<Array>} List of statements with summary information
 */
export async function getAllStatements() {
  return statementClient.getAll('Failed to fetch statements');
}

/**
 * Get statement by ID
 * @param {string} id - Statement ID
 * @returns {Promise<Object>} Statement object with full details including pages and transactions
 */
export async function getStatementById(id) {
  return statementClient.getById(id, 'Failed to fetch statement');
}

/**
 * Get multiple statements by their IDs
 * @param {string[]} ids - Array of statement IDs
 * @returns {Promise<Array>} Array of statement objects
 */
export async function getStatementsByIds(ids) {
  const promises = ids.map(id => getStatementById(id));
  return Promise.all(promises);
}

/**
 * Delete a statement
 * @param {string} id - Statement ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteStatement(id) {
  return statementClient.delete(id, 'Failed to delete statement');
}

/**
 * Get image URL for a GridFS file ID
 * @param {string} fileId - GridFS ObjectId
 * @returns {string} Full URL to the image
 */
export function getImageUrl(fileId) {
  const config = getConfig();
  return `${config.apiBaseUrl}/statements/images/${fileId}`;
}

export default {
  getAllStatements,
  getStatementById,
  getStatementsByIds,
  deleteStatement,
  getImageUrl
};

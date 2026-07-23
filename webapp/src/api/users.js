/**
 * User Management API Client
 *
 * Provides methods for user CRUD operations and authentication.
 */

import { createApiClient } from './client';

// Create base client for user endpoints
const userClient = createApiClient('/users');

/**
 * Get all users
 * @returns {Promise<Array>} List of users
 */
export async function getAllUsers() {
  return userClient.getAll('Failed to fetch users');
}

/**
 * Get user by ID
 * @param {string} id - User ID
 * @returns {Promise<Object>} User object
 */
export async function getUserById(id) {
  return userClient.getById(id, 'Failed to fetch user');
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.userName - Username
 * @param {string} userData.firstName - First name
 * @param {string} userData.lastName - Last name
 * @param {string} userData.email - Email address
 * @param {Array<string>} userData.roles - User roles
 * @param {string} userData.password - Password
 * @returns {Promise<Object>} Created user
 */
export async function createUser(userData) {
  return userClient.create(userData, 'Failed to create user');
}

/**
 * Update an existing user
 * @param {string} id - User ID
 * @param {Object} userData - User data to update
 * @param {string} userData.firstName - First name
 * @param {string} userData.lastName - Last name
 * @param {string} userData.email - Email address
 * @param {Array<string>} userData.roles - User roles
 * @param {boolean} userData.isActive - Active status
 * @param {number} userData.failedLoginAttempts - Failed login attempts
 * @param {string} [userData.newPassword] - New password (optional)
 * @returns {Promise<Object>} Updated user
 */
export async function updateUser(id, userData) {
  return userClient.update(id, userData, 'Failed to update user');
}

/**
 * Delete a user
 * @param {string} id - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteUser(id) {
  return userClient.delete(id, 'Failed to delete user');
}

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};

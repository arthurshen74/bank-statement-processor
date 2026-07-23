import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllUsers, deleteUser } from '../api/users';
import { Heading } from '../ui/heading';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Text } from '../ui/text';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);
      await deleteUser(userToDelete.id);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500 dark:text-zinc-400">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="p-2 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading>User Management</Heading>
          <Text>Manage user accounts and permissions</Text>
        </div>
        <Button color="blue" onClick={() => navigate('/users/new')}>
          <PlusIcon />
          New User
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* User Cards Grid */}
      {users.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400">No users found</p>
          <Button
            className="mt-4"
            color="dark"
            onClick={() => navigate('/users/new')}
          >
            <PlusIcon />
            Create First User
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {users.map((user) => (
            <div
              className={`cursor-pointer relative border rounded-lg p-4 transition-all border-gray-400 bg-white hover:border-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600`}
              onClick={() => navigate(`/users/${user.id}/edit`)}
            >
              {/* User Info */}
              <div className="space-y-3">
                <div className="w-full flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 pr-8 break-words">
                      {user.firstName} {user.lastName}
                    </h3>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      @{user.userName}
                    </div>
                  </div>
                  {/* Status Badge */}
                  <div>
                    {user.isActive ? (
                      <Badge color="green">Active</Badge>
                    ) : (
                      <Badge color="red">Inactive</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {user.email}
                  </p>
                </div>

                {/* Roles */}
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((role) => (
                    <Badge key={role} color="blue">
                      {role}
                    </Badge>
                  ))}
                </div>

                {/* Last Login */}
                <div className="text-xs text-zinc-500 dark:text-zinc-500">
                  Last login: {formatDate(user.lastLogin)}
                </div>

                {/* Lockout Warning */}
                {user.lockoutEndTime &&
                  new Date(user.lockoutEndTime) > new Date() && (
                    <div className="text-xs text-red-600 dark:text-red-400">
                      Locked until {formatDate(user.lockoutEndTime)}
                    </div>
                  )}

                {/* Failed Attempts Warning */}
                {user.failedLoginAttempts > 0 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    Failed login attempts: {user.failedLoginAttempts}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-400 dark:border-gray-700 flex gap-2 justify-end">
                <button
                  onClick={(e) => {
                    // Prevent card onClick
                    e.stopPropagation();
                    handleDeleteClick(user);
                  }}
                  className="cursor-pointer text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete user"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this user?
        </DialogDescription>
        <DialogBody>
          {userToDelete && (
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-4">
              <p className="font-medium text-zinc-900 dark:text-white">
                {userToDelete.firstName} {userToDelete.lastName}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                @{userToDelete.userName} ({userToDelete.email})
              </p>
            </div>
          )}
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            This action cannot be undone.
          </p>
        </DialogBody>
        <DialogActions>
          <Button
            plain
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

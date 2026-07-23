import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUserById, updateUser } from '../api/users';
import { Heading } from '../ui/heading';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Field,
  FieldGroup,
  Fieldset,
  Label,
  Description,
  ErrorMessage,
} from '../ui/fieldset';
import { Checkbox, CheckboxField, CheckboxGroup } from '../ui/checkbox';
import { Switch, SwitchField } from '../ui/switch';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

export default function EditUser() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userRoles: USER_ROLES } = useAuth();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    roles: [],
    isActive: true,
    failedLoginAttempts: 0,
    newPassword: '',
    confirmPassword: '',
  });
  const [originalUser, setOriginalUser] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const user = await getUserById(id);
      setOriginalUser(user);
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles,
        isActive: user.isActive,
        failedLoginAttempts: user.failedLoginAttempts,
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleRoleChange = (role, checked) => {
    setFormData((prev) => ({
      ...prev,
      roles: checked
        ? [...prev.roles, role]
        : prev.roles.filter((r) => r !== role),
    }));
  };

  const handleResetFailedAttempts = () => {
    setFormData((prev) => ({ ...prev, failedLoginAttempts: 0 }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Only validate password if it's being changed
    if (formData.newPassword) {
      if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters';
      } else if (!/[a-zA-Z]/.test(formData.newPassword)) {
        newErrors.newPassword = 'Password must contain at least one letter';
      } else if (!/[0-9]/.test(formData.newPassword)) {
        newErrors.newPassword = 'Password must contain at least one number';
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (formData.roles.length === 0) {
      newErrors.roles = 'At least one role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const { ...userData } = formData;

      // Only include newPassword if it was provided
      const updateData = {
        ...userData,
        newPassword: userData.newPassword || undefined,
      };

      await updateUser(id, updateData);
      navigate('/users');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500 dark:text-zinc-400">Loading user...</p>
      </div>
    );
  }

  if (!originalUser) {
    return (
      <div className="p-2 max-w-7xl mx-auto space-y-6">
        <Button plain onClick={() => navigate('/users')}>
          <ArrowLeftIcon />
          Back to Users
        </Button>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-400">
            User not found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 max-w-7xl mx-auto space-y-6">
      {/* Back Button */}
      <div>
        <Button plain onClick={() => navigate('/users')}>
          <ArrowLeftIcon />
          Back to Users
        </Button>
      </div>

      {/* Header */}
      <div>
        <Heading>Edit User</Heading>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Update user information and settings for{' '}
          <strong>@{originalUser.userName}</strong>
        </p>
      </div>

      {/* API Error */}
      {apiError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-400">{apiError}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Fieldset>
          <FieldGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* First Name */}
            <Field>
              <Label>First Name</Label>
              <Input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                autoComplete="given-name"
                invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <ErrorMessage>{errors.firstName}</ErrorMessage>
              )}
            </Field>

            {/* Last Name */}
            <Field>
              <Label>Last Name</Label>
              <Input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                autoComplete="family-name"
                invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <ErrorMessage>{errors.lastName}</ErrorMessage>
              )}
            </Field>

            {/* Email */}
            <Field>
              <Label>Email Address</Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                invalid={!!errors.email}
              />
              {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
            </Field>

            {/* Roles */}
            <Field>
              <Label>Roles</Label>
              <CheckboxGroup>
                {USER_ROLES.map((role) => (
                  <CheckboxField key={role}>
                    <Checkbox
                      checked={formData.roles.includes(role)}
                      onChange={(checked) => handleRoleChange(role, checked)}
                    />
                    <Label>{role}</Label>
                  </CheckboxField>
                ))}
              </CheckboxGroup>
              {errors.roles && <ErrorMessage>{errors.roles}</ErrorMessage>}
              <Description>Select one or more roles for this user</Description>
            </Field>

            {/* Active Status */}
            <Field>
              <SwitchField>
                <Label className="cursor-pointer text-left">Active</Label>
                <Switch
                  className="cursor-pointer"
                  checked={formData.isActive}
                  onChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </SwitchField>
              <Description className="text-left">
                Inactive users cannot log in
              </Description>
            </Field>

            {/* Failed Login Attempts */}
            <Field>
              <Label>
                {formData.failedLoginAttempts > 0
                  ? `There are ${formData.failedLoginAttempts} failed login attempts`
                  : 'There are no failed login attempts.'}
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  type="hidden"
                  name="failedLoginAttempts"
                  value={formData.failedLoginAttempts}
                  min="0"
                />
                {formData.failedLoginAttempts > 0 && (
                  <Button
                    type="button"
                    outline
                    onClick={handleResetFailedAttempts}
                  >
                    Reset to 0
                  </Button>
                )}
              </div>
            </Field>

            {/* Password Change */}
            <Field>
              <Label>New Password (Optional)</Label>
              <Input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                autoComplete="new-password"
                invalid={!!errors.newPassword}
              />
              {errors.newPassword && (
                <ErrorMessage>{errors.newPassword}</ErrorMessage>
              )}
              <Description>
                Leave blank to keep current password. Minimum 8 characters, at
                least one letter and one number
              </Description>
            </Field>

            {/* Confirm Password */}
            {formData.newPassword && (
              <Field>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  invalid={!!errors.confirmPassword}
                />
                {errors.confirmPassword && (
                  <ErrorMessage>{errors.confirmPassword}</ErrorMessage>
                )}
              </Field>
            )}
          </FieldGroup>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <Button type="submit" color="dark" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update User'}
            </Button>
            <Button
              type="button"
              outline
              onClick={() => navigate('/users')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </Fieldset>
      </form>
    </div>
  );
}

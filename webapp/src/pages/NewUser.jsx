import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser } from '../api/users';
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
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

export default function NewUser() {
  const navigate = useNavigate();
  const { userRoles: USER_ROLES } = useAuth();
  const [formData, setFormData] = useState({
    userName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    roles: [],
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.userName.trim()) {
      newErrors.userName = 'Username is required';
    }

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

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[a-zA-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one letter';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await createUser(userData);
      navigate('/users');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
        <Heading>Create New User</Heading>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Add a new user account with specified roles and permissions
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
            {/* Username */}
            <Field>
              <Label>Username</Label>
              <Input
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                autoComplete="username"
                invalid={!!errors.userName}
              />
              {errors.userName && (
                <ErrorMessage>{errors.userName}</ErrorMessage>
              )}
              <Description>Unique username for login</Description>
            </Field>

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

            {/* Password */}
            <Field>
              <Label>Password</Label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                invalid={!!errors.password}
              />
              {errors.password && (
                <ErrorMessage>{errors.password}</ErrorMessage>
              )}
              <Description>
                Minimum 8 characters, at least one letter and one number
              </Description>
            </Field>

            {/* Confirm Password */}
            <Field>
              <Label>Confirm Password</Label>
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
          </FieldGroup>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <Button type="submit" color="dark" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create User'}
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

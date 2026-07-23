/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { post, registerAuthCallbacks } from '../api/client';

const AuthContext = createContext(null);

/**
 * Decode JWT payload (without verification - only for reading claims)
 * Security note: This is only used for UI decisions. Real auth happens on backend.
 */
function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if JWT is expired
 */
function isTokenExpired(token) {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;

  // exp is in seconds, Date.now() is in milliseconds
  return decoded.exp * 1000 < Date.now();
}

/**
 * Extract user info and roles from JWT
 */
function getUserFromToken(token) {
  const decoded = decodeJWT(token);
  if (!decoded) return null;

  return {
    id: decoded.sub,
    userName: decoded.unique_name,
    email: decoded.email,
    firstName: decoded.given_name,
    lastName: decoded.family_name,
    roles: decoded.role
      ? Array.isArray(decoded.role)
        ? decoded.role
        : [decoded.role]
      : [],
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRoles = ['Admin', 'ReadWrite', 'ReadOnly'];

  const isAuthenticated = !!accessToken && !!user;

  /**
   * Get current access token for API client
   * Read directly from localStorage to avoid stale closure issues
   */
  const getAccessTokenForClient = () => {
    return localStorage.getItem('accessToken');
  };

  /**
   * Logout for API client (separate reference to avoid circular dependency)
   */
  const logoutForClient = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  /**
   * Refresh token function reference for client (defined early to use in useEffect)
   */
  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        return false;
      }

      const data = await post(
        '/auth/refresh',
        { refreshToken },
        'Failed to refresh token',
        { skipAuth: true }
      );

      // Update tokens in localStorage and state
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setAccessToken(data.accessToken);

      // Extract user from new token
      const userFromToken = getUserFromToken(data.accessToken);
      setUser(userFromToken);

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Clear everything on error
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setAccessToken(null);
      setUser(null);
      return false;
    }
  };

  /**
   * Register auth callbacks with API client on mount
   */
  useEffect(() => {
    registerAuthCallbacks({
      getAccessToken: getAccessTokenForClient,
      refreshAccessToken: refreshAccessToken,
      logout: logoutForClient
    });
  }, []);

  /**
   * Initialize auth state on mount from localStorage
   */
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedAccessToken && storedRefreshToken) {
      // Check if access token is expired
      if (isTokenExpired(storedAccessToken)) {
        // Try to refresh it
        console.log('Token expired on page load, attempting refresh...');
        refreshAccessToken()
          .then((result) => {
            if (result) {
              console.log('Token refresh successful on mount.');
            } else {
              console.log('Token refresh failed on mount');
            }
          })
          .catch((e) => console.error('Failed to refresh token on mount:', e))
          .finally(() => setIsLoading(false));
      } else {
        // Use existing token
        setAccessToken(storedAccessToken);
        const userFromToken = getUserFromToken(storedAccessToken);
        setUser(userFromToken);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  /**
   * Set up automatic token refresh before expiration
   * Refreshes 5 minutes before token expires
   */
  useEffect(() => {
    if (!accessToken) return;

    const decoded = decodeJWT(accessToken);
    if (!decoded || !decoded.exp) return;

    // Calculate time until token expires (in milliseconds)
    const expiresAt = decoded.exp * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Refresh 5 minutes before expiry (or immediately if less than 5 minutes left)
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0);

    const timer = setTimeout(() => {
      refreshAccessToken();
    }, refreshTime);

    // Cleanup timer on unmount or when token changes
    return () => clearTimeout(timer);
  }, [accessToken]);

  /**
   * Login with username and password
   */
  const login = async (username, password) => {
    try {
      const data = await post(
        '/auth/login',
        {
          userName: username,
          password: password,
        },
        'Login failed.',
        { skipAuth: true }
      );

      // Store tokens in localStorage and state
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setAccessToken(data.accessToken);

      // Extract user from the JWT token (single source of truth)
      const userFromToken = getUserFromToken(data.accessToken);
      setUser(userFromToken);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed.' };
    }
  };

  /**
   * Logout - clear all auth state
   */
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        // Call revoke endpoint (fire and forget, don't wait for response)
        post(
          '/auth/revoke',
          { refreshToken },
          'Failed to revoke token',
          { skipAuth: true }
        ).catch(() => {
          // Ignore errors - we're logging out anyway
        });
      }
    } finally {
      // Clear state and localStorage regardless of API call success
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  };


  /**
   * Check if user has a specific role
   */
  const hasRole = (role) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles) => {
    if (!user || !user.roles) return false;
    return roles.some((role) => user.roles.includes(role));
  };

  const value = {
    user,
    userRoles,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshAccessToken,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

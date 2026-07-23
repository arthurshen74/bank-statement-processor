import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute component - Protects routes based on authentication and roles
 *
 * Usage:
 *   <ProtectedRoute>
 *     <SomeComponent />
 *   </ProtectedRoute>
 *
 *   <ProtectedRoute allowedRoles={['Admin']}>
 *     <AdminPanel />
 *   </ProtectedRoute>
 *
 *   <ProtectedRoute allowedRoles={['Admin', 'ReadWrite']}>
 *     <EditPage />
 *   </ProtectedRoute>
 */
export function ProtectedRoute({ children, allowedRoles = null }) {
  const { isAuthenticated, isLoading, hasAnyRole } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but need to check roles
  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You do not have permission to access this page.
          </p>
          <p className="text-sm text-gray-500">
            Required roles: {allowedRoles.join(', ')}
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // All checks passed - render the protected content
  return children;
}

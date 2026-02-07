import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

/**
 * Route guard that redirects authenticated users away from public pages
 * Prevents logged-in users from seeing marketing/demo/login pages
 */
export default function PublicOnlyRoute({ children }) {
  const { loading, isAuthenticated } = useAuth();

  // Show nothing while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        </div>
      </div>
    );
  }

  // Redirect authenticated users to dashboard
  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return children;
}

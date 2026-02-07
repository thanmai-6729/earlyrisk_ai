import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the intended destination so we can redirect after login
    const returnTo = location.pathname + location.search;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return children;
}

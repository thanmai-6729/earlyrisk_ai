import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function AppLayout({ children, showNav = true }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {showNav && (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg">
                <span className="material-symbols-outlined text-2xl">favorite</span>
                <span className="hidden sm:inline">Silent Disease Detection</span>
                <span className="sm:hidden">SDD</span>
              </Link>

              {/* Navigation */}
              <nav className="flex items-center gap-1 sm:gap-2">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  Home
                </NavLink>
                <NavLink
                  to="/demo"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  Demo
                </NavLink>

                {isAuthenticated ? (
                  <>
                    <NavLink
                      to="/app"
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      Dashboard
                    </NavLink>
                    <NavLink
                      to="/reports"
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      Reports
                    </NavLink>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
                    <span className="text-sm text-slate-500 dark:text-slate-400 hidden md:inline max-w-[120px] truncate">
                      {user?.email}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/login"
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      Login
                    </NavLink>
                    <NavLink
                      to="/signup"
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                      Sign Up
                    </NavLink>
                  </>
                )}
              </nav>
            </div>
          </div>
        </header>
      )}

      <main>{children}</main>
    </div>
  );
}

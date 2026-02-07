import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth/AuthContext.jsx';

/**
 * Private Navbar - Shown to authenticated users
 * Clean, professional medical system feel
 */
export default function PrivateNavbar() {
  const navigate = useNavigate();
  const { user, displayName, initials, avatarUrl, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Medical System Style */}
          <Link to="/app" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined text-primary text-xl">
                monitoring
              </span>
            </div>
            <div className="hidden sm:block">
              <div className="text-slate-800 font-semibold text-sm leading-tight">EarlyRisk AI</div>
              <div className="text-slate-500 text-xs">Health Intelligence Platform</div>
            </div>
          </Link>

          {/* Main Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <span className="material-symbols-outlined text-lg">dashboard</span>
              Dashboard
            </NavLink>
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <span className="material-symbols-outlined text-lg">summarize</span>
              Reports
            </NavLink>
            <NavLink
              to="/upload"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <span className="material-symbols-outlined text-lg">upload_file</span>
              Upload Report
            </NavLink>
          </nav>

          {/* Profile Section */}
          <div className="flex items-center gap-3">
            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 pr-2 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all duration-200"
              >
                {/* Avatar */}
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white">
                    {initials}
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[100px] truncate">
                  {displayName}
                </span>
                <span className={`material-symbols-outlined text-slate-400 text-base transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}>
                  keyboard_arrow_down
                </span>
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                  >
                    {/* User Info Header */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 px-5 py-4">
                      <div className="flex items-center gap-4">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-14 h-14 rounded-full object-cover ring-4 ring-white shadow-md"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-xl font-bold ring-4 ring-white shadow-md">
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-900 font-semibold text-base truncate">{displayName}</div>
                          <div className="text-slate-500 text-sm truncate">{user?.email}</div>
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            Active
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          navigate('/profile');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-primary/5 hover:text-primary rounded-xl transition-all duration-150 group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                          <span className="material-symbols-outlined text-lg text-slate-500 group-hover:text-primary">person</span>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">My Profile</div>
                          <div className="text-xs text-slate-400 group-hover:text-primary/60">View and edit your profile</div>
                        </div>
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary text-lg">chevron_right</span>
                      </button>

                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          navigate('/settings');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-primary/5 hover:text-primary rounded-xl transition-all duration-150 group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                          <span className="material-symbols-outlined text-lg text-slate-500 group-hover:text-primary">settings</span>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">Settings</div>
                          <div className="text-xs text-slate-400 group-hover:text-primary/60">Preferences & security</div>
                        </div>
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary text-lg">chevron_right</span>
                      </button>

                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          navigate('/reports');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-primary/5 hover:text-primary rounded-xl transition-all duration-150 group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                          <span className="material-symbols-outlined text-lg text-slate-500 group-hover:text-primary">description</span>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">My Reports</div>
                          <div className="text-xs text-slate-400 group-hover:text-primary/60">View health reports</div>
                        </div>
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary text-lg">chevron_right</span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-slate-100 p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all duration-150 group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                          <span className="material-symbols-outlined text-lg text-red-500">logout</span>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">Sign Out</div>
                          <div className="text-xs text-red-400">Log out of your account</div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

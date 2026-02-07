import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Public Navbar - Shown to non-authenticated users
 * Marketing/startup website feel
 */
export default function PublicNavbar() {
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg group">
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">
              favorite
            </span>
            <span className="hidden sm:inline">EarlyRisk AI</span>
            <span className="sm:hidden">ERA</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              Home
            </NavLink>
            <a
              href="/#technology"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('technology');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate('/');
                  setTimeout(() => {
                    const el = document.getElementById('technology');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer"
            >
              Technology
            </a>
            <NavLink
              to="/demo"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              Try Demo
            </NavLink>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200"
            >
              Register
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>
    </motion.header>
  );
}

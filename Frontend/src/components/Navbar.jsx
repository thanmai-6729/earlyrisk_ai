import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark}>SDD</span>
          <span className={styles.brandText}>Silent Disease Detection</span>
        </Link>

        <nav className={styles.nav}>
          <NavLink to="/" className={({ isActive }) => (isActive ? styles.active : styles.link)}>
            Home
          </NavLink>
          <NavLink to="/demo" className={({ isActive }) => (isActive ? styles.active : styles.link)}>
            Demo
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink to="/app" className={({ isActive }) => (isActive ? styles.active : styles.link)}>
                Dashboard
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => (isActive ? styles.active : styles.link)}>
                Reports
              </NavLink>
              <button className={styles.button} onClick={onLogout} type="button">
                Logout
              </button>
              <span className={styles.user}>{user?.email || 'Signed in'}</span>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? styles.active : styles.link)}>
                Login
              </NavLink>
              <NavLink to="/signup" className={({ isActive }) => (isActive ? styles.active : styles.link)}>
                Signup
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

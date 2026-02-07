import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../auth/AuthContext.jsx';
import styles from './Auth.module.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const returnTo = params.get('returnTo') || '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (submitting) return;

      setError('');
      setSubmitting(true);

      try {
        await login(email, password);
        navigate('/app', { replace: true });
      } catch (err) {
        setError(err?.message || 'Login failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, login, navigate, submitting]
  );

  return (
    <div className={styles.authContainer}>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={styles.authCard}
      >
        {/* Left Panel - Branding */}
        <div className={styles.brandingPanel}>
          <div className={styles.brandingContent}>
            <div className={styles.brandLogo}>
              <span className="material-symbols-outlined">medical_services</span>
            </div>
            <blockquote className={styles.brandQuote}>
              "Empowering early detection through advanced AI analysis."
            </blockquote>
            <p className={styles.brandStats}>Join 10,000+ healthcare professionals.</p>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className={styles.formPanel}>
          <div className={styles.formContent}>
            <h1 className={styles.formTitle}>Welcome Back</h1>
            <p className={styles.formSubtitle}>Access your SDD dashboard.</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Email address</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@hospital.com"
                    required
                    className={styles.input}
                  />
                  <span className={`material-symbols-outlined ${styles.inputIcon}`}>mail</span>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Password</label>
                <div className={styles.inputWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className={styles.formOptions}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className={styles.forgotLink}>
                  Forgot password?
                </Link>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.errorMessage}
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={styles.submitButton}
              >
                {submitting && (
                  <span className={styles.spinner} />
                )}
                {submitting ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className={styles.formFooter}>
              <p>
                Don't have an account?{' '}
                <Link to="/signup" className={styles.footerLink}>
                  Sign Up
                </Link>
              </p>
            </div>

            <div className={styles.securityBadge}>
              <span className="material-symbols-outlined">lock</span>
              <span>HIPAA Compliant & Secure</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

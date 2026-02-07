import { useCallback, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../auth/AuthContext.jsx';
import styles from './Auth.module.css';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback((field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  }, []);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { level: 0, text: '', color: '' };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength++;

    if (strength <= 1) return { level: 1, text: 'Weak', color: '#ef4444' };
    if (strength <= 2) return { level: 2, text: 'Fair', color: '#f97316' };
    if (strength <= 3) return { level: 3, text: 'Good', color: '#eab308' };
    if (strength <= 4) return { level: 4, text: 'Strong', color: '#22c55e' };
    return { level: 5, text: 'Very Strong', color: '#10b981' };
  }, [formData.password]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (submitting) return;

      setError('');
      setMessage('');

      // Validation
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }

      setSubmitting(true);

      try {
        const username = formData.username || formData.email.split('@')[0];

        const metadata = {
          username: username,
          full_name: formData.fullName || username,
          age: formData.age ? Number(formData.age) : undefined,
          gender: formData.gender || undefined,
          height_cm: formData.height_cm ? Number(formData.height_cm) : undefined,
          weight_kg: formData.weight_kg ? Number(formData.weight_kg) : undefined,
        };

        const result = await signup(formData.email, formData.password, metadata);

        if (result?.session) {
          navigate('/app', { replace: true });
        } else {
          setMessage('Account created! Check your email to confirm, then log in.');
        }
      } catch (err) {
        setError(err?.message || 'Signup failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [formData, signup, navigate, submitting]
  );

  return (
    <div className={styles.authContainer}>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`${styles.authCard} ${styles.authCardWide}`}
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
            <h1 className={styles.formTitle}>Create Account</h1>
            <p className={styles.formSubtitle}>Start your health monitoring journey.</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    Username <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={handleChange('username')}
                      placeholder="johndoe"
                      required
                      className={styles.input}
                    />
                    <span className={`material-symbols-outlined ${styles.inputIcon}`}>person</span>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Full Name</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange('fullName')}
                      placeholder="John Doe"
                      className={styles.input}
                    />
                    <span className={`material-symbols-outlined ${styles.inputIcon}`}>badge</span>
                  </div>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Email address <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    placeholder="doctor@hospital.com"
                    required
                    className={styles.input}
                  />
                  <span className={`material-symbols-outlined ${styles.inputIcon}`}>mail</span>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    Password <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange('password')}
                      placeholder="••••••••"
                      required
                      minLength={8}
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
                  {formData.password && (
                    <div className={styles.passwordStrength}>
                      <div className={styles.strengthBar}>
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={styles.strengthSegment}
                            style={{
                              backgroundColor: level <= passwordStrength.level ? passwordStrength.color : '#e2e8f0'
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ color: passwordStrength.color }}>{passwordStrength.text}</span>
                    </div>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    Confirm Password <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange('confirmPassword')}
                      placeholder="••••••••"
                      required
                      className={styles.input}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={styles.passwordToggle}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <span className={styles.fieldError}>Passwords do not match</span>
                  )}
                </div>
              </div>

              {/* Optional Profile Info */}
              <div className={styles.optionalSection}>
                <p className={styles.optionalTitle}>
                  Optional: Add basic health info to personalize your experience
                </p>
                <div className={styles.optionalGrid}>
                  <div className={styles.inputGroupSmall}>
                    <label className={styles.inputLabel}>Age</label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={handleChange('age')}
                      placeholder="30"
                      min={1}
                      max={120}
                      className={styles.inputSmall}
                    />
                  </div>

                  <div className={styles.inputGroupSmall}>
                    <label className={styles.inputLabel}>Gender</label>
                    <select
                      value={formData.gender}
                      onChange={handleChange('gender')}
                      className={styles.inputSmall}
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className={styles.inputGroupSmall}>
                    <label className={styles.inputLabel}>Height (cm)</label>
                    <input
                      type="number"
                      value={formData.height_cm}
                      onChange={handleChange('height_cm')}
                      placeholder="170"
                      min={50}
                      max={250}
                      className={styles.inputSmall}
                    />
                  </div>

                  <div className={styles.inputGroupSmall}>
                    <label className={styles.inputLabel}>Weight (kg)</label>
                    <input
                      type="number"
                      value={formData.weight_kg}
                      onChange={handleChange('weight_kg')}
                      placeholder="70"
                      min={10}
                      max={300}
                      className={styles.inputSmall}
                    />
                  </div>
                </div>
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

              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.successMessage}
                >
                  {message}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={styles.submitButton}
              >
                {submitting && <span className={styles.spinner} />}
                {submitting ? 'Creating Account…' : 'Sign Up'}
              </button>
            </form>

            <div className={styles.formFooter}>
              <p>
                Already have an account?{' '}
                <Link to="/login" className={styles.footerLink}>
                  Sign In
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

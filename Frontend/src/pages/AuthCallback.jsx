import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../auth/supabase.js';
import styles from './Auth.module.css';

/**
 * This page handles the email confirmation callback from Supabase.
 * When users click the confirmation link in their email, they are
 * redirected here with tokens in the URL hash.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the hash params from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // Also check query params (some Supabase versions use these)
        const queryParams = new URLSearchParams(window.location.search);
        const errorDescription = queryParams.get('error_description');
        const error = queryParams.get('error');

        if (error || errorDescription) {
          setStatus('error');
          setMessage(errorDescription || error || 'Verification failed');
          return;
        }

        // If we have tokens, set the session
        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setStatus('error');
            setMessage(sessionError.message || 'Failed to verify email');
            return;
          }

          if (data.session) {
            setStatus('success');
            setMessage('Your account is ready. Redirecting to dashboard...');
            
            // Short delay for user to see success message
            setTimeout(() => {
              navigate('/app', { replace: true });
            }, 2000);
            return;
          }
        }

        // If no tokens but type is signup or recovery, try to get session
        if (type === 'signup' || type === 'recovery' || type === 'magiclink') {
          // Wait a moment for Supabase to process
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
          
          if (getSessionError) {
            setStatus('error');
            setMessage(getSessionError.message);
            return;
          }

          if (session) {
            setStatus('success');
            setMessage('Your account is ready. Redirecting to dashboard...');
            setTimeout(() => {
              navigate('/app', { replace: true });
            }, 2000);
            return;
          }
        }

        // If we reach here without success, show error
        setStatus('error');
        setMessage('The verification link has expired. Please request a new one.');
        
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  return (
    <motion.div
      className={styles.authContainer}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.authCard} style={{ maxWidth: '480px', minHeight: 'auto' }}>
        {/* Left accent bar */}
        <div className={styles.brandingPanel} style={{ flex: '0 0 8px', padding: 0 }} />
        
        {/* Content */}
        <div className={styles.formPanel} style={{ padding: '48px 40px' }}>
          <div className={styles.formContent} style={{ maxWidth: '100%', textAlign: 'center' }}>
            
            {status === 'verifying' && (
              <>
                <div style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 24px',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    border: '3px solid #e2e8f0',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                </div>
                <h1 className={styles.formTitle} style={{ marginBottom: '12px' }}>
                  Verifying Your Email
                </h1>
                <p className={styles.formSubtitle} style={{ marginBottom: 0 }}>
                  {message}
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div style={{
                  width: '72px',
                  height: '72px',
                  background: '#f0fdf4',
                  border: '2px solid #bbf7d0',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <span className="material-symbols-outlined" style={{ 
                    fontSize: '36px', 
                    color: '#16a34a',
                    fontVariationSettings: "'FILL' 1"
                  }}>
                    check_circle
                  </span>
                </div>
                <h1 className={styles.formTitle} style={{ marginBottom: '12px', color: '#16a34a' }}>
                  Email Verified
                </h1>
                <p className={styles.formSubtitle} style={{ marginBottom: 0 }}>
                  {message}
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div style={{
                  width: '72px',
                  height: '72px',
                  background: '#fef2f2',
                  border: '2px solid #fecaca',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <span className="material-symbols-outlined" style={{ 
                    fontSize: '36px', 
                    color: '#dc2626' 
                  }}>
                    error
                  </span>
                </div>
                <h1 className={styles.formTitle} style={{ marginBottom: '12px' }}>
                  Verification Failed
                </h1>
                <p className={styles.formSubtitle} style={{ marginBottom: '28px' }}>
                  {message}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <Link to="/login" className={styles.submitButton} style={{ 
                    textDecoration: 'none',
                    padding: '12px 24px',
                    width: 'auto'
                  }}>
                    Go to Login
                  </Link>
                  <Link to="/signup" style={{ 
                    padding: '12px 24px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#3b82f6',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease'
                  }}>
                    Sign Up Again
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; // adjust path if needed

/**
 * Admin Login Page
 * - Firebase Auth (email/password)
 * - No sign-up / register link
 * - Clean red/white professional design
 */
const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onLoginSuccess is optional – parent component can redirect to dashboard
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      // If no callback provided, you could also use:
      // window.location.href = '/';
    } catch (err) {
      // Map Firebase error codes to friendly messages
      switch (err.code) {
        case 'auth/invalid-email':
          setError('Invalid email address.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled.');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.');
          break;
        default:
          setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.outerContainer}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.schoolName}>
            Mother Mary Primary School <span style={styles.lightText}>Limited</span>
          </h1>
          <p style={styles.subtitle}>Admin & Gate Portal</p>
        </div>

        {/* Error message container */}
        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>⚠️</span>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="admin@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Footer note */}
        <p style={styles.footerText}>
          Secure access only • P.O. Box 115301 Wakiso
        </p>
      </div>
    </div>
  );
};

// Inline styles – modern, professional, red/white theme
const styles = {
  outerContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px 32px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.06), 0 4px 10px rgba(0, 0, 0, 0.04)',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
    animation: 'fadeIn 0.3s ease',
  },
  header: {
    marginBottom: '24px',
  },
  schoolName: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '900',
    color: '#991b1b',
    lineHeight: '1.3',
  },
  lightText: {
    fontWeight: '700',
    color: '#475569',
  },
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  errorIcon: {
    fontSize: '16px',
  },
  errorText: {
    color: '#991b1b',
    fontSize: '13px',
    fontWeight: '600',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    textAlign: 'left',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    color: '#475569',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border 0.2s ease, box-shadow 0.2s ease',
    ':focus': {
      borderColor: '#991b1b',
      boxShadow: '0 0 0 3px rgba(153, 27, 27, 0.1)',
    },
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#991b1b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '800',
    cursor: 'pointer',
    transition: 'background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    ':hover': {
      background: '#7f1d1d',
      boxShadow: '0 6px 10px rgba(0, 0, 0, 0.15)',
    },
    ':active': {
      transform: 'translateY(1px)',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
  },
  buttonDisabled: {
    background: '#b91c1c',
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  footerText: {
    marginTop: '24px',
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '500',
  },
};

// Add a global fade-in animation (optional; can be placed in a <style> tag or CSS file)
// This is just to keep the component self-contained – you may omit or replace with your own animation.
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default Login;
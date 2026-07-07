import { useState } from 'react';
import { dbAPI } from '../config/supabase';
import { Fuel, Lock, ArrowLeft } from 'lucide-react';

export default function AuthScreen({ onLoginSuccess }) {
  const [employeeName, setEmployeeName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validNames = ['basil', 'bhagavathi', 'office'];
  const matchedName = validNames.find(n => n === employeeName.trim().toLowerCase());

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!matchedName) {
      setError('Please enter a valid employee name');
      return;
    }
    if (!password) {
      setError('Please enter your password or PIN');
      return;
    }

    setLoading(true);
    setError('');

    const userEmails = {
      basil: import.meta.env.VITE_EMAIL_BASIL || 'basil@gmail.com',
      bhagavathi: import.meta.env.VITE_EMAIL_BHAGAVATHI || 'bhagavathi@gmail.com',
      office: import.meta.env.VITE_EMAIL_OFFICE || 'office@gmail.com'
    };
    const displayName = matchedName.charAt(0).toUpperCase() + matchedName.slice(1);
    const email = userEmails[matchedName];

    const { data, error: loginErr } = await dbAPI.login(email, password);

    if (loginErr) {
      setError(loginErr.message || 'Incorrect password/PIN. Please try again.');
      setLoading(false);
    } else {
      const userSession = {
        name: displayName,
        email: email,
        token: data.session?.access_token,
        ts: Date.now()
      };
      localStorage.setItem('gloe_session_user', JSON.stringify(userSession));
      onLoginSuccess(userSession);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const { error: err } = await dbAPI.loginWithGoogle();
    if (err) {
      setError(err.message || 'Google authentication failed.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.brandHeader}>
          <div style={styles.logoCircle}>
            <Fuel size={28} color="var(--green)" />
          </div>
          <h1 style={styles.brandTitle}>Green Land &<br />Ocean Blue Energy</h1>
          <p style={styles.brandSub}>Shenkottai, Tenkasi</p>
        </div>

        {showPassword ? (
          <form onSubmit={handleLogin} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <button type="button" onClick={() => { setShowPassword(false); setEmployeeName(''); setPassword(''); setError(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-3)' }}>
                <ArrowLeft size={16} />
              </button>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>Sign in with password</span>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Employee name</label>
              <div style={styles.inputWrapper}>
                <input
                  type="text"
                  placeholder="Type your name — Basil, Bhagavathi, Office"
                  value={employeeName}
                  onChange={(e) => { setEmployeeName(e.target.value); setError(''); setPassword(''); }}
                  style={{ ...styles.input, paddingLeft: '12px', textTransform: 'capitalize' }}
                  autoFocus
                />
              </div>
            </div>

            {matchedName && (
              <div style={styles.passwordSection}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Password / PIN</label>
                  <div style={styles.inputWrapper}>
                    <Lock size={16} style={styles.inputIcon} />
                    <input
                      type="password"
                      placeholder="Enter PIN or password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={styles.input}
                      autoFocus
                    />
                  </div>
                </div>
                {error && <div style={styles.errorText}>{error}</div>}
                <button type="submit" disabled={loading}
                  style={{
                    ...styles.submitBtn,
                    background: loading ? 'var(--border-mid)' : 'var(--green)',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Logging in...' : 'Access Dashboard'}
                </button>
              </div>
            )}
            {employeeName && !matchedName && (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>
                Not recognized. Try: Basil, Bhagavathi, or Office
              </div>
            )}
          </form>
        ) : (
          <div style={{ width: '100%' }}>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%', padding: '12px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)',
                background: loading ? 'var(--bg)' : '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: '500', color: 'var(--text)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '10px', transition: 'all .15s', marginBottom: '20px',
                boxShadow: loading ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
              Sign in with Google
            </button>

            {error && <div style={styles.errorText}>{error}</div>}

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: '500' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            <button type="button" onClick={() => setShowPassword(true)}
              style={{
                width: '100%', padding: '10px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)',
                background: 'var(--surface)', cursor: 'pointer',
                fontSize: '13px', fontWeight: '500', color: 'var(--text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <Lock size={14} />
              Sign in with password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'var(--bg)',
    padding: '20px',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth: '400px',
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  brandHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'var(--green-soft)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 12px',
  },
  brandTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text)',
    lineHeight: '1.3',
  },
  brandSub: {
    fontSize: '11px',
    color: 'var(--text-3)',
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  passwordSection: {
    animation: 'fadeIn 0.2s ease-out',
    width: '100%',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '16px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-2)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '10px',
    color: 'var(--text-3)',
  },
  input: {
    width: '100%',
    padding: '9px 12px 9px 34px',
    border: '1px solid var(--border-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
  },
  errorText: {
    color: 'var(--danger)',
    fontSize: '12px',
    marginBottom: '12px',
  },
  submitBtn: {
    width: '100%',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '11px',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.15s',
    textAlign: 'center',
  }
};

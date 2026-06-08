import React, { useState } from 'react';
import { dbAPI, isMockMode } from '../config/supabase';
import { Fuel, Lock, User, AlertTriangle, Check, Building2 } from 'lucide-react';

export default function AuthScreen({ onLoginSuccess }) {
  const [selectedUser, setSelectedUser] = useState(null); // 'Basil', 'Bhagavathi', or 'Office'
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setError('');
    setPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!password) {
      setError('Please enter your password or PIN');
      return;
    }

    setLoading(true);
    setError('');

    // Construct the email for Supabase Auth based on user selection
    const userEmails = {
      basil: import.meta.env.VITE_EMAIL_BASIL || 'basil@gmail.com',
      bhagavathi: import.meta.env.VITE_EMAIL_BHAGAVATHI || 'bhagavathi@gmail.com',
      office: import.meta.env.VITE_EMAIL_OFFICE || 'office@gmail.com'
    };
    const email = userEmails[selectedUser.toLowerCase()];

    const { data, error: loginErr } = await dbAPI.login(email, password);

    if (loginErr) {
      setError(loginErr.message || 'Incorrect password/PIN. Please try again.');
      setLoading(false);
    } else {
      // Login successful! Save profile and session
      const userSession = {
        name: selectedUser,
        email: email,
        token: data.session?.access_token || 'mock-token',
        ts: Date.now()
      };
      localStorage.setItem('gloe_session_user', JSON.stringify(userSession));
      onLoginSuccess(userSession);
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

        {isMockMode && (
          <div style={styles.mockBanner}>
            <AlertTriangle size={16} style={{ marginRight: 8, flexShrink: 0 }} />
            <div>
              <strong>Demo Mode Active:</strong> You can choose either user and enter any password/PIN to log in.
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.sectionLabel}>Select Your Profile</div>
          
          <div style={styles.profileRow}>
            <div 
              style={{
                ...styles.profileCard,
                borderColor: selectedUser === 'Basil' ? 'var(--green)' : 'var(--border)',
                background: selectedUser === 'Basil' ? 'var(--green-soft)' : 'var(--surface)',
              }}
              onClick={() => handleUserSelect('Basil')}
            >
              <div style={{
                ...styles.avatar,
                background: selectedUser === 'Basil' ? 'var(--green)' : 'var(--border-mid)',
                color: selectedUser === 'Basil' ? '#fff' : 'var(--text-2)'
              }}>
                B
              </div>
              <div style={styles.profileName}>Basil</div>
              {selectedUser === 'Basil' && <Check size={14} style={styles.checkIcon} />}
            </div>

            <div 
              style={{
                ...styles.profileCard,
                borderColor: selectedUser === 'Bhagavathi' ? 'var(--green)' : 'var(--border)',
                background: selectedUser === 'Bhagavathi' ? 'var(--green-soft)' : 'var(--surface)',
              }}
              onClick={() => handleUserSelect('Bhagavathi')}
            >
              <div style={{
                ...styles.avatar,
                background: selectedUser === 'Bhagavathi' ? 'var(--green)' : 'var(--border-mid)',
                color: selectedUser === 'Bhagavathi' ? '#fff' : 'var(--text-2)'
              }}>
                Bh
              </div>
              <div style={styles.profileName}>Bhagavathi</div>
              {selectedUser === 'Bhagavathi' && <Check size={14} style={styles.checkIcon} />}
            </div>

            <div 
              style={{
                ...styles.profileCard,
                borderColor: selectedUser === 'Office' ? 'var(--cb)' : 'var(--border)',
                background: selectedUser === 'Office' ? 'var(--cb-soft)' : 'var(--surface)',
              }}
              onClick={() => handleUserSelect('Office')}
            >
              <div style={{
                ...styles.avatar,
                background: selectedUser === 'Office' ? 'var(--cb)' : 'var(--border-mid)',
                color: selectedUser === 'Office' ? '#fff' : 'var(--text-2)'
              }}>
                <Building2 size={16} />
              </div>
              <div style={styles.profileName}>Office</div>
              {selectedUser === 'Office' && <Check size={14} style={styles.checkIcon} />}
            </div>
          </div>

          {selectedUser && (
            <div style={styles.passwordSection}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Enter Password / PIN for {selectedUser}
                </label>
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

              <button 
                type="submit" 
                disabled={loading}
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
        </form>
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
  mockBanner: {
    background: 'var(--warn-soft)',
    color: '#92400e',
    border: '1px solid #fcd34d',
    borderRadius: 'var(--radius)',
    padding: '10px 12px',
    fontSize: '12px',
    lineHeight: '1.4',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
  },
  form: {
    width: '100%',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '10px',
    textAlign: 'center',
  },
  profileRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    width: '100%',
  },
  profileCard: {
    flex: 1,
    border: '2px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.15s ease-in-out',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: '600',
    fontSize: '14px',
    marginBottom: '8px',
    transition: 'all 0.15s ease-in-out',
  },
  profileName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text)',
  },
  checkIcon: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    color: 'var(--green)',
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

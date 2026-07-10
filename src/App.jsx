import { useState, useEffect } from 'react';
import { dbAPI } from './config/supabase';
import Layout from './components/Layout';
import AuthScreen from './components/AuthScreen';
import Toast from './components/Toast';

// Pages
import FillEntry from './pages/FillEntry';
import Customers from './pages/Customers';
import FillHistory from './pages/FillHistory';
import Alerts from './pages/Alerts';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Shifts from './pages/Shifts';
import Pricing from './pages/Pricing';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // App global state loaded from API
  const [customers, setCustomers] = useState([]);
  const [fills, setFills] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active navigation view state
  const officeEmail = import.meta.env.VITE_EMAIL_OFFICE || 'office@gmail.com';

  // Determine role: prefer user_metadata (set in Supabase dashboard), fallback to email
  const getUserRole = (userOrEmail) => {
    if (typeof userOrEmail === 'object' && userOrEmail?.user_metadata?.role) {
      return userOrEmail.user_metadata.role;
    }
    const email = typeof userOrEmail === 'string' ? userOrEmail : (userOrEmail?.email || '');
    return email?.toLowerCase() === officeEmail?.toLowerCase() ? 'office' : 'admin';
  };

  const displayNames = {
    [import.meta.env.VITE_EMAIL_BASIL?.toLowerCase()]: 'Basil',
    [import.meta.env.VITE_EMAIL_BHAGAVATHI?.toLowerCase()]: 'Bhagavathi',
    [import.meta.env.VITE_EMAIL_OFFICE?.toLowerCase()]: 'Office',
  };

  const getUserDisplayName = (email) => {
    if (!email) return 'User';
    return displayNames[email.toLowerCase()] || email.split('@')[0];
  };

  const [activePage, setActivePage] = useState(null);

  // Global toast system state
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('ok'); // 'ok' or 'warn'

  // Check login session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await dbAPI.getCurrentUser();
        if (data.user) {
          // Restore full session from localStorage if available (preserves display name)
          const stored = localStorage.getItem('gloe_session_user');
          if (stored) {
            const session = JSON.parse(stored);
            session.role = getUserRole(session.email);
            setCurrentUser(session);
            setActivePage(session.role === 'office' ? 'dashboard' : 'fill');
          } else {
            const role = getUserRole(data.user);
            setCurrentUser({
              name: getUserDisplayName(data.user.email),
              email: data.user.email,
              role,
            });
            setActivePage(role === 'office' ? 'dashboard' : 'fill');
          }
        }
      } catch (e) {
        console.error('Auth check failed:', e);
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, []);

  // Fetch data from database when user is authenticated
  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [custRes, fillRes, overridesRes] = await Promise.all([
        dbAPI.fetchCustomers(),
        dbAPI.fetchFills(),
        dbAPI.fetchOverrides(),
      ]);

      if (custRes.error) { console.error('Error fetching customers:', custRes.error); triggerToast('Could not load customers', 'warn'); }
      if (fillRes.error) { console.error('Error fetching fills:', fillRes.error); triggerToast('Could not load fill records', 'warn'); }
      if (overridesRes.error) { console.error('Error fetching overrides:', overridesRes.error); triggerToast('Could not load pricing rules', 'warn'); }

      setCustomers(custRes.data || []);
      setFills(fillRes.data || []);
      setOverrides(overridesRes.data || []);
    } catch (e) {
      console.error('Error loading datasets:', e);
      triggerToast('Failed to sync with database. Check your connection and refresh.', 'warn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const triggerToast = (msg, type = 'ok') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleLogout = async () => {
    try {
      await dbAPI.logout();
      localStorage.removeItem('gloe_session_user');
      setCurrentUser(null);
      triggerToast('Logged out successfully');
    } catch (e) {
      triggerToast('Logout failed. Please try again.', 'warn');
    }
  };

  const handleLoginSuccess = (userSession) => {
    userSession.role = getUserRole(userSession.email);
    setCurrentUser(userSession);
    setActivePage(userSession.role === 'office' ? 'dashboard' : 'fill');
    triggerToast(`Welcome back, ${userSession.name}!`);
  };

  // Helper: calculate active alerts count for navigation badge
  const getAlertsCount = () => {
    return customers.filter(c => {
      const custFills = fills
        .filter(f => (f.vehicle || '').toUpperCase() === (c.vehicle || '').toUpperCase())
        .sort((a, b) => new Date(b.ts) - new Date(a.ts));
        
      if (custFills.length === 0) return false;
      const lastFill = custFills[0];
      const diffMs = Date.now() - new Date(lastFill.ts).getTime();
      const days = Math.floor(diffMs / 86400000);
      return days > (Number(import.meta.env.VITE_ACTIVE_DAYS) || 21);
    }).length;
  };

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--text-2)' }}>
        Loading station dashboard...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
        <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />
      </>
    );
  }

  // Render appropriate view based on selection
  const renderPage = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-3)' }}>
          Syncing records with live database...
        </div>
      );
    }

    switch (activePage) {
      case 'fill':
        return (
          <FillEntry 
            currentUser={currentUser}
            triggerToast={triggerToast} 
            refreshData={loadData}
            customers={customers}
            fills={fills}
            overrides={overrides}
          />
        );
      case 'customers':
        return (
          <Customers 
            customers={customers} 
            fills={fills}
            triggerToast={triggerToast}
            refreshData={loadData}
          />
        );
      case 'history':
        return <FillHistory fills={fills} triggerToast={triggerToast} />;
      case 'alerts':
        return <Alerts customers={customers} fills={fills} />;
      case 'dashboard':
        return <Dashboard customers={customers} fills={fills} />;
      case 'reports':
        return <Reports fills={fills} />;
      case 'shifts':
        return <Shifts currentUser={currentUser} triggerToast={triggerToast} />;
      case 'pricing':
        return <Pricing overrides={overrides} customers={customers} triggerToast={triggerToast} refreshData={loadData} />;
      default:
        return currentUser?.role === 'office' 
          ? <Dashboard customers={customers} fills={fills} />
          : <FillEntry currentUser={currentUser} triggerToast={triggerToast} refreshData={loadData} customers={customers} fills={fills} overrides={overrides} />;
    }
  };

  return (
    <>
      <Layout 
        activePage={activePage} 
        setActivePage={setActivePage} 
        currentUser={currentUser}
        userRole={currentUser?.role}
        onLogout={handleLogout}
        alertCount={getAlertsCount()}
      >
        {renderPage()}
      </Layout>

      <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />
    </>
  );
}

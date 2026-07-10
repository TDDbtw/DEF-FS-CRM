import { useState } from 'react';
import { Fuel, Users, ClipboardList, Bell, BarChart3, FileText, Clock, LogOut, Menu, X, Tag } from 'lucide-react';
import { BUSINESS_NAME, BUSINESS_LOCATION } from '../config/constants';


export default function Layout({ 
  children, 
  activePage, 
  setActivePage, 
  currentUser,
  userRole,
  onLogout,
  alertCount 
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOffice = userRole === 'office';

  const menuItems = isOffice
    ? [
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'shifts', label: 'Shifts', icon: Clock },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'history', label: 'Fill History', icon: ClipboardList },
        { id: 'pricing', label: 'Pricing', icon: Tag },
        { 
          id: 'alerts', 
          label: 'Alerts', 
          icon: Bell, 
          badge: alertCount > 0 ? alertCount : null 
        },
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 }
      ]
    : [
        { id: 'fill', label: 'New Fill Entry', icon: Fuel },
        { id: 'shifts', label: 'Shifts', icon: Clock },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'history', label: 'Fill History', icon: ClipboardList },
        { id: 'pricing', label: 'Pricing', icon: Tag },
        { 
          id: 'alerts', 
          label: 'Alerts', 
          icon: Bell, 
          badge: alertCount > 0 ? alertCount : null 
        },
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 }
      ];

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="app">
      {/* Mobile Top Navbar */}
      <header className="mobile-header" style={styles.mobileHeader}>
        <div style={styles.mobileBrand}>
          <span style={styles.mobileBrandName}>GLOBE Station</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          style={styles.menuButton}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{
        ...styles.sidebar,
        display: mobileMenuOpen ? 'flex' : undefined
      }}>
        <div className="sidebar-brand">
          <div className="brand-name">{BUSINESS_NAME}</div>
          <div className="brand-sub">{BUSINESS_LOCATION}</div>
        </div>

        <nav className="sidebar-nav" style={styles.nav}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                style={styles.navItem}
              >
                <Icon size={16} className="nav-icon" />
                <span>{item.label}</span>
                {item.badge && (
                  <span style={styles.badge}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="now-working" style={styles.footerWorking}>
            <div className="nw-label">On shift</div>
            <div style={styles.employeeInfo}>
              <div style={styles.avatarMini}>
                {currentUser?.name?.substring(0, 2) || 'E'}
              </div>
              <div style={styles.employeeName}>
                {currentUser?.name}
                {isOffice && <span style={styles.roleBadge}>Office</span>}
              </div>
            </div>
            <button 
              onClick={onLogout}
              style={styles.logoutBtn}
              title="Sign Out"
            >
              <LogOut size={14} style={{ marginRight: 6 }} />
              <span>Switch Profile</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main" style={styles.main}>
        {children}
      </main>
    </div>
  );
}

const styles = {
  mobileHeader: {
    display: 'none', // Overridden by media query in global CSS
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 150,
  },
  mobileBrand: {
    display: 'flex',
    alignItems: 'center',
  },
  mobileBrandName: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--green)',
  },
  menuButton: {
    background: 'none',
    border: 'none',
    color: 'var(--text-2)',
    cursor: 'pointer',
    padding: '4px',
  },
  sidebar: {
    zIndex: 160,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    width: '100%',
  },
  badge: {
    marginLeft: 'auto',
    background: 'var(--hp)',
    color: '#fff',
    borderRadius: '20px',
    fontSize: '10px',
    padding: '1px 6px',
    fontWeight: '600',
  },
  footerWorking: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  employeeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '4px 0',
  },
  avatarMini: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--green-soft)',
    color: 'var(--green)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: '600',
    border: '1px solid var(--green)',
  },
  employeeName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  roleBadge: {
    fontSize: '9px',
    fontWeight: '600',
    color: 'var(--cb)',
    background: 'var(--cb-soft)',
    padding: '1px 5px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  logoutBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '7px 10px',
    borderRadius: 'var(--radius)',
    fontSize: '11px',
    fontWeight: '500',
    color: 'var(--text-2)',
    border: '1px solid var(--border-mid)',
    background: 'var(--surface)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  main: {
    minHeight: '100vh',
    background: 'var(--bg)',
  }
};

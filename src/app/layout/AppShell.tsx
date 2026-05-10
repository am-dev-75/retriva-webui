import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  MessageSquare, 
  Database, 
  Files, 
  Upload, 
  FileText, 
  Settings,
  Menu,
  X
} from 'lucide-react';
import { useTheme } from '../providers/ThemeProvider';
import { CONFIG } from '../config';
import './AppShell.css';

const getNavItems = (t: any) => [
  { path: '/', icon: MessageSquare, label: t('nav.chat') },
  { path: '/kb', icon: Database, label: t('nav.kb') },
  { path: '/documents', icon: Files, label: t('nav.documents') },
  { path: '/ingestion', icon: Upload, label: t('nav.ingestion') },
  { path: '/artifacts', icon: FileText, label: t('nav.artifacts') },
  { path: '/settings', icon: Settings, label: t('nav.settings') },
];

export const AppShell: React.FC = () => {
  const { t } = useTranslation();
  const { theme, resolvedTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  const navItems = getNavItems(t);

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="app-logo">
            <span className="logo-text">{CONFIG.APP_NAME}</span>
          </div>
          <button className="mobile-close" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon size={20} />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="theme-indicator">
            <span className="theme-dot" style={{ backgroundColor: resolvedTheme === 'dark' ? '#3b82f6' : '#2563eb' }}></span>
            <span className="theme-label">{theme.charAt(0).toUpperCase() + theme.slice(1)} Mode</span>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <header className="main-header">
          <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="header-title">
            {/* Dynamic title could go here */}
          </div>
        </header>
        <div className="main-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

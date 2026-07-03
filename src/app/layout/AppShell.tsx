/**
 * Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { 
  MessageSquare, 
  Database, 
  Files, 
  Upload, 
  FileText, 
  Settings,
  Activity,
  Menu,
  X,
  ChevronDown,
  Check
} from 'lucide-react';
import { useTheme } from '../providers/ThemeProvider';
import { useKnowledgeBase } from '../providers/KnowledgeBaseProvider';
import { CONFIG } from '../config';
import './AppShell.css';

const getNavItems = (t: TFunction) => [
  { path: '/', icon: MessageSquare, label: t('nav.chat') },
  { path: '/kb', icon: Database, label: t('nav.kb') },
  { path: '/documents', icon: Files, label: t('nav.documents') },
  { path: '/ingestion', icon: Upload, label: t('nav.ingestion') },
  { path: '/artifacts', icon: FileText, label: t('nav.artifacts') },
  { path: '/status', icon: Activity, label: t('status_page.title') },
  { path: '/settings', icon: Settings, label: t('nav.settings') },
];

export const AppShell: React.FC = () => {
  const { t } = useTranslation();
  const { theme, resolvedTheme } = useTheme();
  const { selectedKbIds, toggleKbSelection, knowledgeBases } = useKnowledgeBase();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isKbDropdownOpen, setIsKbDropdownOpen] = useState(false);
  const kbDropdownRef = useRef<HTMLDivElement>(null);
  
  const navItems = getNavItems(t);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (kbDropdownRef.current && !kbDropdownRef.current.contains(event.target as Node)) {
        setIsKbDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getKbLabel = () => {
    if (selectedKbIds.length === 0) return 'Select Knowledge Base';
    if (selectedKbIds.length === 1) {
      const kb = knowledgeBases.find(k => k.id === selectedKbIds[0]);
      return kb ? kb.name : selectedKbIds[0];
    }
    return `${selectedKbIds.length} Knowledge Bases selected`;
  };

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="app-logo">
            <img src="/logo.jpg" alt="Retriva Logo" className="logo-img" />
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
          <div className="app-version">
            v{CONFIG.APP_VERSION}
          </div>
        </div>
      </aside>

      <main className="app-main">
        <header className="main-header">
          <div className="header-content-wrapper">
            <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            {location.pathname !== '/kb' && (
            <div className="main-header-title">
              <span className="active-kbs-label">Active KBs:</span>
              <div className="kb-selector-container" ref={kbDropdownRef}>
                <div 
                  className={`kb-selector-trigger ${isKbDropdownOpen ? 'open' : ''}`}
                  onClick={() => setIsKbDropdownOpen(!isKbDropdownOpen)}
                >
                  <Database size={16} />
                  <span className="selected-kb-label">{getKbLabel()}</span>
                  <ChevronDown size={14} className="chevron" />
                </div>

                {isKbDropdownOpen && (
                  <div className="kb-multi-dropdown">
                    {knowledgeBases.map(kb => (
                      <div 
                        key={kb.id} 
                        className={`kb-option ${selectedKbIds.includes(kb.id) ? 'selected' : ''}`}
                        onClick={() => toggleKbSelection(kb.id)}
                      >
                        <div className="checkbox">
                          {selectedKbIds.includes(kb.id) && <Check size={12} />}
                        </div>
                        <span>{kb.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </header>
        <div className="main-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

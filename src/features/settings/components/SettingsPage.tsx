import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Laptop, Shield, Volume2, Globe } from 'lucide-react';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { CONFIG } from '../../../app/config';
import './Settings.css';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="settings-container">
      <header className="page-header">
        <div>
          <h1>{t('settings.title')}</h1>
          <p className="page-subtitle">{t('settings.subtitle')}</p>
        </div>
      </header>

      <section className="settings-section">
        <div className="section-header">
          <Sun size={20} />
          <h3>{t('settings.appearance.title')}</h3>
        </div>
        <div className="settings-card">
          <p className="setting-description">{t('settings.appearance.subtitle')}</p>
          <div className="theme-selector">
            <button 
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <Sun size={24} />
              <span>{t('settings.appearance.light')}</span>
            </button>
            <button 
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={24} />
              <span>{t('settings.appearance.dark')}</span>
            </button>
            <button 
              className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
              onClick={() => setTheme('system')}
            >
              <Laptop size={24} />
              <span>{t('settings.appearance.system')}</span>
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-header">
          <Globe size={20} />
          <h3>{t('settings.language.title')}</h3>
        </div>
        <div className="settings-card disabled">
          <p className="setting-description">{t('settings.language.subtitle')}</p>
          <div className="setting-item">
            <select className="input-field" disabled value="en">
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-header">
          <Shield size={20} />
          <h3>{t('settings.gateway.title')}</h3>
        </div>
        <div className="settings-card">
          <div className="setting-item">
            <div className="setting-label">
              <span className="label-text">{t('settings.gateway.label')}</span>
              <span className="label-hint">{t('settings.gateway.hint')}</span>
            </div>
            <input 
              type="text" 
              className="input-field" 
              value={CONFIG.GATEWAY_BASE_URL} 
              readOnly 
            />
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-header">
          <Volume2 size={20} />
          <h3>{t('settings.speech.title')}</h3>
        </div>
        <div className="settings-card disabled">
          <p className="setting-description">{t('settings.speech.subtitle')}</p>
          <div className="setting-item">
            <div className="setting-label">
              <span className="label-text">{t('settings.speech.enable')}</span>
            </div>
            <div className="toggle-placeholder" />
          </div>
        </div>
      </section>
    </div>
  );
};

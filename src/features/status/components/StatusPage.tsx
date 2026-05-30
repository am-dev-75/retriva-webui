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

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Activity, Layers, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { gatewayClient } from '../../../api/gateway-client';
import { SystemStatusResponse } from '../../../api/types';

export const StatusPage: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await gatewayClient.getSystemStatus();
      setStatus(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    let interval: any;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchStatus();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus]);

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--spacing-xl)' }}>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, margin: 0 }}>{t('status_page.title')}</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>{t('status_page.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              {t('status_page.last_updated')}: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)} 
            />
            {t('status_page.auto_refresh')}
          </label>
          <button 
            className="btn btn-ghost" 
            onClick={fetchStatus}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            {t('status_page.refresh')}
          </button>
        </div>
      </header>

      {error && (
        <div style={{ backgroundColor: 'var(--color-danger)', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {status && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {/* Staged Files */}
          <div className="status-card" style={{ backgroundColor: 'var(--color-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-muted)' }}>
              <Layers size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>{t('status_page.staged_files')}</h3>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {status.staged_files}
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{t('status_page.staged_files_desc')}</p>
          </div>

          {/* Jobs */}
          <div className="status-card" style={{ backgroundColor: 'var(--color-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-muted)' }}>
              <Activity size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>{t('status_page.jobs_summary')}</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} color="var(--color-text-muted)"/> {t('status_page.enqueued')}</span>
                <span style={{ fontWeight: 600 }}>{status.jobs?.enqueued || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><RefreshCw size={16} color="var(--color-primary)"/> {t('status_page.processing')}</span>
                <span style={{ fontWeight: 600 }}>{status.jobs?.processing || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} color="var(--color-success)"/> {t('status_page.completed')}</span>
                <span style={{ fontWeight: 600 }}>{status.jobs?.completed || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={16} color="var(--color-danger)"/> {t('status_page.failed')}</span>
                <span style={{ fontWeight: 600 }}>{status.jobs?.failed || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

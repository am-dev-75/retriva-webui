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

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ExternalLink, Database, FolderOpen } from 'lucide-react';
import { useKnowledgeBase } from '../../../app/providers/KnowledgeBaseProvider';
import { gatewayClient } from '../../../api/gateway-client';
import { AuthInfo, KnowledgeBase } from '../../../api/types';
import './KnowledgeBases.css';

export const KBList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { knowledgeBases, isLoading, refreshKBs, setSelectedKbIds } = useKnowledgeBase();
  const [isCreating, setIsCreating] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAuth = async () => {
      try {
        const info = await gatewayClient.getAuthInfo();
        if (!cancelled) setAuthInfo(info);
      } catch (err) {
        console.error('Failed to fetch auth info:', err);
      }
    };
    fetchAuth();
    return () => { cancelled = true; };
  }, []);

  // Derive the list of collections to display.
  const collections = useMemo<string[]>(() => {
    if (!authInfo) return [];
    if (authInfo.allowed_collections.length > 0) {
      return authInfo.allowed_collections;
    }
    return [authInfo.fallback_collection];
  }, [authInfo]);

  // Group KBs by their collection field. The default KB is always present
  // (seeded by Core at startup), so every collection group will have at
  // least one KB entry.
  const kbsByCollection = useMemo<Record<string, KnowledgeBase[]>>(() => {
    const groups: Record<string, KnowledgeBase[]> = {};
    for (const kb of knowledgeBases) {
      const col = kb.collection || authInfo?.fallback_collection || 'default';
      if (!groups[col]) groups[col] = [];
      groups[col].push(kb);
    }
    return groups;
  }, [knowledgeBases, authInfo]);

  const handleCreate = async () => {
    if (!newKbName.trim()) return;
    try {
      await gatewayClient.createKB(newKbName.trim());
      setNewKbName('');
      setIsCreating(false);
      await refreshKBs();
    } catch (error) {
      console.error('Failed to create KB:', error);
    }
  };

  const handleDelete = async (kbId: string) => {
    if (window.confirm(t('kb.confirm_delete'))) {
      try {
        await gatewayClient.deleteKB(kbId);
        await refreshKBs();
      } catch (error) {
        console.error('Failed to delete KB:', error);
      }
    }
  };

  const handleViewDocs = (kbId: string) => {
    setSelectedKbIds([kbId]);
    navigate('/documents', { state: { performSearch: true } });
  };

  return (
    <div className="kb-container">
      <section className="collections-section">
        <header className="section-header">
          <h2>{t('collections.title')}</h2>
          <p className="page-subtitle">{t('collections.subtitle')}</p>
        </header>
        <div className="collections-grid">
          {authInfo ? (
            authInfo.allowed_collections.length > 0 ? (
              authInfo.allowed_collections.map((col) => (
                <div key={col} className={`collection-chip ${col === authInfo.default_collection ? 'default' : ''}`}>
                  <span>{col}</span>
                  {col === authInfo.default_collection && (
                    <span className="badge">{t('collections.default_badge')}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="collection-chip default">
                <span>{authInfo.fallback_collection}</span>
                <span className="badge">{t('collections.anonymous_mode')}</span>
              </div>
            )
          ) : (
            <div className="skeleton-chip" />
          )}
        </div>
      </section>

      <hr className="section-divider" />

      <header className="page-header">
        <div>
          <h1>{t('kb.title')}</h1>
          <p className="page-subtitle">{t('kb.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          <Plus size={18} />
          {t('kb.create_btn')}
        </button>
      </header>

      {isCreating && (
        <div className="create-kb-card">
          <h3>{t('kb.create_title')}</h3>
          <input 
            type="text" 
            placeholder={t('kb.name_placeholder')} 
            value={newKbName}
            onChange={(e) => setNewKbName(e.target.value)}
            className="input-field"
            autoFocus
          />
          <div className="card-actions">
            <button className="btn btn-ghost" onClick={() => setIsCreating(false)}>{t('common.cancel')}</button>
            <button className="btn btn-primary" onClick={handleCreate}>{t('common.create')}</button>
          </div>
        </div>
      )}

      <div className="kb-hierarchy">
        {collections.length === 0 ? (
          <div className="skeleton-chip" />
        ) : (
          collections.map((col) => {
            const isDefault = authInfo ? col === authInfo.default_collection : false;
            const isAnonymous = authInfo ? authInfo.is_anonymous && authInfo.allowed_collections.length === 0 : false;
            const kbs = kbsByCollection[col] || [];

            return (
              <div key={col} className="collection-group">
                <div className="collection-group-header">
                  <FolderOpen size={20} className="collection-group-icon" />
                  <h2 className="collection-group-title">{col}</h2>
                  {isDefault && (
                    <span className="badge">{t('collections.default_badge')}</span>
                  )}
                  {isAnonymous && (
                    <span className="badge">{t('collections.anonymous_mode')}</span>
                  )}
                  <span className="collection-group-count">
                    {isLoading ? '…' : kbs.length}
                  </span>
                </div>
                <div className="collection-group-body">
                  {isLoading ? (
                    <div className="kb-hierarchy-loading">{t('common.loading')}</div>
                  ) : kbs.length === 0 ? (
                    <div className="kb-hierarchy-empty">{t('kb.empty_state')}</div>
                  ) : (
                    <div className="kb-grid">
                      {kbs.map((kb) => (
                        <div key={kb.id} className="kb-card">
                          <div className="kb-card-header">
                            <div className="kb-icon">
                              <Database size={24} />
                            </div>
                            <div className="kb-info">
                              <h3>{kb.name}</h3>
                              <span className={`status-badge ${kb.status}`}>{kb.status}</span>
                            </div>
                          </div>
                          <div className="kb-stats">
                            <div className="stat">
                              <span className="stat-value">{kb.document_count}</span>
                              <span className="stat-label">{t('kb.doc_count')}</span>
                            </div>
                          </div>
                          <div className="kb-card-footer">
                            <button 
                              className="btn-icon" 
                              title={t('kb.view_docs')}
                              onClick={() => handleViewDocs(kb.id)}
                            >
                              <ExternalLink size={18} />
                            </button>
                            {kb.id !== 'default' && (
                              <button 
                                className="btn-icon danger" 
                                title={t('kb.delete_title')}
                                onClick={() => handleDelete(kb.id)}
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

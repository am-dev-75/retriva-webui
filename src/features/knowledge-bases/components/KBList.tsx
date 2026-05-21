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

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ExternalLink, Database } from 'lucide-react';
import { useKnowledgeBase } from '../../../app/providers/KnowledgeBaseProvider';
import { gatewayClient } from '../../../api/gateway-client';
import './KnowledgeBases.css';

export const KBList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { knowledgeBases, isLoading, refreshKBs, setSelectedKbIds } = useKnowledgeBase();
  const [isCreating, setIsCreating] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (knowledgeBases.length === 0) return;
    let cancelled = false;

    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        knowledgeBases.map(async (kb) => {
          try {
            const docs = await gatewayClient.getDocuments(kb.id);
            counts[kb.id] = docs.length;
          } catch {
            counts[kb.id] = 0;
          }
        })
      );
      if (!cancelled) setDocCounts(counts);
    };

    fetchCounts();
    return () => { cancelled = true; };
  }, [knowledgeBases]);
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

  return (
    <div className="kb-container">
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

      <div className="kb-grid">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="kb-card skeleton" />)
        ) : knowledgeBases.length === 0 ? (
          <div className="empty-state">
            <p>{t('kb.empty_state')}</p>
          </div>
        ) : (
          knowledgeBases.map((kb) => (
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
                  <span className="stat-value">{docCounts[kb.id] ?? kb.document_count}</span>
                  <span className="stat-label">{t('kb.doc_count')}</span>
                </div>
              </div>
              <div className="kb-card-footer">
                <button 
                  className="btn-icon" 
                  title={t('kb.view_docs')}
                  onClick={() => {
                    setSelectedKbIds([kb.id]);
                    navigate('/documents', { state: { performSearch: true } });
                  }}
                >
                  <ExternalLink size={18} />
                </button>
                <button 
                  className="btn-icon danger" 
                  title={t('kb.delete_title')}
                  onClick={() => handleDelete(kb.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

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
import { Plus, Trash2, ExternalLink, Database } from 'lucide-react';
import { KnowledgeBase } from '../../../api/types';
import './KnowledgeBases.css';

export const KBList: React.FC = () => {
  const { t } = useTranslation();
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKbName, setNewKbName] = useState('');

  useEffect(() => {
    loadKbs();
  }, []);

  const loadKbs = async () => {
    setIsLoading(true);
    try {
      // Mocking for now
      setTimeout(() => {
        setKbs([
          { id: '1', name: 'Company Handbook', document_count: 12, status: 'active' },
          { id: '2', name: 'Product Specs', document_count: 45, status: 'active' },
          { id: '3', name: 'Research Papers', document_count: 3, status: 'processing' },
        ]);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Failed to load KBs:', error);
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newKbName.trim()) return;
    try {
      const newKb: KnowledgeBase = {
        id: Date.now().toString(),
        name: newKbName,
        document_count: 0,
        status: 'active'
      };
      setKbs([...kbs, newKb]);
      setNewKbName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create KB:', error);
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
        ) : (
          kbs.map((kb) => (
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
                <button className="btn-icon" title={t('kb.view_docs')}>
                  <ExternalLink size={18} />
                </button>
                <button className="btn-icon danger" title={t('kb.delete_title')}>
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

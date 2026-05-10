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
import { Download, FileText, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Artifact } from '../../../api/types';
import { formatDate } from '../../../lib/formatting';
import './Artifacts.css';

export const ArtifactList: React.FC = () => {
  const { t } = useTranslation();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mocking
    setTimeout(() => {
      setArtifacts([
        { id: '1', name: 'Annual Report Summary', type: 'pdf', status: 'completed', created_at: new Date().toISOString() },
        { id: '2', name: 'Project Timeline', type: 'markdown', status: 'completed', created_at: new Date().toISOString() },
        { id: '3', name: 'Raw Extraction', type: 'docx', status: 'pending', created_at: new Date().toISOString() },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  return (
    <div className="artifacts-container">
      <header className="page-header">
        <div>
          <h1>{t('artifacts.title')}</h1>
          <p className="page-subtitle">{t('artifacts.subtitle')}</p>
        </div>
      </header>

      <div className="artifacts-grid">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="artifact-card skeleton" />)
        ) : artifacts.length === 0 ? (
          <div className="empty-state">{t('artifacts.empty_state')}</div>
        ) : (
          artifacts.map((art) => (
            <div key={art.id} className="artifact-card">
              <div className="artifact-icon">
                <FileText size={24} />
              </div>
              <div className="artifact-info">
                <h3>{art.name}</h3>
                <div className="artifact-meta">
                  <span className="artifact-type">{art.type.toUpperCase()}</span>
                  <span className="dot">•</span>
                  <span className="artifact-date">{formatDate(art.created_at)}</span>
                </div>
              </div>
              <div className="artifact-status">
                {art.status === 'completed' ? (
                  <CheckCircle size={18} className="text-success" />
                ) : art.status === 'pending' ? (
                  <Clock size={18} className="text-warning" />
                ) : (
                  <AlertCircle size={18} className="text-danger" />
                )}
              </div>
              <div className="artifact-actions">
                <button 
                  className="btn btn-ghost btn-icon" 
                  disabled={art.status !== 'completed'}
                  title="Download"
                >
                  <Download size={18} />
                </button>
                <button className="btn btn-ghost btn-icon danger" title="Delete">
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

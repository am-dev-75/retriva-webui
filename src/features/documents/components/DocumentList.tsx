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
import { Search, Filter, FileText, Trash2 } from 'lucide-react';
import { Document } from '../../../api/types';
import { gatewayClient } from '../../../api/gateway-client';
import { formatFileSize, formatDate } from '../../../lib/formatting';
import { MetadataFilterManager } from '../../metadata/components/MetadataFilter';
import { useMetadataFilters } from '../../metadata/hooks/useMetadataFilters';
import { useKnowledgeBase } from '../../../app/providers/KnowledgeBaseProvider';
import { Info } from 'lucide-react';
import './Documents.css';

type DocumentView = Document & {
  page_title?: string;
  source_path?: string;
  ingested_at?: string | number;
  ingestion_completed_at?: string | number;
};

const FALLBACK_VALUE = '—';

const normalizeDateValue = (value?: string | number): string | number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  if (typeof value === 'number') {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  if (/^\d+$/.test(value)) {
    const numericValue = Number(value);
    return numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue;
  }

  return value;
};

const toTagList = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}: ${String(v)}`);
  }

  return [String(value)];
};

const getUserProvidedTags = (doc: DocumentView): string[] => {
  const metadata = doc.metadata || {};

  return [
    ...toTagList(metadata.user_provided_tags),
    ...toTagList(metadata.user_provided?.tags),
    ...toTagList(metadata.user_provided),
    ...toTagList(metadata.user_metadata?.tags),
  ];
};

const getMetadataTags = (doc: DocumentView): string[] => {
  if (!doc.metadata) return [];

  return Object.entries(doc.metadata)
    .filter(([key, value]) => {
      if (value === undefined || value === null || value === '') return false;
      return !['user_provided', 'user_provided_tags', 'user_metadata'].includes(key);
    })
    .map(([key, value]) => `${key}: ${String(value)}`);
};

const getDocumentDisplayName = (doc: DocumentView): string => {
  if (doc.filename) return doc.filename;
  if (doc.page_title) return doc.page_title;
  if (doc.source_path) return doc.source_path.split('/').pop() || doc.source_path;
  return FALLBACK_VALUE;
};

const getDocumentCreatedAt = (doc: DocumentView): string => {
  const metadata = doc.metadata || {};

  const dateValue = normalizeDateValue(
    doc.ingested_at ||
    doc.ingestion_completed_at ||
    metadata.ingested_at ||
    metadata.ingestion_completed_at ||
    doc.created_at ||
    metadata.created_at
  );

  if (!dateValue) return FALLBACK_VALUE;

  try {
    return formatDate(dateValue);
  } catch {
    return FALLBACK_VALUE;
  }
};

export const DocumentList: React.FC = () => {
  const { t } = useTranslation();
  const { selectedKbIds } = useKnowledgeBase();
  const [documents, setDocuments] = useState<DocumentView[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const { 
    filters: activeFilters, 
    mode: filterMode, 
    updateFilters, 
    setFilterMode 
  } = useMetadataFilters();

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      // If we have a search term or filters, use search API
      if (searchTerm || activeFilters.length > 0) {
        const results = await gatewayClient.searchDocuments(
          selectedKbIds,
          searchTerm,
          activeFilters.length > 0 ? activeFilters : undefined,
          filterMode
        );
        setDocuments(results as DocumentView[]);
      } else {
        // Otherwise just get all documents (optionally filtered by first selected KB)
        const kbId = selectedKbIds.length > 0 ? selectedKbIds[0] : undefined;
        const results = await gatewayClient.getDocuments(kbId);
        setDocuments(results as DocumentView[]);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [selectedKbIds]); // Reload when KBs change

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments();
  };

  return (
    <div className="documents-container">
      <header className="page-header">
        <div>
          <h1>{t('documents.title')}</h1>
          <p className="page-subtitle">{t('documents.subtitle')}</p>
        </div>
      </header>

      <div className="table-controls">
        <form className="search-bar" onSubmit={handleSearch}>
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder={t('documents.search_placeholder')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>
        <button 
          className={`btn btn-ghost ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
          {t('common.filter')}
        </button>
      </div>

      {showFilters && (
        <div className="documents-filters-panel">
          <MetadataFilterManager 
            onFilterChange={updateFilters}
            initialFilters={activeFilters}
            initialMode={filterMode}
          />
          <div className="filter-actions">
            <button className="btn btn-primary btn-sm" onClick={loadDocuments}>
              Apply Filters
            </button>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('documents.table.filename')}</th>
              <th>{t('documents.table.kb')}</th>
              <th>{t('documents.table.size')}</th>
              <th>{t('documents.table.tags')}</th>
              <th>{t('documents.table.user_provided_tags')}</th>
              <th>{t('common.status')}</th>
              <th>{t('documents.table.created')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan={8}><div className="shimmer" /></td>
                </tr>
              ))
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-row">
                  <div className="empty-state-content">
                    <p>No documents found</p>
                    {filterMode === 'hard' && activeFilters.length > 0 && (
                      <div className="empty-suggestion">
                        <Info size={16} />
                        <span>
                          No results match your <strong>strict</strong> filters. 
                          <button 
                            className="suggestion-link"
                            onClick={() => {
                              setFilterMode('soft');
                              // loadDocuments will be triggered by useEffect if we add dependency, 
                              // or we can call it manually here.
                              setTimeout(loadDocuments, 0);
                            }}
                          >
                            Try switching to "Ranking Hints"
                          </button>
                        </span>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="filename-cell">
                    <FileText size={16} />
                    <span>{getDocumentDisplayName(doc)}</span>
                  </td>
                  <td>{doc.kb_id}</td>
                  <td>{formatFileSize(doc.size)}</td>
                  <td className="tags-cell">
                    {getMetadataTags(doc).length > 0 ? getMetadataTags(doc).map((tag) => (
                      <span key={tag} className="tag-badge" title={tag}>
                        {tag}
                      </span>
                    )) : <span className="muted-value">{FALLBACK_VALUE}</span>}
                  </td>
                  <td className="tags-cell">
                    {getUserProvidedTags(doc).length > 0 ? getUserProvidedTags(doc).map((tag) => (
                      <span key={tag} className="tag-badge" title={tag}>
                        {tag}
                      </span>
                    )) : <span className="muted-value">{FALLBACK_VALUE}</span>}
                  </td>
                  <td>
                    <span className={`status-badge ${doc.ingestion_status}`}>
                      {doc.ingestion_status || FALLBACK_VALUE}
                    </span>
                  </td>
                  <td>{getDocumentCreatedAt(doc)}</td>
                  <td className="actions-cell">
                    <button className="btn-icon danger">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, FileText, Trash2 } from 'lucide-react';
import { Document } from '../../../api/types';
import { formatFileSize, formatDate } from '../../../lib/formatting';
import './Documents.css';

export const DocumentList: React.FC = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mocking
    setTimeout(() => {
      setDocuments([
        { id: '1', kb_id: '1', filename: 'CompanyPolicy.pdf', size: 102456, content_type: 'application/pdf', metadata: {}, ingestion_status: 'completed', created_at: new Date().toISOString() },
        { id: '2', kb_id: '1', filename: 'Benefits.docx', size: 45678, content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', metadata: {}, ingestion_status: 'completed', created_at: new Date().toISOString() },
        { id: '3', kb_id: '2', filename: 'Spec_A1.pdf', size: 2345678, content_type: 'application/pdf', metadata: { version: '1.0' }, ingestion_status: 'completed', created_at: new Date().toISOString() },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const filteredDocs = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="documents-container">
      <header className="page-header">
        <div>
          <h1>{t('documents.title')}</h1>
          <p className="page-subtitle">{t('documents.subtitle')}</p>
        </div>
      </header>

      <div className="table-controls">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder={t('documents.search_placeholder')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost">
          <Filter size={18} />
          {t('common.filter')}
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('documents.table.filename')}</th>
              <th>{t('documents.table.kb')}</th>
              <th>{t('documents.table.size')}</th>
              <th>{t('common.status')}</th>
              <th>{t('documents.table.created')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan={6}><div className="shimmer" /></td>
                </tr>
              ))
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">No documents found</td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc.id}>
                  <td className="filename-cell">
                    <FileText size={16} />
                    <span>{doc.filename}</span>
                  </td>
                  <td>KB-{doc.kb_id}</td>
                  <td>{formatFileSize(doc.size)}</td>
                  <td>
                    <span className={`status-badge ${doc.ingestion_status}`}>
                      {doc.ingestion_status}
                    </span>
                  </td>
                  <td>{formatDate(doc.created_at)}</td>
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

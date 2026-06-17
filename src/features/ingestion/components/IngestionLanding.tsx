import React, { useState } from 'react';
import { UploadPanel } from './UploadPanel';
import { ConnectedSourcesList } from './ConnectedSourcesList';
import './IngestionLanding.css';

export const IngestionLanding: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'static' | 'connected'>('static');

  return (
    <div className="ingestion-landing-container">
      <div className="ingestion-tabs">
        <button 
          className={`tab-btn ${activeTab === 'static' ? 'active' : ''}`}
          onClick={() => setActiveTab('static')}
        >
          Static Upload
        </button>
        <button 
          className={`tab-btn ${activeTab === 'connected' ? 'active' : ''}`}
          onClick={() => setActiveTab('connected')}
        >
          Connected Sources
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'static' && <UploadPanel />}
        {activeTab === 'connected' && <ConnectedSourcesList />}
      </div>
    </div>
  );
};

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

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadPanel } from './UploadPanel';
import { ConnectedSourcesList } from './ConnectedSourcesList';
import './IngestionLanding.css';

export const IngestionLanding: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'static' | 'connected'>('static');

  return (
    <div className="ingestion-landing-container">
      <div className="ingestion-tabs">
        <button 
          className={`tab-btn ${activeTab === 'static' ? 'active' : ''}`}
          onClick={() => setActiveTab('static')}
        >
          {t('ingestion.tab_static')}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'connected' ? 'active' : ''}`}
          onClick={() => setActiveTab('connected')}
        >
          {t('ingestion.tab_dynamic')}
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'static' && <UploadPanel />}
        {activeTab === 'connected' && <ConnectedSourcesList />}
      </div>
    </div>
  );
};

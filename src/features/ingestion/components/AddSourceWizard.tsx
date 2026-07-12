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
import { gatewayClient } from '../../../api/gateway-client';
import { KnowledgeBase, CreateSourceRequest } from '../../../api/types';
import './AddSourceWizard.css';

interface WizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const AddSourceWizard: React.FC<WizardProps> = ({ onComplete, onCancel }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);

  const [formData, setFormData] = useState({
    display_name: '',
    connector_type: 'mediawiki',
    api_url: '',
    auth_mode: 'none',
    auth_credentials: '', // transient, won't be persisted locally
    include_categories: '',
    exclude_categories: '',
    allowed_namespaces: '0',
    target_kb_id: '',
    sync_interval_minutes: '15',
    delete_policy: 'soft_delete',
    availability_policy: 'hide_until_initial_sync_complete',
    metadata_json: '{\n  "source_system": "mediawiki"\n}'
  });

  useEffect(() => {
    gatewayClient.getKBs().then(setKbs).catch(console.error);
  }, []);

  const handleNext = () => {
    setError(null);
    setStep(s => Math.min(s + 1, 6));
  };

  const handlePrev = () => {
    setError(null);
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      let parsedMetadata = {};
      try {
        parsedMetadata = JSON.parse(formData.metadata_json);
      } catch {
        throw new Error(t('ingestion.wizard.invalid_json'));
      }

      const payload: CreateSourceRequest = {
        display_name: formData.display_name,
        connector_type: formData.connector_type,
        target_kb_id: formData.target_kb_id,
        api_url: formData.api_url,
        auth_mode: formData.auth_mode as 'bot_password' | 'oauth' | 'none',
        allowed_namespaces: formData.allowed_namespaces.split(',').map(c => parseInt(c.trim(), 10)).filter(n => !isNaN(n)),
        include_categories: formData.include_categories.split(',').map(c => c.trim()).filter(Boolean),
        exclude_categories: formData.exclude_categories.split(',').map(c => c.trim()).filter(Boolean),
        delete_policy: formData.delete_policy as 'soft_delete' | 'hard_delete',
        availability_policy: formData.availability_policy as 'hide_until_initial_sync_complete' | 'immediate',
        metadata: parsedMetadata as Record<string, string>
      };

      if (formData.sync_interval_minutes.trim() !== '') {
        payload.sync_interval_minutes = parseInt(formData.sync_interval_minutes, 10);
      }

      if (formData.auth_mode !== 'none') {
        payload.credentials = formData.auth_credentials;
      }

      await gatewayClient.createSource(payload);
      onComplete();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to create source');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <h2>{t('ingestion.wizard.title')}</h2>
        <div className="wizard-steps">
          {t('ingestion.wizard.step_of', { step })}
        </div>
      </div>

      <div className="wizard-content">
        {error && <div className="wizard-error">{error}</div>}

        {step === 1 && (
          <div className="wizard-step">
            <h3>{t('ingestion.wizard.step_source_type')}</h3>
            <div className="form-group">
              <label>{t('ingestion.wizard.display_name')}</label>
              <input 
                type="text" 
                value={formData.display_name}
                onChange={e => setFormData({...formData, display_name: e.target.value})}
                placeholder={t('ingestion.wizard.display_name_placeholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('ingestion.wizard.connector_type')}</label>
              <select 
                value={formData.connector_type}
                onChange={e => setFormData({...formData, connector_type: e.target.value})}
              >
                <option value="mediawiki">MediaWiki</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step">
            <h3>{t('ingestion.wizard.step_connection')}</h3>
            <div className="form-group">
              <label>{t('ingestion.wizard.api_url')}</label>
              <input 
                type="url" 
                value={formData.api_url}
                onChange={e => setFormData({...formData, api_url: e.target.value})}
                placeholder={t('ingestion.wizard.api_url_placeholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('ingestion.wizard.auth_mode')}</label>
              <select 
                value={formData.auth_mode}
                onChange={e => setFormData({...formData, auth_mode: e.target.value})}
              >
                <option value="none">{t('ingestion.wizard.auth_none')}</option>
                <option value="bot_password">{t('ingestion.wizard.auth_bot_password')}</option>
                <option value="oauth">{t('ingestion.wizard.auth_oauth')}</option>
              </select>
            </div>
            {formData.auth_mode !== 'none' && (
              <div className="form-group">
                <label>{t('ingestion.wizard.credentials')}</label>
                <input 
                  type="password" 
                  value={formData.auth_credentials}
                  onChange={e => setFormData({...formData, auth_credentials: e.target.value})}
                  placeholder={t('ingestion.wizard.credentials_placeholder')}
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step">
            <h3>{t('ingestion.wizard.step_scope')}</h3>
            <div className="form-group">
              <label>{t('ingestion.wizard.include_categories')}</label>
              <input 
                type="text" 
                value={formData.include_categories}
                onChange={e => setFormData({...formData, include_categories: e.target.value})}
                placeholder={t('ingestion.wizard.include_categories_placeholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('ingestion.wizard.exclude_categories')}</label>
              <input 
                type="text" 
                value={formData.exclude_categories}
                onChange={e => setFormData({...formData, exclude_categories: e.target.value})}
                placeholder={t('ingestion.wizard.exclude_categories_placeholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('ingestion.wizard.allowed_namespaces')}</label>
              <input 
                type="text" 
                value={formData.allowed_namespaces}
                onChange={e => setFormData({...formData, allowed_namespaces: e.target.value})}
                placeholder={t('ingestion.wizard.allowed_namespaces_placeholder')}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="wizard-step">
            <h3>{t('ingestion.wizard.step_target')}</h3>
            <div className="form-group">
              <label>{t('ingestion.wizard.target_kb')}</label>
              <select 
                value={formData.target_kb_id}
                onChange={e => setFormData({...formData, target_kb_id: e.target.value})}
              >
                <option value="">{t('ingestion.wizard.select_kb')}</option>
                {kbs.map(kb => (
                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('ingestion.wizard.delete_policy')}</label>
              <select 
                value={formData.delete_policy}
                onChange={e => setFormData({...formData, delete_policy: e.target.value})}
              >
                <option value="soft_delete">{t('ingestion.wizard.soft_delete')}</option>
                <option value="hard_delete">{t('ingestion.wizard.hard_delete')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('ingestion.wizard.availability_policy')}</label>
              <select 
                value={formData.availability_policy}
                onChange={e => setFormData({...formData, availability_policy: e.target.value})}
              >
                <option value="hide_until_initial_sync_complete">{t('ingestion.wizard.hide_until_sync')}</option>
                <option value="immediate">{t('ingestion.wizard.immediate')}</option>
              </select>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="wizard-step">
            <h3>{t('ingestion.wizard.step_sync')}</h3>
            <div className="form-group">
              <label>{t('ingestion.wizard.sync_interval')}</label>
              <input 
                type="number" 
                value={formData.sync_interval_minutes}
                onChange={e => setFormData({...formData, sync_interval_minutes: e.target.value})}
                placeholder={t('ingestion.wizard.sync_interval_placeholder')}
              />
              <small>{t('ingestion.wizard.sync_interval_hint')}</small>
            </div>
            <div className="form-group">
              <label>{t('ingestion.wizard.metadata_json')}</label>
              <textarea 
                rows={4}
                value={formData.metadata_json}
                onChange={e => setFormData({...formData, metadata_json: e.target.value})}
                placeholder='{"department": "rd"}'
              />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="wizard-step review-step">
            <h3>{t('ingestion.wizard.step_review')}</h3>
            <div className="review-section">
              <p><strong>{t('ingestion.wizard.review_name')}:</strong> {formData.display_name}</p>
              <p><strong>{t('ingestion.wizard.review_api_url')}:</strong> {formData.api_url}</p>
              <p><strong>{t('ingestion.wizard.review_auth_mode')}:</strong> {formData.auth_mode}</p>
              {formData.auth_mode !== 'none' && (
                <p><strong>{t('ingestion.wizard.review_credentials')}:</strong> {t('ingestion.wizard.review_credentials_redacted')}</p>
              )}
              <p><strong>{t('ingestion.wizard.review_target_kb')}:</strong> {kbs.find(k => k.id === formData.target_kb_id)?.name || formData.target_kb_id}</p>
              <p><strong>{t('ingestion.wizard.review_sync_interval')}:</strong> {formData.sync_interval_minutes || t('ingestion.wizard.review_manual')}</p>
            </div>
          </div>
        )}
      </div>

      <div className="wizard-footer">
        <button className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>
          {t('ingestion.wizard.cancel')}
        </button>
        <div className="wizard-nav">
          {step > 1 && (
            <button className="btn-secondary" onClick={handlePrev} disabled={isSubmitting}>
              {t('ingestion.wizard.back')}
            </button>
          )}
          {step < 6 ? (
            <button 
              className="btn-primary" 
              onClick={handleNext}
              disabled={
                (step === 1 && !formData.display_name) ||
                (step === 2 && !formData.api_url) ||
                (step === 4 && !formData.target_kb_id)
              }
            >
              {t('ingestion.wizard.next')}
            </button>
          ) : (
            <button 
              className="btn-primary" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('ingestion.wizard.creating') : t('ingestion.wizard.create')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

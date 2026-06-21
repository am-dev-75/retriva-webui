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
import { gatewayClient } from '../../../api/gateway-client';
import { KnowledgeBase, CreateSourceRequest } from '../../../api/types';
import './AddSourceWizard.css';

interface WizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const AddSourceWizard: React.FC<WizardProps> = ({ onComplete, onCancel }) => {
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
        throw new Error('Invalid JSON in Metadata field');
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
        <h2>Add New Source</h2>
        <div className="wizard-steps">
          Step {step} of 6
        </div>
      </div>

      <div className="wizard-content">
        {error && <div className="wizard-error">{error}</div>}

        {step === 1 && (
          <div className="wizard-step">
            <h3>1. Source Type</h3>
            <div className="form-group">
              <label>Display Name</label>
              <input 
                type="text" 
                value={formData.display_name}
                onChange={e => setFormData({...formData, display_name: e.target.value})}
                placeholder="e.g. R&D MediaWiki"
              />
            </div>
            <div className="form-group">
              <label>Connector Type</label>
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
            <h3>2. Connection & Auth</h3>
            <div className="form-group">
              <label>API URL</label>
              <input 
                type="url" 
                value={formData.api_url}
                onChange={e => setFormData({...formData, api_url: e.target.value})}
                placeholder="https://mediawiki.company.local/api.php"
              />
            </div>
            <div className="form-group">
              <label>Auth Mode</label>
              <select 
                value={formData.auth_mode}
                onChange={e => setFormData({...formData, auth_mode: e.target.value})}
              >
                <option value="none">None</option>
                <option value="bot_password">Bot Password</option>
                <option value="oauth">OAuth</option>
              </select>
            </div>
            {formData.auth_mode !== 'none' && (
              <div className="form-group">
                <label>Credentials (Token/Password)</label>
                <input 
                  type="password" 
                  value={formData.auth_credentials}
                  onChange={e => setFormData({...formData, auth_credentials: e.target.value})}
                  placeholder="Enter secret"
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step">
            <h3>3. Scope Filters</h3>
            <div className="form-group">
              <label>Include Categories (comma-separated)</label>
              <input 
                type="text" 
                value={formData.include_categories}
                onChange={e => setFormData({...formData, include_categories: e.target.value})}
                placeholder="e.g. R&D, Procedures"
              />
            </div>
            <div className="form-group">
              <label>Exclude Categories (comma-separated)</label>
              <input 
                type="text" 
                value={formData.exclude_categories}
                onChange={e => setFormData({...formData, exclude_categories: e.target.value})}
                placeholder="e.g. Obsolete"
              />
            </div>
            <div className="form-group">
              <label>Allowed Namespaces (comma-separated IDs)</label>
              <input 
                type="text" 
                value={formData.allowed_namespaces}
                onChange={e => setFormData({...formData, allowed_namespaces: e.target.value})}
                placeholder="0, 100, 102"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="wizard-step">
            <h3>4. Target KB & Policies</h3>
            <div className="form-group">
              <label>Target Knowledge Base</label>
              <select 
                value={formData.target_kb_id}
                onChange={e => setFormData({...formData, target_kb_id: e.target.value})}
              >
                <option value="">-- Select a KB --</option>
                {kbs.map(kb => (
                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Delete Policy</label>
              <select 
                value={formData.delete_policy}
                onChange={e => setFormData({...formData, delete_policy: e.target.value})}
              >
                <option value="soft_delete">Soft Delete</option>
                <option value="hard_delete">Hard Delete</option>
              </select>
            </div>
            <div className="form-group">
              <label>Availability Policy</label>
              <select 
                value={formData.availability_policy}
                onChange={e => setFormData({...formData, availability_policy: e.target.value})}
              >
                <option value="hide_until_initial_sync_complete">Hide until initial sync completes</option>
                <option value="immediate">Immediate</option>
              </select>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="wizard-step">
            <h3>5. Sync & Metadata</h3>
            <div className="form-group">
              <label>Sync Interval (minutes)</label>
              <input 
                type="number" 
                value={formData.sync_interval_minutes}
                onChange={e => setFormData({...formData, sync_interval_minutes: e.target.value})}
                placeholder="15"
              />
              <small>Leave blank for manual sync only.</small>
            </div>
            <div className="form-group">
              <label>Metadata (JSON)</label>
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
            <h3>6. Review</h3>
            <div className="review-section">
              <p><strong>Name:</strong> {formData.display_name}</p>
              <p><strong>API URL:</strong> {formData.api_url}</p>
              <p><strong>Auth Mode:</strong> {formData.auth_mode}</p>
              {formData.auth_mode !== 'none' && (
                <p><strong>Credentials:</strong> ******** (Redacted)</p>
              )}
              <p><strong>Target KB:</strong> {kbs.find(k => k.id === formData.target_kb_id)?.name || formData.target_kb_id}</p>
              <p><strong>Sync Interval:</strong> {formData.sync_interval_minutes || 'Manual'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="wizard-footer">
        <button className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <div className="wizard-nav">
          {step > 1 && (
            <button className="btn-secondary" onClick={handlePrev} disabled={isSubmitting}>
              Back
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
              Next
            </button>
          ) : (
            <button 
              className="btn-primary" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Source'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

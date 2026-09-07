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
import { Plus, Trash2, Tag, Bookmark, Star, Save } from 'lucide-react';
import './Metadata.css';

export interface MetadataField {
  key: string;
  value: string;
}

export interface MetadataPreset {
  label: string;
  fields: MetadataField[];
  predefined?: boolean;
}

const CUSTOM_PRESETS_KEY = 'retriva_custom_metadata_presets';

function loadCustomPresets(): MetadataPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCustomPresets(presets: MetadataPreset[]) {
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
}

interface MetadataEditorProps {
  metadata: MetadataField[];
  onChange: (metadata: MetadataField[]) => void;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ metadata, onChange }) => {
  const { t } = useTranslation();
  const [customPresets, setCustomPresets] = useState<MetadataPreset[]>([]);

  useEffect(() => {
    setCustomPresets(loadCustomPresets());
  }, []);

  const predefinedPresets: MetadataPreset[] = [
    { label: t('metadata.presets_list.project'), fields: [{ key: 'project', value: '' }, { key: 'department', value: '' }], predefined: true },
    { label: t('metadata.presets_list.confidentiality'), fields: [{ key: 'classification', value: 'internal' }], predefined: true },
    { label: t('metadata.presets_list.potential_customer'), fields: [{ key: 'type', value: 'dept_sales_potential_customer' }], predefined: true },
    { label: t('metadata.presets_list.offering'), fields: [{ key: 'type', value: 'dept_sales_offering' }], predefined: true },
  ];

  const addField = () => {
    onChange([...metadata, { key: '', value: '' }]);
  };

  const removeField = (index: number) => {
    onChange(metadata.filter((_, i) => i !== index));
  };

  const updateField = (index: number, field: Partial<MetadataField>) => {
    const newMetadata = [...metadata];
    newMetadata[index] = { ...newMetadata[index], ...field };
    onChange(newMetadata);
  };

  const applyPreset = (presetFields: MetadataField[]) => {
    onChange([...metadata, ...presetFields]);
  };

  const saveCurrentAsPreset = () => {
    const validFields = metadata.filter((f) => f.key.trim());
    if (validFields.length === 0) return;
    const label = window.prompt(t('metadata.preset_name_prompt'), '');
    if (!label || !label.trim()) return;
    const newPreset: MetadataPreset = { label: label.trim(), fields: validFields.map((f) => ({ key: f.key, value: f.value })) };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    saveCustomPresets(updated);
  };

  const deleteCustomPreset = (label: string) => {
    const updated = customPresets.filter((p) => p.label !== label);
    setCustomPresets(updated);
    saveCustomPresets(updated);
  };

  return (
    <div className="metadata-editor">
      <div className="metadata-header">
        <div className="header-title">
          <Tag size={16} />
          <h4>{t('metadata.title')}</h4>
        </div>
        <div className="presets-dropdown">
          <button className="btn btn-ghost btn-sm">
            <Bookmark size={14} />
            {t('metadata.presets')}
          </button>
          <div className="presets-menu">
            {predefinedPresets.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p.fields)} className="preset-item predefined">
                <Star size={12} />
                {p.label}
              </button>
            ))}
            {customPresets.length > 0 && <div className="presets-divider" />}
            {customPresets.map((p) => (
              <div key={p.label} className="preset-item-row">
                <button onClick={() => applyPreset(p.fields)} className="preset-item custom">
                  {p.label}
                </button>
                <button className="preset-delete-btn" onClick={() => deleteCustomPreset(p.label)} title={t('metadata.delete_preset')}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <div className="presets-divider" />
            <button onClick={saveCurrentAsPreset} className="preset-item save-preset">
              <Save size={12} />
              {t('metadata.save_as_preset')}
            </button>
          </div>
        </div>
      </div>

      <div className="fields-list">
        {metadata.length === 0 ? (
          <p className="empty-fields">{t('metadata.empty_state')}</p>
        ) : (
          metadata.map((field, index) => (
            <div key={index} className="field-row">
              <input 
                type="text" 
                placeholder={t('metadata.key_placeholder')} 
                value={field.key}
                onChange={(e) => updateField(index, { key: e.target.value })}
                className="input-field sm"
              />
              <input 
                type="text" 
                placeholder={t('metadata.value_placeholder')} 
                value={field.value}
                onChange={(e) => updateField(index, { value: e.target.value })}
                className="input-field sm"
              />
              <button className="btn-icon danger sm" onClick={() => removeField(index)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <button className="btn btn-ghost btn-sm add-field-btn" onClick={addField}>
        <Plus size={14} />
        {t('metadata.add_field')}
      </button>
    </div>
  );
};

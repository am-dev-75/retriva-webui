import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Tag, Bookmark } from 'lucide-react';
import './Metadata.css';

export interface MetadataField {
  key: string;
  value: string;
}

interface MetadataEditorProps {
  metadata: MetadataField[];
  onChange: (metadata: MetadataField[]) => void;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ metadata, onChange }) => {
  const { t } = useTranslation();

  const presets = [
    { label: t('metadata.presets_list.project'), fields: [{ key: 'project', value: '' }, { key: 'department', value: '' }] },
    { label: t('metadata.presets_list.confidentiality'), fields: [{ key: 'classification', value: 'internal' }] },
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
            {presets.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p.fields)}>
                {p.label}
              </button>
            ))}
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

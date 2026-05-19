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
import { Plus, X, Filter } from 'lucide-react';
import { gatewayClient } from '../../../api/gateway-client';
import { 
  MetadataField, 
  MetadataFilter as FilterType, 
  MetadataFilterMode 
} from '../../../api/types';
import './MetadataFilter.css';

interface MetadataFilterProps {
  onFilterChange: (filters: FilterType[], mode: MetadataFilterMode) => void;
  initialFilters?: FilterType[];
  initialMode?: MetadataFilterMode;
  /** When true, the soft/hard mode selector is hidden (e.g. on the Documents page). */
  hideMode?: boolean;
}

export const MetadataFilterManager: React.FC<MetadataFilterProps> = ({ 
  onFilterChange, 
  initialFilters = [], 
  initialMode = 'soft',
  hideMode = false
}) => {
  const { t } = useTranslation();
  const [fields, setFields] = useState<MetadataField[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterType[]>(initialFilters);
  const [mode, setMode] = useState<MetadataFilterMode>(initialMode);
  
  // State for the "Add New" row
  const [selectedField, setSelectedField] = useState<string>('');
  const [operator, setOperator] = useState<FilterType['operator']>('eq');
  const [value, setValue] = useState<string>('');
  const [knownValues, setKnownValues] = useState<any[]>([]);

  useEffect(() => {
    const loadSchema = async () => {
      try {
        const schema = await gatewayClient.getMetadataSchema();
        setFields(schema.fields);
        if (schema.fields.length > 0 && !selectedField) {
          setSelectedField(schema.fields[0].name);
        }
      } catch (error) {
        console.error('Failed to load metadata schema:', error);
      }
    };
    loadSchema();
  }, []);

  useEffect(() => {
    const loadValues = async () => {
      if (!selectedField) return;
      try {
        const response = await gatewayClient.getMetadataValues(selectedField);
        setKnownValues(response.values || []);
      } catch (error) {
        setKnownValues([]);
      }
    };
    loadValues();
  }, [selectedField]);

  const handleAddFilter = () => {
    if (!selectedField || value === '') return;
    
    // Simple type conversion based on schema if needed
    const fieldType = fields.find(f => f.name === selectedField)?.type;
    let finalValue: any = value;
    if (fieldType === 'integer') finalValue = parseInt(value, 10);
    else if (fieldType === 'float') finalValue = parseFloat(value);
    else if (fieldType === 'boolean') finalValue = value === 'true';

    const newFilter: FilterType = { field: selectedField, operator, value: finalValue };
    const newFilters = [...activeFilters, newFilter];
    setActiveFilters(newFilters);
    setValue('');
    onFilterChange(newFilters, mode);
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = activeFilters.filter((_, i) => i !== index);
    setActiveFilters(newFilters);
    onFilterChange(newFilters, mode);
  };

  const handleModeChange = (newMode: MetadataFilterMode) => {
    setMode(newMode);
    onFilterChange(activeFilters, newMode);
  };

  return (
    <div className="metadata-filter-container">
      <div className="filter-header">
        <h3><Filter size={14} style={{ marginRight: '6px' }} /> Metadata Filters</h3>
        {!hideMode && (
          <div className="mode-selector">
            <button 
              className={`mode-btn ${mode === 'soft' ? 'active' : ''}`}
              onClick={() => handleModeChange('soft')}
            >
              {t('metadata.mode_soft')}
            </button>
            <button 
              className={`mode-btn ${mode === 'hard' ? 'active' : ''}`}
              onClick={() => handleModeChange('hard')}
            >
              {t('metadata.mode_hard')}
            </button>
          </div>
        )}
      </div>

      <div className="filter-list">
        {activeFilters.map((filter, idx) => (
          <div key={idx} className="filter-tag">
            <span className="filter-text">
              <strong>{filter.field}</strong> {filter.operator} <strong>{String(filter.value)}</strong>
            </span>
            <button className="remove-filter" onClick={() => handleRemoveFilter(idx)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="add-filter-row">
        <div className="filter-input-group">
          <select 
            className="filter-select"
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
          >
            {fields.map(f => (
              <option key={f.name} value={f.name}>{f.name}</option>
            ))}
          </select>
          
          <select 
            className="filter-select"
            value={operator}
            onChange={(e) => setOperator(e.target.value as any)}
          >
            <option value="eq">=</option>
            <option value="neq">!=</option>
            <option value="gt">&gt;</option>
            <option value="gte">&gt;=</option>
            <option value="in">in</option>
            <option value="nin">not in</option>
            <option value="exists">exists</option>
          </select>

          {operator === 'exists' ? (
            <div className="filter-input disabled">Value ignored</div>
          ) : knownValues.length > 0 ? (
            <select 
              className="filter-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            >
              <option value="">Select value...</option>
              {knownValues.map(v => (
                <option key={String(v)} value={String(v)}>{String(v)}</option>
              ))}
            </select>
          ) : (
            <input 
              type="text"
              className="filter-input"
              placeholder="Value..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
            />
          )}
        </div>
        
        <button 
          className="btn-add-filter"
          onClick={handleAddFilter}
          disabled={!selectedField || (operator !== 'exists' && value === '')}
        >
          <Plus size={16} />
          Add Filter
        </button>
      </div>
    </div>
  );
};

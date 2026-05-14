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

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
  feedback?: 'positive' | 'negative' | null;
}

export interface Citation {
  id: string;
  document_id: string;
  filename: string;
  text: string;
  page?: number;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  document_count: number;
  status: 'active' | 'processing' | 'error';
}

export interface IngestionBatch {
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  total_files: number;
  completed_files: number;
  created_at: string;
}

export interface Document {
  id: string;
  kb_id: string;
  filename: string;
  size: number;
  content_type: string;
  metadata: Record<string, any>;
  ingestion_status: 'completed' | 'failed' | 'processing';
  created_at: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'completed' | 'failed';
  download_url?: string;
  created_at: string;
}

export type MetadataFilterMode = 'soft' | 'hard';

export interface MetadataField {
  name: string;
  type: 'string' | 'integer' | 'float' | 'boolean';
  description?: string;
}

export interface MetadataSchemaResponse {
  fields: MetadataField[];
}

export interface MetadataValuesResponse {
  field: string;
  values: any[];
}

export interface MetadataFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'exists';
  value: any;
}

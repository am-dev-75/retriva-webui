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
  source_url?: string;
}

export interface KnowledgeBase {
  id: string;
  collection: string;
  name: string;
  description?: string;
  document_count: number;
  status: 'active' | 'processing' | 'error';
}

export interface AuthInfo {
  principal_id: string;
  name: string;
  allowed_collections: string[];
  default_collection: string | null;
  fallback_collection: string;
  is_anonymous: boolean;
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
  page_title?: string;
  source_path?: string;
  size: number;
  content_type: string;

  metadata?: Record<string, unknown>;
  ingestion_status: 'completed' | 'failed' | 'processing';

  created_at?: string | number;
  ingested_at?: string | number;
  ingestion_completed_at?: string | number;
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
  values: unknown[];
}

export interface MetadataFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'exists';
  value: unknown;
}

export interface SystemStatusResponse {
  jobs: Record<string, number>;
  staged_files: number;
}

export interface JobSummary {
  job_id: string;
  status: string;
  source: string;
  job_type: string;
  current_stage?: string | null;
  stages_completed: string[];
  stage_detail?: string | null;
  progress?: number | null;
  created_at: string;
  updated_at: string;
  error?: string | null;
}

export interface SystemStatusDetailResponse {
  jobs: Record<string, number>;
  staged_files: number;
  job_list: JobSummary[];
}

export type ConnectorType = 'mediawiki' | string;

export type SourceStatus = 'CREATED' | 'VALIDATING_CONNECTION' | 'BASELINE_PENDING' | 'BASELINE_RUNNING' | 'CATCHUP_RUNNING' | 'ACTIVE' | 'PAUSED' | 'DEGRADED' | 'FAILED' | 'DELETING' | 'DELETED';

export interface MediaWikiSourceConfig {
  api_url: string;
  auth_mode: 'bot_password' | 'oauth' | 'none';
  allowed_namespaces?: number[];
  include_categories?: string[];
  exclude_categories?: string[];
  sync_interval_minutes?: number;
  delete_policy?: 'soft_delete' | 'hard_delete';
  availability_policy?: 'hide_until_initial_sync_complete' | 'immediate';
  metadata?: Record<string, string>;
}

export interface ConnectedSource extends MediaWikiSourceConfig {
  id: string;
  display_name: string;
  connector_type: ConnectorType;
  target_kb_id: string;
  status: SourceStatus;
  last_sync_at?: string;
  next_sync_at?: string;
  indexed_item_count: number;
  failed_item_count: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateSourceRequest extends MediaWikiSourceConfig {
  display_name: string;
  connector_type: ConnectorType;
  target_kb_id: string;
  credentials?: string;
}

export interface SourceRun {
  id: string;
  source_id: string;
  status: SourceStatus;
  started_at: string;
  completed_at?: string;
  items_processed: number;
  items_failed: number;
  error_message?: string;
}

export interface SourceStatusSummary {
  source_id: string;
  status: SourceStatus;
  indexed_item_count: number;
  failed_item_count: number;
}

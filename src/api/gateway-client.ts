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

import { CONFIG } from '../app/config';
import { getAuthClient } from '../app/auth';
import {
  Message,
  KnowledgeBase,
  Document,
  Artifact,
  MetadataSchemaResponse,
  MetadataValuesResponse,
  MetadataFilter,
  MetadataFilterMode,
  SystemStatusResponse,
  SystemStatusDetailResponse,
  JobSummary,
  ConnectedSource,
  CreateSourceRequest,
  SourceRun,
  SourceStatus,
  AuthInfo
} from './types';

interface DocumentListResponse {
  documents?: Document[];
}

class GatewayClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = CONFIG.GATEWAY_BASE_URL;
  }

  /**
   * Build the Authorization header when auth is enabled.
   * Returns an empty object when no token is available or auth is disabled.
   */
  private async _authHeaders(): Promise<Record<string, string>> {
    if (!CONFIG.ENABLE_AUTH) return {};
    const client = getAuthClient();
    const token = await client.getAccessToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Handle a 401 response by triggering an interactive re-login when auth
   * is enabled.  Throws the original error otherwise.
   */
  private async _handle401(response: Response): Promise<void> {
    if (response.status === 401 && CONFIG.ENABLE_AUTH) {
      const client = getAuthClient();
      try {
        await client.login();
      } catch (err) {
        console.error('Re-authentication failed:', err);
      }
    }
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const authHeaders = await this._authHeaders();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
        ...authHeaders,
      },
    });

    if (response.status === 401) {
      await this._handle401(response);
    }

    if (!response.ok) {
      throw new Error(`Gateway Error: ${response.statusText}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Chat
  async sendChatMessage(
    kbIds: string[], 
    message: string, 
    metadataFilters?: MetadataFilter[], 
    metadataFilterMode?: MetadataFilterMode,
    signal?: AbortSignal
  ): Promise<Message> {
    const authHeaders = await this._authHeaders();
    const response = await fetch(`${this.baseUrl}/gateway/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ 
        kb_ids: kbIds, 
        message,
        metadata_filters: metadataFilters,
        metadata_filter_mode: metadataFilterMode
      }),
      signal,
    });

    if (response.status === 401) {
      await this._handle401(response);
    }

    if (!response.ok) {
      let errorMsg = 'Chat failed';
      try {
        const errorData = await response.json();
        if (errorData.detail) errorMsg = errorData.detail;
        else if (errorData.message) errorMsg = errorData.message;
      } catch {
        // ignore JSON parse error
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // Speech to Text
  async transcribeAudio(file: Blob, language: string = 'auto'): Promise<{ text: string }> {
    const authHeaders = await this._authHeaders();
    const formData = new FormData();
    formData.append('file', file, 'query.webm');
    if (language) {
      formData.append('language', language);
    }

    const response = await fetch(`${this.baseUrl}/stt/transcribe`, {
      method: 'POST',
      headers: { ...authHeaders },
      body: formData,
    });

    if (response.status === 401) {
      await this._handle401(response);
    }

    if (!response.ok) {
      let errorMsg = 'Transcription failed';
      try {
        const errorData = await response.json();
        if (errorData.detail) errorMsg = errorData.detail;
        else if (errorData.message) errorMsg = errorData.message;
      } catch {
        // ignore JSON parse error
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // Knowledge Bases
  async getKBs(): Promise<KnowledgeBase[]> {
    return this.request<KnowledgeBase[]>('/gateway/kbs');
  }

  async getKBsForCollection(collection: string): Promise<KnowledgeBase[]> {
    return this.request<KnowledgeBase[]>('/gateway/kbs', {
      headers: { 'X-Retriva-Requested-Collection': collection },
    });
  }

  async createKB(name: string, description?: string): Promise<KnowledgeBase> {
    return this.request<KnowledgeBase>('/gateway/kbs', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async deleteKB(kbId: string): Promise<void> {
    return this.request<void>(`/gateway/kbs/${kbId}`, {
      method: 'DELETE',
    });
  }

  // Ingestion
  async createBatch(metadata?: Record<string, unknown>, source_type: string = 'auto'): Promise<{ batch_id: string, status: string }> {
    return this.request<{ batch_id: string, status: string }>('/gateway/ingestion/batches', {
      method: 'POST',
      body: JSON.stringify({ metadata, source_type }),
    });
  }

  async finalizeBatch(batchId: string): Promise<{ job_id: string, status: string }> {
    return this.request<{ job_id: string, status: string }>(`/gateway/ingestion/batches/${batchId}/finalize`, {
      method: 'POST',
    });
  }

  async uploadFileToBatch(batchId: string, file: File, sourcePath: string, metadata?: Record<string, unknown>, force?: boolean): Promise<unknown> {
    const authHeaders = await this._authHeaders();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_path', sourcePath);
    if (metadata) {
      formData.append('user_metadata', JSON.stringify(metadata));
    }
    if (force) {
      formData.append('force', 'true');
    }

    const response = await fetch(`${this.baseUrl}/gateway/ingestion/batches/${batchId}/files`, {
      method: 'POST',
      headers: { ...authHeaders },
      body: formData,
    });

    if (response.status === 401) {
      await this._handle401(response);
    }

    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  }

  async getBatchStatus(batchId: string): Promise<unknown> {
    return this.request<unknown>(`/gateway/ingestion/batches/${batchId}`);
  }

  async fetchUrl(url: string): Promise<{ url: string; final_url: string; content: string; content_type: string; title: string; is_binary: boolean; filename: string }> {
    return this.request<{ url: string; final_url: string; content: string; content_type: string; title: string; is_binary: boolean; filename: string }>('/gateway/ingestion/fetch-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // Documents
  async getDocuments(kbId?: string): Promise<Document[]> {
    const query = kbId ? `?kb_id=${kbId}` : '';
    const response = await this.request<Document[] | DocumentListResponse>(`/gateway/documents${query}`);
    return Array.isArray(response) ? response : (response.documents || []);
  }

  async deleteDocument(docId: string): Promise<void> {
    return this.request<void>(`/gateway/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    });
  }

  async searchDocuments(
    kbIds: string[],
    query: string,
    metadataFilters?: MetadataFilter[],
    metadataFilterMode?: MetadataFilterMode,
    caseSensitive?: boolean
  ): Promise<Document[]> {
    // Build the request payload, omitting fields that are not meaningful so
    // the backend can apply its "no constraint" semantics. For example:
    //  - When `query` is empty/whitespace, do not send it at all.
    //  - When `kbIds` is empty, do not restrict by knowledge base.
    const payload: Record<string, unknown> = {};

    if (kbIds && kbIds.length > 0) {
      payload.kb_ids = kbIds;
    }
    if (query && query.trim().length > 0) {
      payload.query = query;
    }
    if (metadataFilters && metadataFilters.length > 0) {
      payload.metadata_filters = metadataFilters;
    }
    if (metadataFilterMode) {
      payload.metadata_filter_mode = metadataFilterMode;
    }
    if (caseSensitive !== undefined) {
      payload.case_sensitive = caseSensitive;
    }

    const response = await this.request<Document[] | DocumentListResponse>('/gateway/documents/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return Array.isArray(response) ? response : (response.documents || []);
  }

  // Metadata
  async getMetadataSchema(): Promise<MetadataSchemaResponse> {
    return this.request<MetadataSchemaResponse>('/gateway/metadata/schema');
  }

  async getMetadataValues(field: string): Promise<MetadataValuesResponse> {
    return this.request<MetadataValuesResponse>(`/gateway/metadata/values?field=${field}`);
  }

  // Artifacts
  async getArtifacts(): Promise<Artifact[]> {
    return this.request<Artifact[]>('/gateway/artifacts');
  }
  // System
  async getAuthInfo(): Promise<AuthInfo> {
    return this.request<AuthInfo>('/gateway/system/auth');
  }

  async getSystemStatus(): Promise<SystemStatusResponse> {
    return this.request<SystemStatusResponse>('/gateway/system/status');
  }

  async getSystemStatusDetail(): Promise<SystemStatusDetailResponse> {
    return this.request<SystemStatusDetailResponse>('/gateway/system/status/detail');
  }

  async listJobs(): Promise<JobSummary[]> {
    return this.request<JobSummary[]>('/gateway/system/jobs');
  }

  async getJob(jobId: string): Promise<JobSummary> {
    return this.request<JobSummary>(`/gateway/system/jobs/${jobId}`);
  }
  // Connected Sources
  async getSources(): Promise<ConnectedSource[]> {
    const raw = await this.request<Record<string, unknown>[]>('/gateway/sources');
    return raw.map(s => this._mapSource(s));
  }

  async getSource(sourceId: string): Promise<ConnectedSource> {
    const raw = await this.request<Record<string, unknown>>(`/gateway/sources/${sourceId}`);
    return this._mapSource(raw);
  }

  async createSource(sourceData: CreateSourceRequest): Promise<ConnectedSource> {
    const raw = await this.request<Record<string, unknown>>('/gateway/sources', {
      method: 'POST',
      body: JSON.stringify(sourceData),
    });
    return this._mapSource(raw);
  }

  async updateSource(sourceId: string, sourceData: Partial<ConnectedSource>): Promise<ConnectedSource> {
    const raw = await this.request<Record<string, unknown>>(`/gateway/sources/${sourceId}`, {
      method: 'PATCH',
      body: JSON.stringify(sourceData),
    });
    return this._mapSource(raw);
  }

  /**
   * Map the gateway's SourceResponse (which uses source_id and nests config
   * fields inside a config dict) to the WebUI's ConnectedSource (which uses
   * id and flattens config fields onto the top-level object).
   */
  _mapSource(raw: Record<string, unknown>): ConnectedSource {
    const config = (raw.config ?? {}) as Record<string, unknown>;
    return {
      id: (raw.source_id ?? raw.id ?? '') as string,
      display_name: (raw.display_name ?? '') as string,
      connector_type: (raw.connector_type ?? '') as string,
      target_kb_id: (raw.target_kb_id ?? 'default') as string,
      collection: (raw.collection ?? '') as string,
      kb_ids: (raw.kb_ids ?? []) as string[],
      status: (raw.status ?? 'CREATED') as SourceStatus,
      last_sync_at: raw.last_sync_at as string | undefined,
      next_sync_at: raw.next_sync_at as string | undefined,
      indexed_item_count: (raw.indexed_item_count ?? 0) as number,
      failed_item_count: (raw.failed_item_count ?? 0) as number,
      created_at: (raw.created_at ?? '') as string,
      updated_at: raw.updated_at as string | undefined,
      api_url: (config.api_url ?? '') as string,
      auth_mode: (config.auth_mode ?? 'none') as string,
      allowed_namespaces: config.allowed_namespaces as number[] | undefined,
      include_categories: config.include_categories as string[] | undefined,
      exclude_categories: config.exclude_categories as string[] | undefined,
      sync_interval_minutes: config.sync_interval_minutes as number | undefined,
      delete_policy: config.delete_policy as string | undefined,
      availability_policy: config.availability_policy as string | undefined,
      metadata: (raw.metadata ?? config.metadata ?? {}) as Record<string, string>,
    } as ConnectedSource;
  }

  async deleteSource(sourceId: string): Promise<void> {
    return this.request<void>(`/gateway/sources/${sourceId}`, {
      method: 'DELETE',
    });
  }

  async syncSource(sourceId: string): Promise<void> {
    return this.request<void>(`/gateway/sources/${sourceId}/sync`, {
      method: 'POST',
    });
  }

  async pauseSource(sourceId: string): Promise<void> {
    return this.request<void>(`/gateway/sources/${sourceId}/pause`, {
      method: 'POST',
    });
  }

  async resumeSource(sourceId: string): Promise<void> {
    return this.request<void>(`/gateway/sources/${sourceId}/resume`, {
      method: 'POST',
    });
  }

  async getSourceRuns(sourceId: string): Promise<SourceRun[]> {
    return this.request<SourceRun[]>(`/gateway/sources/${sourceId}/runs`);
  }
}

export const gatewayClient = new GatewayClient();

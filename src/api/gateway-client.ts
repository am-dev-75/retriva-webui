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
import { 
  Message,
  KnowledgeBase,
  Document, 
  Artifact,
  MetadataSchemaResponse,
  MetadataValuesResponse,
  MetadataFilter,
  MetadataFilterMode
} from './types';

class GatewayClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = CONFIG.GATEWAY_BASE_URL;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Gateway Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Chat
  async sendChatMessage(
    kbIds: string[], 
    message: string, 
    metadataFilter?: MetadataFilter[], 
    metadataFilterMode?: MetadataFilterMode,
    signal?: AbortSignal
  ): Promise<Message> {
    const response = await fetch(`${this.baseUrl}/gateway/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        kb_ids: kbIds, 
        message,
        metadata_filter: metadataFilter,
        metadata_filter_mode: metadataFilterMode
      }),
      signal,
    });

    if (!response.ok) throw new Error('Chat failed');

    return response.json();
  }

  // Knowledge Bases
  async getKBs(): Promise<KnowledgeBase[]> {
    return this.request<KnowledgeBase[]>('/gateway/kbs');
  }

  async createKB(name: string, description?: string): Promise<KnowledgeBase> {
    return this.request<KnowledgeBase>('/gateway/kbs', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  // Ingestion
  async createBatch(metadata?: Record<string, any>): Promise<{ batch_id: string, status: string }> {
    return this.request<{ batch_id: string, status: string }>('/gateway/ingestion/batches', {
      method: 'POST',
      body: JSON.stringify({ metadata }),
    });
  }

  async uploadFileToBatch(batchId: string, file: File, sourcePath: string, metadata?: Record<string, any>): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_path', sourcePath);
    if (metadata) {
      formData.append('user_metadata', JSON.stringify(metadata));
    }

    const response = await fetch(`${this.baseUrl}/gateway/ingestion/batches/${batchId}/files`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  }

  async getBatchStatus(batchId: string): Promise<any> {
    return this.request<any>(`/gateway/ingestion/batches/${batchId}`);
  }

  // Documents
  async getDocuments(kbId?: string): Promise<Document[]> {
    const query = kbId ? `?kb_id=${kbId}` : '';
    return this.request<Document[]>(`/gateway/documents${query}`);
  }

  async searchDocuments(
    kbIds: string[], 
    query: string, 
    metadataFilter?: MetadataFilter[], 
    metadataFilterMode?: MetadataFilterMode
  ): Promise<Document[]> {
    return this.request<Document[]>('/gateway/documents/search', {
      method: 'POST',
      body: JSON.stringify({
        kb_ids: kbIds,
        query,
        metadata_filter: metadataFilter,
        metadata_filter_mode: metadataFilterMode
      }),
    });
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
}

export const gatewayClient = new GatewayClient();

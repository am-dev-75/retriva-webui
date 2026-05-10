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
  Artifact 
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
  async sendChatMessage(kbId: string, message: string): Promise<Message> {
    const response = await fetch(`${this.baseUrl}/gateway/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kb_id: kbId, message }),
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

  // Documents
  async getDocuments(kbId?: string): Promise<Document[]> {
    const query = kbId ? `?kb_id=${kbId}` : '';
    return this.request<Document[]>(`/gateway/documents${query}`);
  }

  // Artifacts
  async getArtifacts(): Promise<Artifact[]> {
    return this.request<Artifact[]>('/gateway/artifacts');
  }
}

export const gatewayClient = new GatewayClient();

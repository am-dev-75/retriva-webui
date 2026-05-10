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

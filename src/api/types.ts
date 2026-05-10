export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
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

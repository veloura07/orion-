export type ModelMode = 'fast' | 'balanced' | 'deep';

export interface ChatRequest {
  sessionId: string;
  message: string;
  mode: ModelMode;
  useMemory: boolean;
  image?: string;
}

export type ChatStreamEventType =
  | 'token'
  | 'memory_context'
  | 'memory_write'
  | 'done'
  | 'error';

export interface MemoryRecord {
  id: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  importance: number;
  accessCount: number;
  embedding?: number[];
  
  // Cognitive Memory V2 variables
  emotionalVector?: number[];
  workflowVector?: number[];
  behavioralVector?: number[];
  reinforcementScore?: number;
  evolutionHistory?: string[];
}

export interface ProviderStatus {
  provider: 'gemini';
  keyPresent: boolean;
  models: Record<ModelMode, string>;
  storageStatus: 'ok' | 'error';
  storagePath: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  provider: ProviderStatus;
  uptime: number;
}

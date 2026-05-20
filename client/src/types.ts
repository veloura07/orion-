export type ModelMode = 'fast' | 'balanced' | 'deep';

export interface MemoryRecord {
  id: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  importance: number;
  accessCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: ModelMode;
  memoryContext?: MemoryRecord[];
}

export interface HealthData {
  status: 'ok' | 'degraded';
  version: string;
  provider: {
    provider: 'gemini';
    keyPresent: boolean;
    models: Record<ModelMode, string>;
    storageStatus: 'ok' | 'error';
    storagePath: string;
  };
  uptime: number;
}

import type { MemoryRecord, ModelMode, HealthData } from '../types';

const BASE = '/api';

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const key = localStorage.getItem('orion_custom_api_key');
  if (key) {
    headers['x-gemini-key'] = key;
  }
  return headers;
}

export async function getHealth(): Promise<HealthData> {
  const res = await fetch(`${BASE}/health`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json() as Promise<HealthData>;
}

export async function getMemories(query?: string): Promise<MemoryRecord[]> {
  const url = query
    ? `${BASE}/memories?query=${encodeURIComponent(query)}`
    : `${BASE}/memories`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch memories: ${res.status}`);
  const data = await res.json() as { memories: MemoryRecord[] };
  return data.memories;
}

export async function addMemory(
  content: string,
  tags: string[] = [],
): Promise<MemoryRecord> {
  const res = await fetch(`${BASE}/memories`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ content, tags }),
  });
  if (!res.ok) throw new Error(`Failed to add memory: ${res.status}`);
  const data = await res.json() as { memory: MemoryRecord };
  return data.memory;
}

export async function deleteMemory(id: string): Promise<void> {
  const res = await fetch(`${BASE}/memories/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete memory: ${res.status}`);
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onMemoryContext: (memories: MemoryRecord[]) => void;
  onMemoryWrite: (memory: MemoryRecord) => void;
  onAgentState?: (update: { agent: string; status: string; message: string; timestamp: string }) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export async function streamChat(
  sessionId: string,
  message: string,
  mode: ModelMode,
  useMemory: boolean,
  callbacks: StreamCallbacks,
  image?: string,
): Promise<void> {
  const res = await fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sessionId, message, mode, useMemory, image }),
  });

  if (!res.ok || !res.body) {
    callbacks.onError(`HTTP error ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6)) as {
          type: string;
          data: unknown;
        };
        switch (event.type) {
          case 'token':
            callbacks.onToken(event.data as string);
            break;
          case 'agent_state':
            callbacks.onAgentState?.(event.data as any);
            break;
          case 'memory_context':
            callbacks.onMemoryContext(event.data as MemoryRecord[]);
            break;
          case 'memory_write':
            callbacks.onMemoryWrite(event.data as MemoryRecord);
            break;
          case 'done':
            callbacks.onDone();
            break;
          case 'error':
            callbacks.onError((event.data as { message: string }).message);
            break;
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

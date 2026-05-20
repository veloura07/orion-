import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ModelMode } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = parseInt(process.env.PORT ?? '3001', 10);
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

// Key is read here and used ONLY in gemini/adapter.ts.
// Only the boolean is exported for health checks.
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
export const HAS_GEMINI_KEY = GEMINI_API_KEY.length > 0;

export const MODELS: Record<ModelMode, string> = {
  fast:     process.env.NEXUS_MODEL_FAST     ?? 'gemini-2.5-flash-lite',
  balanced: process.env.NEXUS_MODEL_BALANCED ?? 'gemini-2.5-flash',
  deep:     process.env.NEXUS_MODEL_DEEP     ?? 'gemini-2.5-pro',
};

export const MEMORY_DIR = process.env.NEXUS_MEMORY_DIR
  ?? path.join(__dirname, '..', '..', 'data');
export const MEMORY_FILE = path.join(MEMORY_DIR, 'memories.json');

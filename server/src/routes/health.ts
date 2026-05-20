import { Router } from 'express';
import { HAS_GEMINI_KEY, MODELS, MEMORY_FILE } from '../config.js';
import type { HealthResponse } from '../types.js';

const router = Router();
const startTime = Date.now();

router.get('/health', (_req, res) => {
  const body: HealthResponse = {
    status: HAS_GEMINI_KEY ? 'ok' : 'degraded',
    version: '1.0.0',
    provider: {
      provider: 'gemini',
      keyPresent: HAS_GEMINI_KEY,   // boolean only — key value never sent
      models: MODELS,
      storageStatus: 'ok',
      storagePath: MEMORY_FILE,
    },
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
  res.json(body);
});

export default router;

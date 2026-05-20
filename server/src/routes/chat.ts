import { Router, Request, Response } from 'express';
import { streamGemini, mockStream } from '../gemini/adapter.js';
import { memoryStore } from '../memory/store.js';
import { rankMemories } from '../memory/ranking.js';
import { getEmbedding } from '../gemini/embeddings.js';
import { HAS_GEMINI_KEY } from '../config.js';
import { inspectPrompt, inspectOutput } from '../security/firewall.js';
import { OrionOrchestrator } from '../agents/orchestrator.js';
import { worldModel } from '../state/world.js';
import { cognitiveRuntime } from '../state/cognition.js';
import { predictiveEngine } from '../state/predictor.js';
import type { ChatRequest, MemoryRecord } from '../types.js';

const router = Router();

function sse(res: Response, type: string, data: unknown): void {
  res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
}

router.post('/chat/stream', async (req: Request, res: Response) => {
  const { sessionId = 'default', message, mode = 'balanced', useMemory = true, image } =
    req.body as Partial<ChatRequest>;
  const clientKey = req.headers['x-gemini-key'] as string | undefined;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const safetyCheck = inspectPrompt(message);
  if (!safetyCheck.allowed) {
    sse(res, 'error', { message: `Orion Security Shield: ${safetyCheck.reason}` });
    res.end();
    return;
  }

  try {
    worldModel.incrementQueries();
    predictiveEngine.recordEvent('CHAT_QUERY', `Query message: ${message.slice(0, 30)}`);
    
    // Run the multi-agent pipeline first
    const orchestrator = new OrionOrchestrator(clientKey);
    const { systemInstructions } = await orchestrator.runPipeline(
      message.trim(),
      (update) => {
        sse(res, 'agent_state', update);
        cognitiveRuntime.updateAgent(update.agent, update.status, update.message);
      }
    );

    // Fetch and rank relevant memories
    let contextMemories: MemoryRecord[] = [];
    if (useMemory) {
      const all = await memoryStore.getAll();
      let queryEmbedding: number[] | undefined = undefined;
      if (clientKey || HAS_GEMINI_KEY) {
        try {
          queryEmbedding = await getEmbedding(message.trim(), clientKey);
        } catch (err) {
          console.warn('Embedding calculation failed on search query, falling back to overlap:', err);
        }
      }
      contextMemories = rankMemories(all, message, 5, queryEmbedding);
      if (contextMemories.length > 0) {
        sse(res, 'memory_context', contextMemories);
        for (const m of contextMemories) {
          await memoryStore.touchAccess(m.id);
        }
      }
    }

    // Stream response tokens
    const generator = (clientKey || HAS_GEMINI_KEY)
      ? streamGemini(message, mode, contextMemories, image, clientKey, systemInstructions)
      : mockStream(message);

    let fullResponse = '';
    for await (const token of generator) {
      fullResponse += token;
      sse(res, 'token', token);
    }

    // Auto-save an episodic memory of this exchange
    if (useMemory && fullResponse.length > 20) {
      const sanitizedResponse = inspectOutput(fullResponse);
      const memText = `User: "${message.slice(0, 100)}"\nOrion: "${sanitizedResponse.slice(0, 150)}"`;
      let memEmbedding: number[] | undefined = undefined;
      if (clientKey || HAS_GEMINI_KEY) {
        try {
          memEmbedding = await getEmbedding(memText, clientKey);
        } catch (e) {
          console.warn('Failed to embed auto memory:', e);
        }
      }
      const newMem = await memoryStore.add(
        memText,
        ['auto', `session:${sessionId}`],
        memEmbedding,
      );
      sse(res, 'memory_write', newMem);
    }

    predictiveEngine.recordEvent('CHAT_RESPONSE_COMPLETE', 'Delivered model response stream');
    sse(res, 'done', '');
  } catch (err) {
    sse(res, 'error', { message: String(err) });
  } finally {
    res.end();
  }
});

export default router;

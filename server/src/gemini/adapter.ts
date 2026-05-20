import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, HAS_GEMINI_KEY, MODELS } from '../config.js';
import type { ModelMode, MemoryRecord } from '../types.js';

let _client: GoogleGenAI | null = null;

function getClient(customApiKey?: string): GoogleGenAI {
  const apiKey = customApiKey || GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenAI({ apiKey });
}

// Exponential backoff helper for transient 503/429 network capacity spikes
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
): Promise<T> {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const errMsg = err?.message || '';
      const isTransient =
        errMsg.includes('503') ||
        errMsg.includes('500') ||
        errMsg.includes('429') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        err?.status === 503;

      if (isTransient && i < maxRetries - 1) {
        console.warn(
          `Gemini API transient failure (${err?.status || '5xx'}), retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`,
        );
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Gemini connection retries exhausted');
}

function buildPrompt(message: string, memories: MemoryRecord[], systemInstructions?: string): string {
  const memBlock =
    memories.length > 0
      ? `\n\n[MEMORY CONTEXT — relevant things I know about you]\n${memories
          .map((m) => `• ${m.content}`)
          .join('\n')}\n[END MEMORY]\n\n`
      : '';

  const instrBlock = systemInstructions ? `\n\n${systemInstructions}\n\n` : '';

  return (
    `You are Orion — a cognitive AI companion. ` +
    `You are thoughtful, precise, and genuinely interested in helping the user achieve their goals. ` +
    `You remember context and connect ideas across conversations.` +
    memBlock +
    instrBlock +
    `User: ${message}`
  );
}

export async function* streamGemini(
  message: string,
  mode: ModelMode,
  memories: MemoryRecord[],
  image?: string,
  customApiKey?: string,
  systemInstructions?: string,
): AsyncGenerator<string> {
  const ai = getClient(customApiKey);
  const model = MODELS[mode];
  const prompt = buildPrompt(message, memories, systemInstructions);

  const parts: any[] = [{ text: prompt }];

  if (image) {
    const cleanBase64 = image.includes(';base64,')
      ? image.split(';base64,')[1]
      : image;
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanBase64,
      },
    });
  }

  // Wrap stream creation in backoff retry
  const stream = await retryWithBackoff(() =>
    ai.models.generateContentStream({
      model,
      contents: [{ role: 'user', parts }],
    }),
  );

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) yield text;
  }
}

export async function* mockStream(message: string): AsyncGenerator<string> {
  const response =
    `[Orion — Mock Mode] No GEMINI_API_KEY detected. ` +
    `I received your message: "${message.slice(0, 80)}". ` +
    `Set GEMINI_API_KEY in your .env file to enable real AI responses. ` +
    `The memory system, streaming, and all other features are working correctly.`;
  const words = response.split(' ');
  for (const word of words) {
    yield word + ' ';
    await new Promise((r) => setTimeout(r, 28));
  }
}

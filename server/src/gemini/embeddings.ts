import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '../config.js';
import { retryWithBackoff } from './adapter.js';

export function getLocalHashingEmbedding(text: string, dimensions = 768): number[] {
  const vec = new Array(dimensions).fill(0);
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  if (tokens.length === 0) return vec;

  // djb2 hash function
  const hash = (str: string) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = (h * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(h);
  };

  for (const token of tokens) {
    const idx = hash(token) % dimensions;
    vec[idx] += 1;
  }

  // Normalize vector to unit length
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    sumSq += vec[i] * vec[i];
  }
  if (sumSq > 0) {
    const norm = Math.sqrt(sumSq);
    for (let i = 0; i < dimensions; i++) {
      vec[i] /= norm;
    }
  }
  return vec;
}

export async function getEmbedding(text: string, customApiKey?: string): Promise<number[]> {
  const apiKey = customApiKey || GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Embeddings] Gemini key missing, falling back to local TF-IDF vectorizer.');
    return getLocalHashingEmbedding(text);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Wrap embedding creation with retryWithBackoff
    const response = await retryWithBackoff(() =>
      ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      })
    );

    if (!response.embeddings || !response.embeddings[0] || !response.embeddings[0].values) {
      throw new Error('Malformed API embedding response');
    }

    return response.embeddings[0].values;
  } catch (err) {
    console.warn('[Embeddings] API embedding failed, falling back to local vectorizer:', String(err));
    return getLocalHashingEmbedding(text);
  }
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

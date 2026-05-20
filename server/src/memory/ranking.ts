import type { MemoryRecord } from '../types.js';
import { cosineSimilarity } from '../gemini/embeddings.js';

function tokenOverlap(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  let overlap = 0;
  for (const token of setA) {
    if (setB.has(token)) overlap++;
  }
  return overlap / Math.max(setA.size, 1);
}

function recencyScore(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  return Math.exp(-ageDays / 30); // half-life ~30 days
}

export function rankMemories(
  memories: MemoryRecord[],
  query: string,
  topK = 5,
  queryEmbedding?: number[],
): MemoryRecord[] {
  const scored = memories.map((m) => {
    let relevance = 0;
    
    if (queryEmbedding && m.embedding) {
      relevance = cosineSimilarity(queryEmbedding, m.embedding);
    } else {
      relevance = tokenOverlap(query, m.content);
    }

    const ageDays = (Date.now() - new Date(m.createdAt).getTime()) / 86_400_000;
    const temporalDecay = Math.exp(-ageDays / 30); // e^(-lambda * t)

    const reinforcement = m.reinforcementScore || Math.min((m.accessCount || 0) * 0.1, 1.0);
    const importance = m.importance || 0.5;
    const behavioral = tokenOverlap(query, m.content);

    // Dynamic memory gravity equation:
    // Mt = (S_c * alpha) + (R_f * beta) + (E_w * gamma) + (B_c * delta) - temporal_penalty
    const alpha = 0.55;
    const beta = 0.15;
    const gamma = 0.15;
    const delta = 0.15;

    // Temporal penalty grows as decay factor decreases (i.e. older records)
    const temporalPenalty = (1.0 - temporalDecay) * 0.25;

    const Mt = (relevance * alpha) + (reinforcement * beta) + (importance * gamma) + (behavioral * delta) - temporalPenalty;

    return { memory: m, score: Math.max(Mt, 0) };
  });

  return scored
    .filter((s) => s.score > 0.01)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.memory);
}

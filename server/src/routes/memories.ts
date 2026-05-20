import { Router } from 'express';
import { memoryStore } from '../memory/store.js';
import { rankMemories } from '../memory/ranking.js';
import { getEmbedding } from '../gemini/embeddings.js';

const router = Router();

router.get('/memories', async (req, res) => {
  try {
    const query = (req.query.query as string) ?? '';
    const clientKey = req.headers['x-gemini-key'] as string | undefined;
    const all = await memoryStore.getAll();
    
    let results = all;
    if (query.trim()) {
      let embedding: number[] | undefined = undefined;
      try {
        embedding = await getEmbedding(query, clientKey);
      } catch (err) {
        console.warn('Embedding calculation failed on search query, falling back to overlap:', err);
      }
      results = rankMemories(all, query, 20, embedding);
    }
    res.json({ memories: results });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/memories', async (req, res) => {
  try {
    const { content, tags } = req.body as { content?: string; tags?: string[] };
    const clientKey = req.headers['x-gemini-key'] as string | undefined;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }
    
    let embedding: number[] | undefined = undefined;
    try {
      embedding = await getEmbedding(content.trim(), clientKey);
    } catch (err) {
      console.warn('Embedding generation failed for memory, saving without vector:', err);
    }

    const record = await memoryStore.add(content.trim(), tags ?? [], embedding);
    res.status(201).json({ memory: record });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete('/memories/:id', async (req, res) => {
  try {
    const deleted = await memoryStore.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Memory not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

import { v4 as uuid } from 'uuid';
import { db, initDatabase } from './db.js';
import type { MemoryRecord } from '../types.js';

export class MemoryStore {
  async init(): Promise<void> {
    await initDatabase();
  }

  async getAll(): Promise<MemoryRecord[]> {
    try {
      const rows = await db.all('SELECT * FROM memories ORDER BY createdAt DESC');
      return rows.map((row: any) => ({
        id: row.id,
        content: row.content,
        tags: row.tags ? JSON.parse(row.tags) : [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        importance: row.importance ?? 0.5,
        accessCount: row.accessCount ?? 0,
        embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
        emotionalVector: row.emotionalVector ? JSON.parse(row.emotionalVector) : undefined,
        workflowVector: row.workflowVector ? JSON.parse(row.workflowVector) : undefined,
        behavioralVector: row.behavioralVector ? JSON.parse(row.behavioralVector) : undefined,
        reinforcementScore: row.reinforcementScore ?? 0.0,
        evolutionHistory: row.evolutionHistory ? JSON.parse(row.evolutionHistory) : []
      }));
    } catch (err) {
      console.error('[MemoryStore] Failed to retrieve memories:', err);
      return [];
    }
  }

  async add(
    content: string, 
    tags: string[] = [], 
    embedding?: number[],
    emotionalVector?: number[],
    workflowVector?: number[],
    behavioralVector?: number[]
  ): Promise<MemoryRecord> {
    const id = uuid();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    const importance = 0.5;
    const accessCount = 0;
    const reinforcementScore = 0.0;
    const evolutionHistory: string[] = ['Memory Created'];

    try {
      await db.run(
        `INSERT INTO memories (
          id, content, tags, createdAt, updatedAt, importance, accessCount, 
          embedding, emotionalVector, workflowVector, behavioralVector, 
          reinforcementScore, evolutionHistory
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          content,
          JSON.stringify(tags),
          createdAt,
          updatedAt,
          importance,
          accessCount,
          embedding ? JSON.stringify(embedding) : null,
          emotionalVector ? JSON.stringify(emotionalVector) : null,
          workflowVector ? JSON.stringify(workflowVector) : null,
          behavioralVector ? JSON.stringify(behavioralVector) : null,
          reinforcementScore,
          JSON.stringify(evolutionHistory)
        ]
      );

      // Create a node corresponding to this memory in the Thought Graph
      await db.run('INSERT OR IGNORE INTO nodes (id, type, name, metadata) VALUES (?, ?, ?, ?)', [
        id,
        'memory',
        content.slice(0, 40),
        JSON.stringify({ tags })
      ]);

      // Connect memory node to rootGoal
      await db.run('INSERT OR IGNORE INTO edges (source, target, relation) VALUES (?, ?, ?)', [
        'g1',
        id,
        'RELATED_TO'
      ]);

    } catch (err) {
      console.error('[MemoryStore] Failed to insert memory:', err);
    }

    return {
      id,
      content,
      tags,
      createdAt,
      updatedAt,
      importance,
      accessCount,
      embedding,
      emotionalVector,
      workflowVector,
      behavioralVector,
      reinforcementScore,
      evolutionHistory
    };
  }

  async delete(id: string): Promise<boolean> {
    try {
      const res = await db.run('DELETE FROM memories WHERE id = ?', [id]);
      // Remove corresponding Graph node and links
      await db.run('DELETE FROM nodes WHERE id = ?', [id]);
      await db.run('DELETE FROM edges WHERE source = ? OR target = ?', [id, id]);
      return res.changes > 0;
    } catch (err) {
      console.error('[MemoryStore] Failed to delete memory:', err);
      return false;
    }
  }

  async touchAccess(id: string): Promise<void> {
    try {
      const m = await db.get('SELECT accessCount, reinforcementScore, evolutionHistory FROM memories WHERE id = ?', [id]);
      if (m) {
        const nextAccess = (m.accessCount ?? 0) + 1;
        const nextScore = Math.min((m.reinforcementScore ?? 0) + 0.1, 1.0);
        const history = m.evolutionHistory ? JSON.parse(m.evolutionHistory) : [];
        history.push(`Accessed memory (total times: ${nextAccess})`);

        await db.run(
          'UPDATE memories SET accessCount = ?, reinforcementScore = ?, evolutionHistory = ?, updatedAt = ? WHERE id = ?',
          [
            nextAccess,
            nextScore,
            JSON.stringify(history),
            new Date().toISOString(),
            id
          ]
        );
      }
    } catch (err) {
      console.error('[MemoryStore] Failed to update access stats:', err);
    }
  }
}

// Singleton — shared across all routes
export const memoryStore = new MemoryStore();

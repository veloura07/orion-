import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store database file in customizable directory (ideal for persistent volume mounts)
const customDbPath = process.env.DATABASE_PATH;
const dbPath = customDbPath 
  ? path.resolve(customDbPath) 
  : path.join(path.resolve(__dirname, '../../../data'), 'orion.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Instantiate sqlite3 Database in verbose mode for troubleshooting
const verboseSqlite = sqlite3.verbose();
const dbConnection = new verboseSqlite.Database(dbPath);

// Wrap sqlite3 in a promise-based interface
export const db = {
  run(sql: string, params: any[] = []): Promise<{ lastID: any; changes: number }> {
    return new Promise((resolve, reject) => {
      dbConnection.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      dbConnection.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  },

  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      dbConnection.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  },

  exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      dbConnection.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

export async function initDatabase(): Promise<void> {
  // 1. Create memories table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      tags TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      importance REAL DEFAULT 0.5,
      accessCount INTEGER DEFAULT 0,
      embedding TEXT,
      emotionalVector TEXT,
      workflowVector TEXT,
      behavioralVector TEXT,
      reinforcementScore REAL DEFAULT 0.0,
      evolutionHistory TEXT
    );
  `);

  // 2. Create nodes table (Thought Graph Entities)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      metadata TEXT
    );
  `);

  // 3. Create edges table (Relational Ties)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS edges (
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      relation TEXT NOT NULL,
      PRIMARY KEY (source, target, relation)
    );
  `);

  // Insert default system nodes if empty
  const rootGoal = await db.get('SELECT id FROM nodes WHERE id = ?', ['g1']);
  if (!rootGoal) {
    await db.run('INSERT INTO nodes (id, type, name, metadata) VALUES (?, ?, ?, ?)', [
      'g1',
      'goal',
      'Maintain RAG Stability & System Performance',
      JSON.stringify({ createdBy: 'Orion' })
    ]);
  }
}

// Automatically trigger migration checks on import
initDatabase()
  .then(() => console.log(`[Database] Persistent SQLite ready at: ${dbPath}`))
  .catch((err) => console.error('[Database] Critical initialization error:', err));

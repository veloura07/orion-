import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { PORT, CORS_ORIGIN, HAS_GEMINI_KEY, MODELS } from './config.js';
import { memoryStore } from './memory/store.js';
import healthRouter from './routes/health.js';
import memoriesRouter from './routes/memories.js';
import chatRouter from './routes/chat.js';
import eventsRouter from './routes/events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '12mb' })); // support large base64 image capture payloads

app.use('/api', healthRouter);
app.use('/api', memoriesRouter);
app.use('/api', chatRouter);
app.use('/api', eventsRouter);

// Serve static client production build files
const distPath = path.join(__dirname, '../../client/dist');
app.use(express.static(distPath));

// Fallback to client routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      // If client is not compiled yet, don't crash
      res.status(404).send('Static assets not found. Build the client project first.');
    }
  });
});

async function main(): Promise<void> {
  await memoryStore.init();

  app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════╗');
    console.log('║  Orion Server — Safe Web MVP     ║');
    console.log('╚══════════════════════════════════╝');
    console.log(`  URL     : http://localhost:${PORT}`);
    console.log(`  Gemini  : ${HAS_GEMINI_KEY ? '✓ key loaded' : '⚠  no key — mock mode'}`);
    console.log(`  Models  : fast=${MODELS.fast}`);
    console.log(`             balanced=${MODELS.balanced}`);
    console.log(`             deep=${MODELS.deep}`);
    console.log('');
  });
}

main().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

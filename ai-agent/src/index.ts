import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import express from 'express';
import cors from 'cors';
import respondRouter from './routes/respond.js';
import summarizeRouter from './routes/summarize.js';
import analyzeRouter from './routes/analyze.js';

const PORT = parseInt(process.env.AI_AGENT_PORT || '3001');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-agent', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', respondRouter);
app.use('/api', summarizeRouter);
app.use('/api', analyzeRouter);

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║        TwinGovernance AI Agent             ║
║        Port: ${PORT}                    ║
║        Model: Claude Sonnet          ║
╚══════════════════════════════════════╝
  `);
});

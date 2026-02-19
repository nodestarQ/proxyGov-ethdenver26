import 'dotenv/config';
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
║        proxyGov AI Agent             ║
║        Port: ${PORT}                    ║
║        Model: Claude Sonnet          ║
╚══════════════════════════════════════╝
  `);
});

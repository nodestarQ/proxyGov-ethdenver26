import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname0 = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname0, '../../.env') });

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initDb } from './db.js';
import { setupSocket } from './socket.js';
import messagesRouter from './routes/messages.js';
import twinRouter from './routes/twin.js';
import uniswapRouter from './routes/uniswap.js';
import pollRouter from './routes/poll.js';
import userRouter from './routes/user.js';
import { getTokenPrice } from './uniswap.js';

const PORT = parseInt(process.env.PORT || '3002');

// Initialize database
initDb();

// Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// API routes
app.use('/api', messagesRouter);
app.use('/api', twinRouter);
app.use('/api', uniswapRouter);
app.use('/api', pollRouter);
app.use('/api', userRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend in production
const publicPath = path.join(__dirname0, '..', 'public');
app.use(express.static(publicPath));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// HTTP + Socket.IO server
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setupSocket(io);

// Background price monitoring (60s interval)
const MONITORED_TOKENS = ['ETH', 'UNI'];
setInterval(async () => {
  for (const symbol of MONITORED_TOKENS) {
    try {
      const price = await getTokenPrice(symbol);
      io.emit('price:update', {
        symbol,
        address: '',
        priceUsd: price,
        timestamp: new Date().toISOString()
      });
    } catch {
      // ignore
    }
  }
}, 60_000);

// Start server
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║        TwinGovernance Backend              ║
║        Port: ${PORT}                    ║
║        DB: SQLite (in-memory)        ║
╚══════════════════════════════════════╝
  `);
});

export { io };

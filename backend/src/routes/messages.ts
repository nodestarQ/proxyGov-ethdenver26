import { Router } from 'express';
import { db } from '../db.js';
import { messages } from '../schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/messages', (req, res) => {
  const channelId = req.query.channelId as string;
  if (!channelId) {
    res.status(400).json({ error: 'channelId required' });
    return;
  }

  const rows = db.select().from(messages)
    .where(eq(messages.channelId, channelId))
    .all();

  const result = rows.map(m => ({
    ...m,
    reactions: JSON.parse(m.reactions),
    isTwin: Boolean(m.isTwin)
  }));

  res.json(result);
});

// Summarize endpoint — proxies to AI agent
router.post('/summarize', async (req, res) => {
  const { channelId, userAddress, userInterests } = req.body;
  if (!channelId) {
    res.status(400).json({ error: 'channelId required' });
    return;
  }

  const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:3001';

  const rows = db.select().from(messages)
    .where(eq(messages.channelId, channelId))
    .all()
    .slice(-50); // Last 50 messages

  const msgs = rows.map(m => ({
    sender: m.senderName,
    content: m.content,
    isTwin: Boolean(m.isTwin),
    timestamp: m.timestamp,
    type: m.type
  }));

  try {
    const agentRes = await fetch(`${AI_AGENT_URL}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, userInterests: userInterests ?? [], channelId })
    });

    if (!agentRes.ok) {
      res.status(502).json({ error: 'AI agent error' });
      return;
    }

    const summary = await agentRes.json();
    res.json({ ...summary, channelId });
  } catch {
    res.status(502).json({ error: 'AI agent unreachable' });
  }
});

export default router;

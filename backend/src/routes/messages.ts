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

export default router;

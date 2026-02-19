import { Router } from 'express';
import { summarizeConversation } from '../summarizer.js';

const router = Router();

router.post('/summarize', async (req, res) => {
  const { messages, userInterests, channelId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array required' });
    return;
  }

  try {
    const summary = await summarizeConversation(
      messages,
      userInterests ?? [],
      channelId ?? 'general'
    );
    res.json(summary);
  } catch (err: any) {
    console.error('[summarize] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

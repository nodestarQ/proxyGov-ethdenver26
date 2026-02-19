import { Router } from 'express';
import { shouldRespond, generateResponse } from '../twin-brain.js';

const router = Router();

router.post('/respond', async (req, res) => {
  const { message, sender, twinConfig, recentMessages, channelId, memberCount } = req.body;

  if (!message || !twinConfig) {
    res.status(400).json({ error: 'message and twinConfig required' });
    return;
  }

  try {
    const should = shouldRespond(message, sender, twinConfig, recentMessages ?? []);

    if (!should) {
      res.json({ shouldRespond: false, response: null });
      return;
    }

    const response = await generateResponse(
      message,
      sender,
      twinConfig,
      recentMessages ?? [],
      { channelId: channelId ?? 'general', memberCount: memberCount ?? 1 }
    );

    res.json({ shouldRespond: true, response });
  } catch (err: any) {
    console.error('[respond] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

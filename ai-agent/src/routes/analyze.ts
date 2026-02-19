import { Router } from 'express';
import { analyzeForOpportunities } from '../opportunity.js';

const router = Router();

router.post('/analyze', async (req, res) => {
  const { messages, userInterests } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array required' });
    return;
  }

  try {
    const opportunities = await analyzeForOpportunities(messages, userInterests ?? []);
    res.json({ opportunities });
  } catch (err: any) {
    console.error('[analyze] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

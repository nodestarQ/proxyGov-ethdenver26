import { Router } from 'express';
import { db } from '../db.js';
import { twinConfigs, users } from '../schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/twin/:address', (req, res) => {
  const { address } = req.params;
  const config = db.select().from(twinConfigs).where(eq(twinConfigs.ownerAddress, address)).get();

  if (!config) {
    res.status(404).json({ error: 'Twin config not found' });
    return;
  }

  res.json({
    ...config,
    enabled: Boolean(config.enabled),
    autoSummarize: Boolean(config.autoSummarize)
  });
});

router.put('/twin/:address', (req, res) => {
  const { address } = req.params;
  const body = req.body;
  const now = new Date().toISOString();

  const existing = db.select().from(twinConfigs).where(eq(twinConfigs.ownerAddress, address)).get();

  const data = {
    ownerAddress: address,
    enabled: body.enabled ?? false,
    personality: body.personality ?? '',
    interests: body.interests ?? '',
    responseStyle: body.responseStyle ?? '',
    autonomousCapUsd: body.autonomousCapUsd ?? 100,
    autoSummarize: body.autoSummarize ?? true,
    updatedAt: now
  };

  if (existing) {
    db.update(twinConfigs).set(data).where(eq(twinConfigs.ownerAddress, address)).run();
  } else {
    db.insert(twinConfigs).values({ ...data, createdAt: now }).run();
  }

  // Update user's twinEnabled flag
  db.update(users).set({ twinEnabled: data.enabled }).where(eq(users.address, address)).run();

  res.json({
    ...data,
    createdAt: existing?.createdAt ?? now
  });
});

export default router;

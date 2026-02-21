import { Router } from 'express';
import { db } from '../db.js';
import { users } from '../schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Check if user profile exists
router.get('/user/:address', (req, res) => {
  const { address } = req.params;
  const user = db.select().from(users).where(eq(users.address, address)).get();

  if (!user) {
    res.json({ exists: false });
    return;
  }

  res.json({
    exists: true,
    profileSetup: !!user.displayName, // display name set = profile was set up
    address: user.address,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl
  });
});

// Create or update user profile
router.put('/user/:address', (req, res) => {
  const { address } = req.params;
  const { displayName, avatarUrl } = req.body;

  if (!displayName || displayName.trim().length === 0) {
    res.status(400).json({ error: 'Display name is required' });
    return;
  }

  const now = new Date().toISOString();
  const existing = db.select().from(users).where(eq(users.address, address)).get();

  if (existing) {
    db.update(users)
      .set({ displayName: displayName.trim(), avatarUrl: avatarUrl ?? null })
      .where(eq(users.address, address))
      .run();
  } else {
    db.insert(users).values({
      address,
      displayName: displayName.trim(),
      avatarUrl: avatarUrl ?? null,
      status: 'offline',
      twinEnabled: false,
      joinedAt: now
    }).run();
  }

  res.json({ address, displayName: displayName.trim(), avatarUrl });
});

export default router;

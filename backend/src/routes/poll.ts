import { Router } from 'express';
import { db } from '../db.js';
import { polls } from '../schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

const router: ReturnType<typeof Router> = Router();

router.post('/poll', (req, res) => {
  const { channelId, question, options, creator } = req.body;

  if (!channelId || !question || !options || options.length < 2) {
    res.status(400).json({ error: 'channelId, question, and at least 2 options required' });
    return;
  }

  const pollOptions = options.map((text: string) => ({
    id: uuid(),
    text,
    votes: [] as string[]
  }));

  const poll = {
    id: uuid(),
    channelId,
    creator: creator ?? 'unknown',
    question,
    options: JSON.stringify(pollOptions),
    createdAt: new Date().toISOString()
  };

  db.insert(polls).values(poll).run();

  res.json({
    ...poll,
    options: pollOptions
  });
});

router.put('/poll/:pollId/vote', (req, res) => {
  const { pollId } = req.params;
  const { optionId, voter } = req.body;

  const poll = db.select().from(polls).where(eq(polls.id, pollId)).get();
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  const options = JSON.parse(poll.options);
  // Remove previous vote by this voter
  for (const opt of options) {
    opt.votes = opt.votes.filter((v: string) => v !== voter);
  }
  // Add new vote
  const target = options.find((o: any) => o.id === optionId);
  if (target) {
    target.votes.push(voter ?? 'unknown');
  }

  db.update(polls).set({ options: JSON.stringify(options) }).where(eq(polls.id, pollId)).run();

  res.json({
    ...poll,
    options
  });
});

export default router;

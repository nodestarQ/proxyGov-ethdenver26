import { Router } from 'express';
import { db } from '../db.js';
import { swapProposals } from '../schema.js';
import { eq } from 'drizzle-orm';
import type { SwapProposalPayload, SwapVote } from '../../../shared/types.js';

const router: ReturnType<typeof Router> = Router();

// GET /api/swap?channelId= — list proposals for a channel
router.get('/swap', (req, res) => {
  const channelId = req.query.channelId as string;
  if (!channelId) {
    res.status(400).json({ error: 'channelId is required' });
    return;
  }

  const rows = db.select().from(swapProposals)
    .where(eq(swapProposals.channelId, channelId))
    .all();

  const proposals: SwapProposalPayload[] = rows.map(row => ({
    proposalId: row.id,
    tokenInSymbol: row.tokenInSymbol,
    tokenOutSymbol: row.tokenOutSymbol,
    tokenInAddress: row.tokenInAddress,
    tokenOutAddress: row.tokenOutAddress,
    amountIn: row.amountIn,
    amountOut: row.amountOut,
    amountInUsd: row.amountInUsd,
    quote: row.quote ? JSON.parse(row.quote) : undefined,
    votes: JSON.parse(row.votes) as SwapVote[],
    totalMembers: row.totalMembers,
    status: row.status as SwapProposalPayload['status'],
    txHash: row.txHash ?? undefined,
    failReason: row.failReason ?? undefined,
    createdAt: row.createdAt,
    creator: row.creator,
    creatorName: row.creatorName
  }));

  res.json(proposals);
});

// GET /api/swap/:proposalId — get single proposal
router.get('/swap/:proposalId', (req, res) => {
  const row = db.select().from(swapProposals)
    .where(eq(swapProposals.id, req.params.proposalId))
    .get();

  if (!row) {
    res.status(404).json({ error: 'Proposal not found' });
    return;
  }

  const proposal: SwapProposalPayload = {
    proposalId: row.id,
    tokenInSymbol: row.tokenInSymbol,
    tokenOutSymbol: row.tokenOutSymbol,
    tokenInAddress: row.tokenInAddress,
    tokenOutAddress: row.tokenOutAddress,
    amountIn: row.amountIn,
    amountOut: row.amountOut,
    amountInUsd: row.amountInUsd,
    quote: row.quote ? JSON.parse(row.quote) : undefined,
    votes: JSON.parse(row.votes) as SwapVote[],
    totalMembers: row.totalMembers,
    status: row.status as SwapProposalPayload['status'],
    txHash: row.txHash ?? undefined,
    failReason: row.failReason ?? undefined,
    createdAt: row.createdAt,
    creator: row.creator,
    creatorName: row.creatorName
  };

  res.json(proposal);
});

export default router;

import { Router } from 'express';
import { db } from '../db.js';
import { messages, channelContexts } from '../schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

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

// Rolling context summarize endpoint
router.post('/summarize', async (req, res) => {
  const { channelId, userAddress, userInterests } = req.body;
  if (!channelId || !userAddress) {
    res.status(400).json({ error: 'channelId and userAddress required' });
    return;
  }

  const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:3001';

  // Look up existing context for this user + channel
  const existing = db.select().from(channelContexts)
    .where(and(
      eq(channelContexts.channelId, channelId),
      eq(channelContexts.userAddress, userAddress)
    ))
    .get();

  let rows;
  let previousContext: any = null;

  if (existing) {
    // Fetch only messages newer than last summarized
    rows = db.select().from(messages)
      .where(and(
        eq(messages.channelId, channelId),
        gt(messages.timestamp, existing.lastMessageTimestamp)
      ))
      .all();

    // No new messages - return existing summary as up-to-date
    if (rows.length === 0) {
      res.json({
        channelId,
        summary: existing.summary,
        keyTopics: JSON.parse(existing.keyTopics),
        actionItems: JSON.parse(existing.actionItems),
        mentionedTokens: JSON.parse(existing.mentionedTokens),
        messageCount: existing.messageCount,
        timeRange: { from: existing.createdAt, to: existing.lastMessageTimestamp },
        isUpToDate: true
      });
      return;
    }

    previousContext = {
      summary: existing.summary,
      keyTopics: JSON.parse(existing.keyTopics),
      actionItems: JSON.parse(existing.actionItems),
      mentionedTokens: JSON.parse(existing.mentionedTokens),
      messageCount: existing.messageCount
    };
  } else {
    // First time - fetch all messages for the channel
    rows = db.select().from(messages)
      .where(eq(messages.channelId, channelId))
      .all();
  }

  if (rows.length === 0) {
    res.json({
      channelId,
      summary: 'No messages in this channel yet.',
      keyTopics: [],
      actionItems: [],
      mentionedTokens: [],
      messageCount: 0,
      timeRange: { from: '', to: '' },
      isUpToDate: true
    });
    return;
  }

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
      body: JSON.stringify({
        messages: msgs,
        userInterests: userInterests ?? [],
        channelId,
        previousContext
      })
    });

    if (!agentRes.ok) {
      res.status(502).json({ error: 'AI agent error' });
      return;
    }

    const summary = await agentRes.json();
    const now = new Date().toISOString();
    const lastTimestamp = rows[rows.length - 1].timestamp;
    const totalCount = (previousContext?.messageCount ?? 0) + rows.length;

    // Upsert context
    if (existing) {
      db.update(channelContexts)
        .set({
          summary: summary.summary,
          keyTopics: JSON.stringify(summary.keyTopics ?? []),
          actionItems: JSON.stringify(summary.actionItems ?? []),
          mentionedTokens: JSON.stringify(summary.mentionedTokens ?? []),
          messageCount: totalCount,
          lastMessageTimestamp: lastTimestamp,
          createdAt: now
        })
        .where(eq(channelContexts.id, existing.id))
        .run();
    } else {
      db.insert(channelContexts)
        .values({
          id: uuid(),
          channelId,
          userAddress,
          summary: summary.summary,
          keyTopics: JSON.stringify(summary.keyTopics ?? []),
          actionItems: JSON.stringify(summary.actionItems ?? []),
          mentionedTokens: JSON.stringify(summary.mentionedTokens ?? []),
          messageCount: totalCount,
          lastMessageTimestamp: lastTimestamp,
          createdAt: now
        })
        .run();
    }

    res.json({
      ...summary,
      channelId,
      messageCount: totalCount,
      isUpToDate: false
    });
  } catch {
    res.status(502).json({ error: 'AI agent unreachable' });
  }
});

export default router;

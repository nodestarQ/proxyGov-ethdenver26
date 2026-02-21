import { Server, type Socket } from 'socket.io';
import { db } from './db.js';
import { users, messages, channelMembers } from './schema.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { verifyMessage, type Address } from 'viem';
import type { ServerToClientEvents, ClientToServerEvents, User, Message } from '../../shared/types.js';

// Track connected sockets by address
const connectedUsers = new Map<string, { socketId: string; displayName: string }>();

function generateDisplayName(address: string): string {
  const hash = address.toLowerCase().slice(2, 10);
  const adjectives = ['Swift', 'Bold', 'Wise', 'Iron', 'Neon', 'Void', 'Flux', 'Grid'];
  const nouns = ['Voter', 'Whale', 'Degen', 'Signer', 'Holder', 'Agent', 'Node', 'Proxy'];
  const adjIdx = parseInt(hash.slice(0, 4), 16) % adjectives.length;
  const nounIdx = parseInt(hash.slice(4, 8), 16) % nouns.length;
  return `${adjectives[adjIdx]}${nouns[nounIdx]}`;
}

export function setupSocket(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on('connection', (socket) => {
    let userAddress: string | null = null;

    socket.on('user:authenticate', async ({ address, signature, message }) => {
      // Verify SIWE signature
      try {
        const valid = await verifyMessage({
          address: address as Address,
          message,
          signature: signature as `0x${string}`
        });

        if (!valid) {
          console.warn(`[socket] SIWE verification failed for ${address.slice(0, 8)}...`);
          socket.emit('message:new', {
            id: uuid(),
            channelId: 'general',
            sender: 'system',
            senderName: 'System',
            isTwin: false,
            type: 'system',
            content: 'Signature verification failed. Please reconnect.',
            signal: { up: [], down: [] },
            timestamp: new Date().toISOString()
          });
          socket.disconnect(true);
          return;
        }

        // Check timestamp freshness (5 min window)
        const issuedAtMatch = message.match(/Issued At: (.+)$/m);
        if (issuedAtMatch) {
          const issuedAt = new Date(issuedAtMatch[1]).getTime();
          const now = Date.now();
          if (now - issuedAt > 5 * 60 * 1000) {
            console.warn(`[socket] SIWE message expired for ${address.slice(0, 8)}...`);
            socket.disconnect(true);
            return;
          }
        }
      } catch (err) {
        console.error(`[socket] SIWE verification error:`, err);
        socket.disconnect(true);
        return;
      }

      userAddress = address;

      // Upsert user - use saved display name if profile exists, else generate one
      const now = new Date().toISOString();
      const existing = db.select().from(users).where(eq(users.address, address)).get();
      const displayName = existing?.displayName ?? generateDisplayName(address);

      if (!existing) {
        db.insert(users).values({
          address,
          displayName,
          status: 'online',
          twinEnabled: false,
          joinedAt: now
        }).run();
      } else {
        db.update(users).set({ status: 'online' }).where(eq(users.address, address)).run();
      }

      connectedUsers.set(address, { socketId: socket.id, displayName });

      // Broadcast user join
      const user: User = {
        address,
        displayName,
        avatarUrl: existing?.avatarUrl ?? undefined,
        status: 'online',
        twinEnabled: existing?.twinEnabled ?? false,
        joinedAt: existing?.joinedAt ?? now
      };
      io.emit('user:join', user);

      console.log(`[socket] ${displayName} (${address.slice(0, 8)}...) SIWE verified & connected`);
    });

    socket.on('channel:join', (channelId) => {
      socket.join(channelId);

      if (userAddress) {
        // Add to channel members
        const existing = db.select().from(channelMembers)
          .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userAddress, userAddress)))
          .get();
        if (!existing) {
          db.insert(channelMembers).values({ channelId, userAddress }).run();
        }

        // Send current channel members
        const members = getChannelMembers(channelId);
        socket.emit('channel:members', { channelId, members });
      }
    });

    socket.on('channel:leave', (channelId) => {
      socket.leave(channelId);
    });

    socket.on('message:send', async ({ channelId, content, type }) => {
      if (!userAddress) return;

      const userData = connectedUsers.get(userAddress);
      const msg: Message = {
        id: uuid(),
        channelId,
        sender: userAddress,
        senderName: userData?.displayName ?? userAddress.slice(0, 8),
        isTwin: false,
        type: type ?? 'text',
        content,
        signal: { up: [], down: [] },
        timestamp: new Date().toISOString()
      };

      // Persist
      db.insert(messages).values({
        ...msg,
        signal: JSON.stringify(msg.signal),
        isTwin: false
      }).run();

      // Broadcast to channel
      io.to(channelId).emit('message:new', msg);

      // Check for slash commands - backend processes them
      if (content.startsWith('/')) {
        await handleSlashCommand(io, channelId, userAddress, content);
      }

      // Check if any AI twins should respond
      await checkTwinResponses(io, channelId, msg);
    });

    socket.on('message:signal', ({ messageId, vote }) => {
      if (!userAddress) return;

      const msg = db.select().from(messages).where(eq(messages.id, messageId)).get();
      if (!msg) return;

      const signal: { up: string[]; down: string[] } = JSON.parse(msg.signal);
      const opposite = vote === 'up' ? 'down' : 'up';

      // Remove from opposite array if present
      signal[opposite] = signal[opposite].filter(a => a !== userAddress);

      // Toggle: if already in the voted array, remove (toggle off); otherwise add
      const idx = signal[vote].indexOf(userAddress);
      let action: 'add' | 'remove';
      if (idx >= 0) {
        signal[vote].splice(idx, 1);
        action = 'remove';
      } else {
        signal[vote].push(userAddress);
        action = 'add';
      }

      db.update(messages).set({ signal: JSON.stringify(signal) }).where(eq(messages.id, messageId)).run();

      io.to(msg.channelId).emit('message:signal', { messageId, vote, address: userAddress, action });
    });

    socket.on('user:status', (status) => {
      if (!userAddress) return;
      db.update(users).set({ status }).where(eq(users.address, userAddress)).run();
      io.emit('user:status', { address: userAddress, status });
    });

    socket.on('disconnect', () => {
      if (userAddress) {
        connectedUsers.delete(userAddress);
        const user = db.select().from(users).where(eq(users.address, userAddress)).get();
        if (user?.twinEnabled) {
          // Twin stays active: mark as away so twin can still respond
          db.update(users).set({ status: 'away' }).where(eq(users.address, userAddress)).run();
          io.emit('user:status', { address: userAddress, status: 'away' as const });
          console.log(`[socket] ${userAddress.slice(0, 8)}... disconnected (twin stays active)`);
        } else {
          db.update(users).set({ status: 'offline' }).where(eq(users.address, userAddress)).run();
          io.emit('user:leave', userAddress);
          console.log(`[socket] ${userAddress.slice(0, 8)}... disconnected`);
        }
      }
    });
  });
}

function getChannelMembers(channelId: string): User[] {
  const rows = db.select({
    address: users.address,
    displayName: users.displayName,
    ensName: users.ensName,
    avatarUrl: users.avatarUrl,
    status: users.status,
    twinEnabled: users.twinEnabled,
    joinedAt: users.joinedAt
  })
    .from(channelMembers)
    .innerJoin(users, eq(channelMembers.userAddress, users.address))
    .where(eq(channelMembers.channelId, channelId))
    .all();

  return rows.map(r => ({
    address: r.address,
    displayName: r.displayName,
    ensName: r.ensName ?? undefined,
    avatarUrl: r.avatarUrl ?? undefined,
    status: r.status as User['status'],
    twinEnabled: r.twinEnabled,
    joinedAt: r.joinedAt
  }));
}

async function handleSlashCommand(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  channelId: string,
  sender: string,
  content: string
) {
  const parts = content.trim().split(/\s+/);
  const command = parts[0].toLowerCase();

  if (command === '/swap' && parts.length >= 4) {
    // /swap ETH USDC 0.01
    const [, tokenIn, tokenOut, amount] = parts;
    try {
      const backendUrl = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3000';
      const res = await fetch(`${backendUrl}/api/uniswap/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIn, tokenOut, amount })
      });
      const quote = await res.json();

      const payload = JSON.stringify({
        tokenIn: tokenIn.toUpperCase(),
        tokenOut: tokenOut.toUpperCase(),
        amount,
        quote: res.ok ? quote : null
      });

      const msg: Message = {
        id: uuid(),
        channelId,
        sender,
        senderName: connectedUsers.get(sender)?.displayName ?? sender.slice(0, 8),
        isTwin: false,
        type: 'swap-proposal',
        content: payload,
        signal: { up: [], down: [] },
        timestamp: new Date().toISOString()
      };

      db.insert(messages).values({ ...msg, signal: '{"up":[],"down":[]}', isTwin: false }).run();
      io.to(channelId).emit('message:new', msg);
    } catch (err) {
      console.error('[swap] Error fetching quote:', err);
    }
  } else if (command === '/poll' && parts.length >= 2) {
    // /poll "Question?" Option1, Option2, Option3
    const rest = content.slice(5).trim();
    const questionMatch = rest.match(/^[""](.+?)[""](.*)$/);
    if (questionMatch) {
      const question = questionMatch[1];
      const optionsStr = questionMatch[2].trim();
      const options = optionsStr.split(',').map(o => o.trim()).filter(Boolean);
      if (options.length >= 2) {
        const pollId = uuid();
        const pollOptions = options.map(text => ({ id: uuid(), text, votes: [] as string[] }));
        const poll = {
          id: pollId,
          channelId,
          creator: sender,
          question,
          options: pollOptions,
          createdAt: new Date().toISOString()
        };

        db.insert((await import('./schema.js')).polls).values({
          ...poll,
          options: JSON.stringify(pollOptions)
        }).run();

        const msg: Message = {
          id: uuid(),
          channelId,
          sender,
          senderName: connectedUsers.get(sender)?.displayName ?? sender.slice(0, 8),
          isTwin: false,
          type: 'poll',
          content: JSON.stringify(poll),
          signal: { up: [], down: [] },
          timestamp: new Date().toISOString()
        };

        db.insert(messages).values({ ...msg, signal: '{"up":[],"down":[]}', isTwin: false }).run();
        io.to(channelId).emit('message:new', msg);
      }
    }
  }
}

async function checkTwinResponses(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  channelId: string,
  message: Message
) {
  // Don't respond to twin messages or system messages
  if (message.isTwin || message.type !== 'text') return;

  try {
    const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:3001';

    // Get all twin configs for users who are away/offline in this channel
    const memberRows = db.select().from(channelMembers)
      .where(eq(channelMembers.channelId, channelId))
      .all();

    for (const member of memberRows) {
      if (member.userAddress === message.sender) continue; // Don't respond to self

      const user = db.select().from(users).where(eq(users.address, member.userAddress)).get();
      if (!user || user.status === 'online') continue; // Only respond when away/offline

      const twinConfig = db.select().from((await import('./schema.js')).twinConfigs)
        .where(eq((await import('./schema.js')).twinConfigs.ownerAddress, member.userAddress))
        .get();

      if (!twinConfig || !twinConfig.enabled) continue;

      // Only respond when explicitly @mentioned by displayName
      const mentionPattern = `@${user.displayName}`;
      if (!message.content.includes(mentionPattern)) continue;

      // Get recent messages for context
      const recentMsgs = db.select().from(messages)
        .where(eq(messages.channelId, channelId))
        .all()
        .slice(-20);

      try {
        const twinPayload = {
          ...twinConfig,
          ownerDisplayName: user.displayName
        };
        console.log(`[twin] Triggering twin for ${user.displayName}: personality="${twinConfig.personality?.slice(0, 50)}", interests="${twinConfig.interests?.slice(0, 50)}"`);

        const res = await fetch(`${AI_AGENT_URL}/api/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.content,
            sender: message.senderName,
            twinConfig: twinPayload,
            recentMessages: recentMsgs.map(m => ({
              sender: m.senderName,
              content: m.content,
              isTwin: m.isTwin,
              timestamp: m.timestamp,
              signalScore: (() => { const s = JSON.parse(m.signal); return s.up.length - s.down.length; })()
            })),
            channelId,
            memberCount: memberRows.length
          })
        });

        if (!res.ok) continue;
        const { shouldRespond, response } = await res.json();

        if (shouldRespond && response) {
          const twinMsg: Message = {
            id: uuid(),
            channelId,
            sender: member.userAddress,
            senderName: user.displayName,
            isTwin: true,
            type: 'text',
            content: response,
            signal: { up: [], down: [] },
            timestamp: new Date().toISOString()
          };

          db.insert(messages).values({ ...twinMsg, signal: '{"up":[],"down":[]}' }).run();
          // Small delay for natural feel
          setTimeout(() => {
            io.to(channelId).emit('message:new', twinMsg);
          }, 1500 + Math.random() * 2000);
        }
      } catch {
        // AI agent not running - skip
      }
    }
  } catch (err) {
    console.error('[twin] Error checking twin responses:', err);
  }
}

export { connectedUsers };

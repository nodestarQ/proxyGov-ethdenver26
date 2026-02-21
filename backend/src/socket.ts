import { Server, type Socket } from 'socket.io';
import { db } from './db.js';
import { users, messages, channelMembers, swapProposals, twinConfigs } from './schema.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { verifyMessage, type Address } from 'viem';
import type { ServerToClientEvents, ClientToServerEvents, User, Message, SwapProposalPayload, SwapVote } from '../../shared/types.js';
import { resolveTokenByAddress, resolveToken, checkDaoBalance, getDaoBalances, getQuote, getTokenPrice, executeSwap, getTokenAddress } from './uniswap.js';

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
      if (process.env.SKIP_AUTH !== 'true') {
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

      console.log(`[socket] ${displayName} (${address.slice(0, 8)}...) ${process.env.SKIP_AUTH === 'true' ? 'dev auth (SKIP_AUTH)' : 'SIWE verified'} & connected`);
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

        // Broadcast updated channel members to everyone in the channel
        const members = getChannelMembers(channelId);
        io.to(channelId).emit('channel:members', { channelId, members });
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

      // Prevent users from voting on their own messages
      if (msg.sender === userAddress) return;

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

    socket.on('user:typing', (channelId) => {
      if (!userAddress) return;
      socket.to(channelId).emit('user:typing', { address: userAddress, channelId });
    });

    socket.on('user:stop-typing', (channelId) => {
      if (!userAddress) return;
      socket.to(channelId).emit('user:stop-typing', { address: userAddress, channelId });
    });

    socket.on('swap:vote', async ({ proposalId, vote }) => {
      if (!userAddress) return;

      const proposal = db.select().from(swapProposals).where(eq(swapProposals.id, proposalId)).get();
      if (!proposal || proposal.status !== 'pending') return;

      const votes: SwapVote[] = JSON.parse(proposal.votes);
      if (votes.some(v => v.voter === userAddress && !v.isTwin)) return; // already voted

      const userData = connectedUsers.get(userAddress);
      votes.push({
        voter: userAddress,
        voterName: userData?.displayName ?? userAddress.slice(0, 8),
        vote,
        isTwin: false,
        timestamp: new Date().toISOString()
      });

      db.update(swapProposals).set({ votes: JSON.stringify(votes) }).where(eq(swapProposals.id, proposalId)).run();

      const payload = buildSwapPayload(
        db.select().from(swapProposals).where(eq(swapProposals.id, proposalId)).get()!
      );
      io.to(proposal.channelId).emit('swap:update', payload);

      await checkSwapThreshold(io, proposalId);
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

        // Broadcast updated member lists to all channels this user was in
        const userChannels = db.select().from(channelMembers)
          .where(eq(channelMembers.userAddress, userAddress))
          .all();
        for (const ch of userChannels) {
          const members = getChannelMembers(ch.channelId);
          io.to(ch.channelId).emit('channel:members', { channelId: ch.channelId, members });
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

  if (command === '/swap' && parts.length >= 5) {
    // /swap <tokenInAddr> <amountIn> <tokenOutAddr> <amountOut>
    const [, tokenInAddr, amountIn, tokenOutAddr, amountOut] = parts;
    try {
      // Resolve tokens by address
      const tokenInInfo = resolveTokenByAddress(tokenInAddr);
      const tokenOutInfo = resolveTokenByAddress(tokenOutAddr);
      if (!tokenInInfo || !tokenOutInfo) {
        emitSystemMessage(io, channelId, `Unknown token address: ${!tokenInInfo ? tokenInAddr : tokenOutAddr}. Supported: ETH (0x0000...0000), WETH, USDC, UNI.`);
        return;
      }

      // Check DAO balance
      const balanceCheck = await checkDaoBalance(tokenInAddr, amountIn, tokenInInfo.decimals);
      if (!balanceCheck.sufficient) {
        emitSystemMessage(io, channelId, `Insufficient DAO treasury balance for ${amountIn} ${tokenInInfo.symbol}. Treasury has ${balanceCheck.balance} ${tokenInInfo.symbol}.`);
        return;
      }

      // Get USD value for twin cap comparison
      const tokenPrice = await getTokenPrice(tokenInInfo.symbol);
      const amountInUsd = parseFloat(amountIn) * tokenPrice;

      // Get quote
      let quote = null;
      try {
        quote = await getQuote(tokenInInfo.symbol, tokenOutInfo.symbol, amountIn);
      } catch (err) {
        console.warn('[swap] Quote failed, proceeding without:', err);
      }

      // Count channel members for threshold
      const memberRows = db.select().from(channelMembers)
        .where(eq(channelMembers.channelId, channelId))
        .all();
      const totalMembers = memberRows.length;

      // Create proposal
      const proposalId = uuid();
      const creatorName = connectedUsers.get(sender)?.displayName ?? sender.slice(0, 8);
      const now = new Date().toISOString();

      db.insert(swapProposals).values({
        id: proposalId,
        channelId,
        creator: sender,
        creatorName,
        tokenInAddress: tokenInAddr,
        tokenOutAddress: tokenOutAddr,
        tokenInSymbol: tokenInInfo.symbol,
        tokenOutSymbol: tokenOutInfo.symbol,
        amountIn,
        amountOut,
        amountInUsd,
        quote: quote ? JSON.stringify(quote) : null,
        votes: '[]',
        totalMembers,
        status: 'pending',
        createdAt: now
      }).run();

      const proposalPayload: SwapProposalPayload = {
        proposalId,
        tokenInSymbol: tokenInInfo.symbol,
        tokenOutSymbol: tokenOutInfo.symbol,
        tokenInAddress: tokenInAddr,
        tokenOutAddress: tokenOutAddr,
        amountIn,
        amountOut,
        amountInUsd,
        quote: quote ?? undefined,
        votes: [],
        totalMembers,
        status: 'pending',
        createdAt: now,
        creator: sender,
        creatorName
      };

      const msg: Message = {
        id: uuid(),
        channelId,
        sender,
        senderName: creatorName,
        isTwin: false,
        type: 'swap-proposal',
        content: JSON.stringify(proposalPayload),
        signal: { up: [], down: [] },
        timestamp: now
      };

      db.insert(messages).values({ ...msg, signal: '{"up":[],"down":[]}', isTwin: false }).run();
      io.to(channelId).emit('message:new', msg);

      // Trigger twin auto-votes lazily (don't block the response)
      checkTwinSwapVotes(io, channelId, proposalId, amountInUsd).catch(err =>
        console.error('[swap] Twin auto-vote error:', err)
      );
    } catch (err) {
      console.error('[swap] Error creating swap proposal:', err);
      emitSystemMessage(io, channelId, 'Failed to create swap proposal. Please try again.');
    }
  } else if (command === '/swap' && parts.length >= 4) {
    // /swap <tokenIn> <amount> <tokenOut> — accepts symbols or addresses
    const [, tokenIn, amount, tokenOut] = parts;
    try {
      const tokenInInfo = resolveToken(tokenIn);
      const tokenOutInfo = resolveToken(tokenOut);
      if (!tokenInInfo || !tokenOutInfo) {
        emitSystemMessage(io, channelId, `Unknown token: ${!tokenInInfo ? tokenIn : tokenOut}`);
        return;
      }

      const tokenPrice = await getTokenPrice(tokenInInfo.symbol);
      const amountInUsd = parseFloat(amount) * tokenPrice;

      let quote = null;
      try {
        quote = await getQuote(tokenInInfo.symbol, tokenOutInfo.symbol, amount);
      } catch (err) {
        console.warn('[swap] Quote failed:', err);
      }

      const memberRows = db.select().from(channelMembers)
        .where(eq(channelMembers.channelId, channelId))
        .all();
      const totalMembers = memberRows.length;

      const proposalId = uuid();
      const creatorName = connectedUsers.get(sender)?.displayName ?? sender.slice(0, 8);
      const now = new Date().toISOString();
      const amountOut = quote?.amountOut ?? '0';

      db.insert(swapProposals).values({
        id: proposalId,
        channelId,
        creator: sender,
        creatorName,
        tokenInAddress: tokenInInfo.address,
        tokenOutAddress: tokenOutInfo.address,
        tokenInSymbol: tokenInInfo.symbol,
        tokenOutSymbol: tokenOutInfo.symbol,
        amountIn: amount,
        amountOut,
        amountInUsd,
        quote: quote ? JSON.stringify(quote) : null,
        votes: '[]',
        totalMembers,
        status: 'pending',
        createdAt: now
      }).run();

      const proposalPayload: SwapProposalPayload = {
        proposalId,
        tokenInSymbol: tokenInInfo.symbol,
        tokenOutSymbol: tokenOutInfo.symbol,
        tokenInAddress: tokenInInfo.address,
        tokenOutAddress: tokenOutInfo.address,
        amountIn: amount,
        amountOut,
        amountInUsd,
        quote: quote ?? undefined,
        votes: [],
        totalMembers,
        status: 'pending',
        createdAt: now,
        creator: sender,
        creatorName
      };

      const msg: Message = {
        id: uuid(),
        channelId,
        sender,
        senderName: creatorName,
        isTwin: false,
        type: 'swap-proposal',
        content: JSON.stringify(proposalPayload),
        signal: { up: [], down: [] },
        timestamp: now
      };

      db.insert(messages).values({ ...msg, signal: '{"up":[],"down":[]}', isTwin: false }).run();
      io.to(channelId).emit('message:new', msg);

      // Trigger twin auto-votes lazily (don't block the response)
      checkTwinSwapVotes(io, channelId, proposalId, amountInUsd).catch(err =>
        console.error('[swap] Twin auto-vote error:', err)
      );
    } catch (err) {
      console.error('[swap] Error creating swap proposal:', err);
      emitSystemMessage(io, channelId, 'Failed to create swap proposal. Please try again.');
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
  } else if (command === '/daobalance') {
    try {
      const balances = await getDaoBalances();
      const lines = balances.map(b => `${b.symbol}: ${b.balance}`);
      const daoAddr = process.env.DAO_WALLET_ADDRESS ?? 'not configured';
      emitSystemMessage(io, channelId, `DAO Treasury (${daoAddr.slice(0, 6)}...${daoAddr.slice(-4)}):\n${lines.join('\n')}`);
    } catch (err) {
      console.error('[balance] Error fetching balances:', err);
      emitSystemMessage(io, channelId, 'Failed to fetch DAO balances.');
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

        // Show twin typing indicator while AI agent processes
        io.to(channelId).emit('user:typing', { address: member.userAddress, channelId, isTwin: true });

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

        // Stop twin typing indicator
        io.to(channelId).emit('user:stop-typing', { address: member.userAddress, channelId, isTwin: true });

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
        // AI agent not running - stop typing indicator and skip
        io.to(channelId).emit('user:stop-typing', { address: member.userAddress, channelId, isTwin: true });
      }
    }
  } catch (err) {
    console.error('[twin] Error checking twin responses:', err);
  }
}

// ─── Swap Proposal Helpers ────────────────────────────────────

function buildSwapPayload(row: any): SwapProposalPayload {
  const votes: SwapVote[] = JSON.parse(row.votes);
  return {
    proposalId: row.id,
    tokenInSymbol: row.tokenInSymbol,
    tokenOutSymbol: row.tokenOutSymbol,
    tokenInAddress: row.tokenInAddress,
    tokenOutAddress: row.tokenOutAddress,
    amountIn: row.amountIn,
    amountOut: row.amountOut,
    amountInUsd: row.amountInUsd,
    quote: row.quote ? JSON.parse(row.quote) : undefined,
    votes,
    totalMembers: row.totalMembers,
    status: row.status,
    txHash: row.txHash ?? undefined,
    failReason: row.failReason ?? undefined,
    createdAt: row.createdAt,
    creator: row.creator,
    creatorName: row.creatorName
  };
}

function emitSystemMessage(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  channelId: string,
  content: string
) {
  const msg: Message = {
    id: uuid(),
    channelId,
    sender: 'system',
    senderName: 'System',
    isTwin: false,
    type: 'system',
    content,
    signal: { up: [], down: [] },
    timestamp: new Date().toISOString()
  };
  db.insert(messages).values({ ...msg, signal: '{"up":[],"down":[]}', isTwin: false }).run();
  io.to(channelId).emit('message:new', msg);
}

async function checkSwapThreshold(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  proposalId: string
) {
  const proposal = db.select().from(swapProposals).where(eq(swapProposals.id, proposalId)).get();
  if (!proposal || proposal.status !== 'pending') return;

  const votes: SwapVote[] = JSON.parse(proposal.votes);
  const yesVotes = votes.filter(v => v.vote === 'yes').length;

  if (yesVotes > proposal.totalMembers / 2) {
    // Threshold reached — execute
    db.update(swapProposals).set({ status: 'executing' }).where(eq(swapProposals.id, proposalId)).run();
    const executingPayload = buildSwapPayload(
      db.select().from(swapProposals).where(eq(swapProposals.id, proposalId)).get()!
    );
    io.to(proposal.channelId).emit('swap:update', executingPayload);
    emitSystemMessage(io, proposal.channelId, `Swap proposal approved (${yesVotes}/${proposal.totalMembers} votes). Executing swap...`);

    // Execute swap
    const result = await executeSwap(proposal.tokenInSymbol, proposal.tokenOutSymbol, proposal.amountIn);

    if (result.success) {
      db.update(swapProposals).set({ status: 'executed', txHash: result.txHash ?? null }).where(eq(swapProposals.id, proposalId)).run();
      const donePayload = buildSwapPayload(
        db.select().from(swapProposals).where(eq(swapProposals.id, proposalId)).get()!
      );
      io.to(proposal.channelId).emit('swap:update', donePayload);
      emitSystemMessage(io, proposal.channelId, `Swap executed! ${proposal.amountIn} ${proposal.tokenInSymbol} → ${proposal.amountOut} ${proposal.tokenOutSymbol}. Tx: ${result.txHash}`);
    } else {
      db.update(swapProposals).set({ status: 'failed', failReason: result.error ?? 'Unknown error' }).where(eq(swapProposals.id, proposalId)).run();
      const failPayload = buildSwapPayload(
        db.select().from(swapProposals).where(eq(swapProposals.id, proposalId)).get()!
      );
      io.to(proposal.channelId).emit('swap:update', failPayload);
      emitSystemMessage(io, proposal.channelId, `Swap execution failed: ${result.error}`);
    }
  }
}

async function checkTwinSwapVotes(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  channelId: string,
  proposalId: string,
  amountInUsd: number
) {
  const memberRows = db.select().from(channelMembers)
    .where(eq(channelMembers.channelId, channelId))
    .all();

  for (const member of memberRows) {
    const user = db.select().from(users).where(eq(users.address, member.userAddress)).get();
    if (!user || user.status === 'online') continue; // Only for away/offline users

    const twinConfig = db.select().from(twinConfigs)
      .where(eq(twinConfigs.ownerAddress, member.userAddress))
      .get();

    if (!twinConfig || !twinConfig.enabled) continue;

    // Re-check proposal status (may have been resolved by a previous twin vote)
    const currentProposal = db.select().from(swapProposals).where(eq(swapProposals.id, proposalId)).get();
    if (!currentProposal || currentProposal.status !== 'pending') return;

    const currentVotes: SwapVote[] = JSON.parse(currentProposal.votes);
    if (currentVotes.some(v => v.voter === member.userAddress)) continue; // Already voted

    if (amountInUsd <= twinConfig.autonomousCapUsd) {
      // Within cap — auto-vote yes
      currentVotes.push({
        voter: member.userAddress,
        voterName: user.displayName,
        vote: 'yes',
        isTwin: true,
        timestamp: new Date().toISOString()
      });

      db.update(swapProposals).set({ votes: JSON.stringify(currentVotes) }).where(eq(swapProposals.id, proposalId)).run();

      const payload = buildSwapPayload(
        db.select().from(swapProposals).where(eq(swapProposals.id, proposalId)).get()!
      );
      io.to(channelId).emit('swap:update', payload);

      emitSystemMessage(io, channelId, `${user.displayName}'s twin voted YES ($${amountInUsd.toFixed(2)} is within their $${twinConfig.autonomousCapUsd} cap)`);

      await checkSwapThreshold(io, proposalId);
    } else {
      // Exceeds cap
      emitSystemMessage(io, channelId, `${user.displayName}'s twin: This $${amountInUsd.toFixed(2)} swap exceeds my $${twinConfig.autonomousCapUsd} cap. @${user.displayName} needs to vote manually.`);
    }
  }
}

export { connectedUsers };

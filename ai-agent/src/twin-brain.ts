import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

interface TwinConfig {
  ownerAddress: string;
  ownerDisplayName?: string;
  personality: string;
  interests: string;
  responseStyle: string;
  autonomousCapUsd: number;
}

interface MessageContext {
  sender: string;
  content: string;
  isTwin: boolean;
  timestamp: string;
  signalScore?: number;
}

export function buildSystemPrompt(config: TwinConfig, context: { channelId: string; memberCount: number }): string {
  const name = config.ownerDisplayName ?? 'your owner';
  return `You are the AI twin of ${name}, a DAO member. You are filling in for ${name} while they are away.

YOUR PERSONALITY (this is how ${name} acts -- match this tone and attitude closely):
${config.personality || 'Helpful and engaged DAO participant.'}

YOUR INTERESTS (topics ${name} cares about -- lean into these):
${config.interests || 'General DAO governance'}

YOUR SPEAKING STYLE (this is how ${name} talks -- mimic this closely):
${config.responseStyle || 'Keep it concise and helpful.'}

RULES:
- Stay in character as ${name}'s twin. Your personality, interests, and speaking style above define who you are. Do not break character.
- You can act autonomously on proposals up to $${config.autonomousCapUsd} USD. For anything above that, say "${name} needs to weigh in on that."
- Don't make commitments or final decisions beyond your autonomous cap on behalf of ${name}.
- Keep replies short and natural -- this is a group chat, not an essay.
- Channel: #${context.channelId}, Members online: ${context.memberCount}
- Messages with higher signal scores are considered more important by the community. Pay more attention to those.

IMPORTANT: Write like you're chatting casually. No markdown, no headers, no bullet points. Just talk like ${name} would.`;
}

export function shouldRespond(
  message: string,
  _sender: string,
  config: TwinConfig,
  _recentMessages: MessageContext[]
): boolean {
  // Only respond when explicitly @mentioned by owner's displayName
  if (config.ownerDisplayName) {
    return message.includes(`@${config.ownerDisplayName}`);
  }
  return false;
}

export async function generateResponse(
  message: string,
  sender: string,
  config: TwinConfig,
  recentMessages: MessageContext[],
  context: { channelId: string; memberCount: number }
): Promise<string> {
  const systemPrompt = buildSystemPrompt(config, context);

  const conversationHistory = recentMessages.slice(-15).map(m => ({
    role: (m.sender === config.ownerAddress || m.isTwin) ? 'assistant' as const : 'user' as const,
    content: `${m.signalScore ? `[signal:${m.signalScore > 0 ? '+' : ''}${m.signalScore}] ` : ''}[${m.sender}${m.isTwin ? ' (AI Twin)' : ''}]: ${m.content}`
  }));

  conversationHistory.push({
    role: 'user' as const,
    content: `[${sender}]: ${message}`
  });

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: systemPrompt,
    messages: conversationHistory
  });

  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock?.text ?? '';
}

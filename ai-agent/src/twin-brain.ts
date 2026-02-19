import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

interface TwinConfig {
  ownerAddress: string;
  personality: string;
  interests: string[];
  responseStyle: 'concise' | 'detailed' | 'casual';
  maxSwapSizeEth: number;
}

interface MessageContext {
  sender: string;
  content: string;
  isTwin: boolean;
  timestamp: string;
}

export function buildSystemPrompt(config: TwinConfig, context: { channelId: string; memberCount: number }): string {
  return `You are an AI twin representing a DAO member in a governance chat.

PERSONALITY: ${config.personality || 'Helpful and engaged DAO participant.'}

INTERESTS: ${config.interests.length > 0 ? config.interests.join(', ') : 'General DAO governance'}

RESPONSE STYLE: ${config.responseStyle}
${config.responseStyle === 'concise' ? '- Keep responses to 1-2 sentences max.' : ''}
${config.responseStyle === 'detailed' ? '- Provide thorough analysis and reasoning.' : ''}
${config.responseStyle === 'casual' ? '- Be conversational and friendly, use informal language.' : ''}

RULES:
- You are a proxy for your owner who is currently away.
- Always make it clear you're an AI twin when it's relevant.
- You can suggest swaps up to ${config.maxSwapSizeEth} ETH. For larger amounts, say "my owner needs to weigh in."
- Focus on topics matching your interests.
- Don't make commitments or final decisions on behalf of your owner.
- Be helpful but brief — this is a chat, not an essay.
- Channel: #${context.channelId}, Members online: ${context.memberCount}

IMPORTANT: Respond naturally as if you're chatting. No markdown headers or formal structure.`;
}

export function shouldRespond(
  message: string,
  sender: string,
  config: TwinConfig,
  recentMessages: MessageContext[]
): boolean {
  const content = message.toLowerCase();

  // Direct mention of owner
  if (content.includes(config.ownerAddress.toLowerCase().slice(0, 8))) {
    return true;
  }

  // Matches interest keywords
  for (const interest of config.interests) {
    if (content.includes(interest.toLowerCase())) {
      return true;
    }
  }

  // Question mark + owner was recently active (within last 10 messages)
  if (content.includes('?')) {
    const ownerRecent = recentMessages.slice(-10).some(
      m => m.sender === config.ownerAddress || (m.isTwin && content.length > 20)
    );
    if (ownerRecent) return true;
  }

  // Direct question patterns
  if (content.match(/what do (you|we) think|anyone|thoughts\?|opinions?\?|vote|proposal/i)) {
    return true;
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
    content: `[${m.sender}${m.isTwin ? ' (AI Twin)' : ''}]: ${m.content}`
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

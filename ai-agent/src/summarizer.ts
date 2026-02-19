import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface MessageForSummary {
  sender: string;
  content: string;
  isTwin: boolean;
  timestamp: string;
  type?: string;
}

export async function summarizeConversation(
  messages: MessageForSummary[],
  userInterests: string[],
  channelId: string
): Promise<{
  summary: string;
  keyTopics: string[];
  actionItems: string[];
  mentionedTokens: string[];
  messageCount: number;
  timeRange: { from: string; to: string };
}> {
  const conversationText = messages
    .map(m => `[${m.timestamp}] ${m.sender}${m.isTwin ? ' (AI Twin)' : ''}: ${m.content}`)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: `You summarize DAO chat conversations. The user's interests are: ${userInterests.join(', ') || 'general governance'}. Focus on what's relevant to them. Return ONLY valid JSON with this structure:
{
  "summary": "2-3 sentence summary",
  "keyTopics": ["topic1", "topic2"],
  "actionItems": ["action1", "action2"],
  "mentionedTokens": ["ETH", "UNI"]
}`,
    messages: [{
      role: 'user',
      content: `Summarize this conversation from #${channelId}:\n\n${conversationText}`
    }]
  });

  const textBlock = response.content.find(b => b.type === 'text');
  const text = textBlock?.text ?? '{}';

  try {
    const parsed = JSON.parse(text);
    return {
      summary: parsed.summary ?? 'No summary available.',
      keyTopics: parsed.keyTopics ?? [],
      actionItems: parsed.actionItems ?? [],
      mentionedTokens: parsed.mentionedTokens ?? [],
      messageCount: messages.length,
      timeRange: {
        from: messages[0]?.timestamp ?? '',
        to: messages[messages.length - 1]?.timestamp ?? ''
      }
    };
  } catch {
    return {
      summary: text.slice(0, 200),
      keyTopics: [],
      actionItems: [],
      mentionedTokens: [],
      messageCount: messages.length,
      timeRange: {
        from: messages[0]?.timestamp ?? '',
        to: messages[messages.length - 1]?.timestamp ?? ''
      }
    };
  }
}

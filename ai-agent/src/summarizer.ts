import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

interface MessageForSummary {
  sender: string;
  content: string;
  isTwin: boolean;
  timestamp: string;
  type?: string;
}

interface PreviousContext {
  summary: string;
  keyTopics: string[];
  actionItems: string[];
  mentionedTokens: string[];
  messageCount: number;
}

export async function summarizeConversation(
  messages: MessageForSummary[],
  userInterests: string | string[],
  channelId: string,
  previousContext: PreviousContext | null = null
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

  const interests = Array.isArray(userInterests) ? userInterests.join(', ') : userInterests || 'general governance';

  let systemPrompt: string;
  if (previousContext) {
    systemPrompt = `You summarize DAO chat conversations with rolling context. The user's interests are: ${interests}. Focus on what's relevant to them.

You have a PREVIOUS summary of this channel that covered ${previousContext.messageCount} messages:
- Previous summary: ${previousContext.summary}
- Previous key topics: ${previousContext.keyTopics.join(', ')}
- Previous action items: ${previousContext.actionItems.join(', ')}
- Previously mentioned tokens: ${previousContext.mentionedTokens.join(', ')}

Now incorporate the NEW messages below into an updated, consolidated summary. Merge topics, update action items (remove completed ones, add new ones), and combine token mentions. Return ONLY valid JSON with this structure:
{
  "summary": "2-3 sentence consolidated summary covering both previous context and new messages",
  "keyTopics": ["topic1", "topic2"],
  "actionItems": ["action1", "action2"],
  "mentionedTokens": ["ETH", "UNI"]
}`;
  } else {
    systemPrompt = `You summarize DAO chat conversations. The user's interests are: ${interests}. Focus on what's relevant to them. Return ONLY valid JSON with this structure:
{
  "summary": "2-3 sentence summary",
  "keyTopics": ["topic1", "topic2"],
  "actionItems": ["action1", "action2"],
  "mentionedTokens": ["ETH", "UNI"]
}`;
  }

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: systemPrompt,
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

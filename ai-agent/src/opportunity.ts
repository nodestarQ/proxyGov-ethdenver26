import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface MessageForAnalysis {
  sender: string;
  content: string;
  timestamp: string;
}

export interface Opportunity {
  type: 'defi' | 'governance' | 'alpha';
  title: string;
  description: string;
  relevance: string;
  urgency: 'low' | 'medium' | 'high';
  relatedTokens: string[];
}

export async function analyzeForOpportunities(
  messages: MessageForAnalysis[],
  userInterests: string[]
): Promise<Opportunity[]> {
  const conversationText = messages
    .map(m => `[${m.sender}]: ${m.content}`)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: `You analyze DAO chat messages for opportunities relevant to a member with these interests: ${userInterests.join(', ') || 'DeFi, governance'}.

Look for:
- DeFi opportunities (swaps, yield, liquidity)
- Governance proposals needing votes
- Alpha/insider knowledge being shared

Return ONLY a valid JSON array (or empty array []) with this structure:
[{
  "type": "defi" | "governance" | "alpha",
  "title": "short title",
  "description": "what's the opportunity",
  "relevance": "why it matters to this user",
  "urgency": "low" | "medium" | "high",
  "relatedTokens": ["ETH"]
}]`,
    messages: [{
      role: 'user',
      content: `Analyze these messages for opportunities:\n\n${conversationText}`
    }]
  });

  const textBlock = response.content.find(b => b.type === 'text');
  const text = textBlock?.text ?? '[]';

  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

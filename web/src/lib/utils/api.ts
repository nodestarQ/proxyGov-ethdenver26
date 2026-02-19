import { BACKEND_URL } from './constants.js';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Messages
  getMessages: (channelId: string) =>
    request<any[]>(`/messages?channelId=${channelId}`),

  // Twin
  getTwinConfig: (address: string) =>
    request<any>(`/twin/${address}`),
  updateTwinConfig: (address: string, config: any) =>
    request<any>(`/twin/${address}`, { method: 'PUT', body: JSON.stringify(config) }),

  // Uniswap
  getQuote: (tokenIn: string, tokenOut: string, amount: string) =>
    request<any>('/uniswap/quote', {
      method: 'POST',
      body: JSON.stringify({ tokenIn, tokenOut, amount })
    }),
  getTokens: () =>
    request<any[]>('/uniswap/tokens'),

  // Polls
  createPoll: (channelId: string, question: string, options: string[]) =>
    request<any>('/poll', {
      method: 'POST',
      body: JSON.stringify({ channelId, question, options })
    }),
  votePoll: (pollId: string, optionId: string) =>
    request<any>(`/poll/${pollId}/vote`, {
      method: 'PUT',
      body: JSON.stringify({ optionId })
    })
};

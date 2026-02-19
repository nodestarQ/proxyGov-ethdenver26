export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatEth(value: string | number, decimals = 4): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toFixed(decimals);
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function generateDisplayName(address: string): string {
  const hash = address.toLowerCase().slice(2, 10);
  const adjectives = ['Swift', 'Bold', 'Wise', 'Iron', 'Neon', 'Void', 'Flux', 'Grid'];
  const nouns = ['Voter', 'Whale', 'Degen', 'Signer', 'Holder', 'Agent', 'Node', 'Proxy'];
  const adjIdx = parseInt(hash.slice(0, 4), 16) % adjectives.length;
  const nounIdx = parseInt(hash.slice(4, 8), 16) % nouns.length;
  return `${adjectives[adjIdx]}${nouns[nounIdx]}`;
}

export const SEPOLIA_CHAIN_ID = 11155111;
export const MAINNET_CHAIN_ID = 1;

export const SEPOLIA_CONFIG = {
  chainId: SEPOLIA_CHAIN_ID,
  name: 'Sepolia',
  rpcUrl: 'https://rpc.sepolia.org',
  blockExplorer: 'https://sepolia.etherscan.io'
} as const;

export const TOKENS: Record<string, { address: string; symbol: string; name: string; decimals: number }> = {
  ETH: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18
  },
  WETH: {
    address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18
  },
  USDC: {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6
  },
  UNI: {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18
  }
};

export const DEFAULT_CHANNELS = [
  { id: 'general', name: 'general', description: 'General DAO discussion' },
  { id: 'proposals', name: 'proposals', description: 'Governance proposals and votes' },
  { id: 'alpha', name: 'alpha', description: 'Shitcoining and alpha plays' }
];

export const BACKEND_URL = import.meta.env.DEV ? '' : '';
export const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3002' : '';

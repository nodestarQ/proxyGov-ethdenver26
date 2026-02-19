import { createPublicClient, createWalletClient, custom, http, type Address } from 'viem';
import { sepolia } from 'viem/chains';

interface WalletState {
  address: Address | null;
  connected: boolean;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
}

let state = $state<WalletState>({
  address: null,
  connected: false,
  chainId: null,
  connecting: false,
  error: null
});

export const wallet = {
  get address() { return state.address; },
  get connected() { return state.connected; },
  get chainId() { return state.chainId; },
  get connecting() { return state.connecting; },
  get error() { return state.error; },

  async connect() {
    if (typeof window === 'undefined' || !window.ethereum) {
      state.error = 'MetaMask not detected';
      return;
    }

    state.connecting = true;
    state.error = null;

    try {
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum)
      });

      const [address] = await walletClient.requestAddresses();

      // Switch to Sepolia if needed
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }] // 11155111 in hex
        });
      } catch (switchError: any) {
        // Chain not added — add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              rpcUrls: ['https://rpc.sepolia.org'],
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
        }
      }

      state.address = address;
      state.connected = true;
      state.chainId = sepolia.id;

      // Listen for account/chain changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          wallet.disconnect();
        } else {
          state.address = accounts[0] as Address;
        }
      });

      window.ethereum.on('chainChanged', (chainId: string) => {
        state.chainId = parseInt(chainId, 16);
      });
    } catch (err: any) {
      state.error = err.message || 'Failed to connect wallet';
    } finally {
      state.connecting = false;
    }
  },

  disconnect() {
    state.address = null;
    state.connected = false;
    state.chainId = null;
    state.error = null;
  }
};

// Type augmentation for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

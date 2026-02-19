import { createPublicClient, createWalletClient, custom, http, type Address } from 'viem';
import { sepolia } from 'viem/chains';

interface WalletState {
  address: Address | null;
  connected: boolean;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  signature: string | null;
  siweMessage: string | null;
}

let state = $state<WalletState>({
  address: null,
  connected: false,
  chainId: null,
  connecting: false,
  error: null,
  signature: null,
  siweMessage: null
});

export const wallet = {
  get address() { return state.address; },
  get connected() { return state.connected; },
  get chainId() { return state.chainId; },
  get connecting() { return state.connecting; },
  get error() { return state.error; },
  get signature() { return state.signature; },
  get siweMessage() { return state.siweMessage; },

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

      // Sign-In with Ethereum (SIWE)
      const siweMessage = [
        `${window.location.host} wants you to sign in with your Ethereum account:`,
        address,
        '',
        'Sign in to proxyGov DAO Twin Chat',
        '',
        `URI: ${window.location.origin}`,
        'Version: 1',
        `Chain ID: ${sepolia.id}`,
        `Issued At: ${new Date().toISOString()}`
      ].join('\n');

      const signature = await walletClient.signMessage({ account: address, message: siweMessage });

      state.address = address;
      state.signature = signature;
      state.siweMessage = siweMessage;
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
    state.signature = null;
    state.siweMessage = null;
  }
};

// Type augmentation for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

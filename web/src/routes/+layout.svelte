<script lang="ts">
  import '../app.css';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { chat } from '$lib/stores/chat.svelte';
  import { twin } from '$lib/stores/twin.svelte';
  import { connectSocket, disconnectSocket } from '$lib/utils/socket-client';
  import { onMount } from 'svelte';
  import WalletConnect from '$lib/components/WalletConnect.svelte';
  import ChatSidebar from '$lib/components/ChatSidebar.svelte';

  let { children } = $props();

  let currentPath = $state('/');

  onMount(() => {
    currentPath = window.location.pathname;
  });

  // Connect socket when wallet connects
  $effect(() => {
    if (wallet.connected && wallet.address) {
      const socket = connectSocket(wallet.address);
      socket.on('connect', () => {
        socket.emit('user:authenticate', {
          address: wallet.address!,
          signature: wallet.signature!,
          message: wallet.siweMessage!
        });
        socket.emit('channel:join', chat.activeChannel);
      });
      chat.bindSocket();
      twin.bindSocket();
      twin.load(wallet.address);
    }
  });

  function navigateTo(path: string) {
    currentPath = path;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
</script>

{#if !wallet.connected}
  <!-- Landing / Connect -->
  <div class="min-h-screen flex items-center justify-center bg-bg">
    <div class="text-center space-y-6 w-full px-4 md:w-1/2 md:px-0">
      <div class="crt-border rounded-lg p-8 bg-bg-surface crt-glow">
        <h1 class="text-4xl font-bold text-text-primary tracking-tight mb-1">proxyGov</h1>
        <p class="text-text-secondary text-sm mb-6">Governance, without timezones</p>
        <WalletConnect />
      </div>
      <p class="text-xs text-text-muted">Connect your wallet on Sepolia to enter</p>
    </div>
  </div>
{:else}
  <!-- App Shell -->
  <div class="min-h-screen flex bg-bg">
    <ChatSidebar onNavigateTwin={() => navigateTo('/twin')} />
    <main class="flex-1 flex flex-col h-screen">
      <!-- Top Bar -->
      <header class="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-surface">
        <nav class="flex gap-1">
          <button
            onclick={() => navigateTo('/chat/general')}
            class="px-3 py-1 rounded-md text-sm transition-colors
                   {currentPath.startsWith('/chat') || currentPath === '/'
                     ? 'bg-accent/10 text-accent'
                     : 'text-text-secondary hover:text-text-primary'}"
          >
            Chat
          </button>
          <button
            onclick={() => navigateTo('/twin')}
            class="px-3 py-1 rounded-md text-sm transition-colors
                   {currentPath === '/twin'
                     ? 'bg-twin/10 text-twin'
                     : 'text-text-secondary hover:text-text-primary'}"
          >
            Twin
          </button>
        </nav>
        <WalletConnect />
      </header>
      <!-- Page Content -->
      <div class="flex-1 overflow-hidden">
        {@render children()}
      </div>
    </main>
  </div>
{/if}

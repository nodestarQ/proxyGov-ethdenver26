<script lang="ts">
  import '../app.css';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { chat } from '$lib/stores/chat.svelte';
  import { twin } from '$lib/stores/twin.svelte';
  import { connectSocket, disconnectSocket } from '$lib/utils/socket-client';
  import { onMount } from 'svelte';
  import WalletConnect from '$lib/components/WalletConnect.svelte';
  import ChannelList from '$lib/components/ChannelList.svelte';
  import ChatWindow from '$lib/components/ChatWindow.svelte';
  import TwinConfigPanel from '$lib/components/TwinConfigPanel.svelte';

  type Screen = 'channels' | 'chat' | 'twin';
  let currentScreen = $state<Screen>('channels');

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

  function openChannel(channelId: string) {
    chat.setActiveChannel(channelId);
    currentScreen = 'chat';
  }

  function openTwin() {
    currentScreen = 'twin';
  }

  function goBack() {
    currentScreen = 'channels';
  }
</script>

<div class="min-h-dvh bg-bg-elevated/50">
  <div class="phone-frame bg-bg flex flex-col">
    {#if !wallet.connected}
      <!-- Landing / Connect -->
      <div class="flex-1 flex items-center justify-center px-6">
        <div class="text-center space-y-6 w-full">
          <div class="crt-border rounded-lg p-8 bg-bg-surface crt-glow">
            <h1 class="text-4xl font-bold text-text-primary tracking-tight mb-1">proxyGov</h1>
            <p class="text-text-secondary text-sm mb-6">Governance, without timezones</p>
            <WalletConnect />
          </div>
          <p class="text-xs text-text-muted">Connect your wallet on Sepolia to enter</p>
        </div>
      </div>
    {:else if currentScreen === 'channels'}
      <ChannelList
        onSelectChannel={openChannel}
        onOpenTwin={openTwin}
      />
    {:else if currentScreen === 'chat'}
      <ChatWindow onBack={goBack} />
    {:else if currentScreen === 'twin'}
      <TwinConfigPanel onBack={goBack} />
    {/if}
  </div>
</div>

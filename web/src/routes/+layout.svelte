<script lang="ts">
  import '../app.css';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { chat } from '$lib/stores/chat.svelte';
  import { twin } from '$lib/stores/twin.svelte';
  import { profile } from '$lib/stores/profile.svelte';
  import { connectSocket, disconnectSocket } from '$lib/utils/socket-client';
  import { api } from '$lib/utils/api';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import WalletConnect from '$lib/components/WalletConnect.svelte';
  import SetupAccount from '$lib/components/SetupAccount.svelte';
  import ChannelList from '$lib/components/ChannelList.svelte';
  import ChatWindow from '$lib/components/ChatWindow.svelte';
  import TwinConfigPanel from '$lib/components/TwinConfigPanel.svelte';
  import Settings from '$lib/components/Settings.svelte';

  type Screen = 'loading' | 'setup' | 'channels' | 'chat' | 'twin' | 'settings';
  let currentScreen = $state<Screen>('loading');
  let direction = $state<1 | -1>(1);

  // Check profile + connect socket when wallet connects
  $effect(() => {
    if (wallet.connected && wallet.address) {
      checkProfile(wallet.address);
    }
  });

  async function checkProfile(address: string) {
    currentScreen = 'loading';
    try {
      const user = await api.getUser(address);
      if (user.exists && user.profileSetup) {
        profile.set(user.displayName!, user.avatarUrl!);
        enterApp(address);
      } else {
        currentScreen = 'setup';
      }
    } catch {
      currentScreen = 'setup';
    }
  }

  function enterApp(address: string) {
    const socket = connectSocket(address);
    socket.on('connect', () => {
      socket.emit('user:authenticate', {
        address: wallet.address!,
        signature: wallet.signature!,
        message: wallet.siweMessage!
      });
      for (const channel of chat.channels) {
        socket.emit('channel:join', channel.id);
      }
    });
    chat.bindSocket();
    twin.bindSocket();
    twin.load(address);
    currentScreen = 'channels';
  }

  function onSetupComplete(displayName: string, avatarUrl: string) {
    profile.set(displayName, avatarUrl);
    direction = 1;
    enterApp(wallet.address!);
  }

  function openChannel(channelId: string) {
    chat.setActiveChannel(channelId);
    chat.setViewingChat(true);
    direction = 1;
    currentScreen = 'chat';
  }

  function openTwin() {
    chat.setViewingChat(false);
    direction = 1;
    currentScreen = 'twin';
  }

  function openSettings() {
    chat.setViewingChat(false);
    direction = 1;
    currentScreen = 'settings';
  }

  function goBack() {
    chat.setViewingChat(false);
    direction = -1;
    currentScreen = 'channels';
  }
</script>

<div class="min-h-dvh bg-bg-elevated/50">
  <div class="phone-frame bg-bg flex flex-col">
    {#if !wallet.connected}
      <div class="flex-1 flex items-center justify-center px-6" in:fade={{ duration: 200 }}>
        <div class="text-center space-y-6 w-full">
          <div class="crt-border rounded-lg p-8 bg-bg-surface crt-glow">
            <h1 class="text-4xl font-bold text-text-primary tracking-tight mb-1">proxyGov</h1>
            <p class="text-text-secondary text-sm mb-6">Governance, without timezones</p>
            <WalletConnect />
          </div>
          <p class="text-xs text-text-muted">Connect your wallet on Sepolia to enter</p>
        </div>
      </div>
    {:else if currentScreen === 'loading'}
      <div class="flex-1 flex items-center justify-center" in:fade={{ duration: 150 }}>
        <p class="text-sm text-text-muted">Loading...</p>
      </div>
    {:else if currentScreen === 'setup'}
      <div class="absolute inset-0 flex flex-col" in:fade={{ duration: 200 }}>
        <SetupAccount onComplete={onSetupComplete} />
      </div>
    {:else}
      {#key currentScreen}
        <div
          class="absolute inset-0 flex flex-col"
          in:fly={{ x: direction * 80, duration: 200, delay: 80 }}
          out:fly={{ x: direction * -80, duration: 150 }}
        >
          {#if currentScreen === 'channels'}
            <ChannelList
              onSelectChannel={openChannel}
              onOpenTwin={openTwin}
              onOpenSettings={openSettings}
            />
          {:else if currentScreen === 'chat'}
            <ChatWindow onBack={goBack} />
          {:else if currentScreen === 'twin'}
            <TwinConfigPanel onBack={goBack} />
          {:else if currentScreen === 'settings'}
            <Settings onBack={goBack} />
          {/if}
        </div>
      {/key}
    {/if}
  </div>
</div>

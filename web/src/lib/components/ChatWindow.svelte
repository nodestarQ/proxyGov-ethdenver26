<script lang="ts">
  import { chat } from '$lib/stores/chat.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { twin } from '$lib/stores/twin.svelte';
  import { tick } from 'svelte';
  import { api } from '$lib/utils/api';
  import MessageBubble from './MessageBubble.svelte';
  import MessageInput from './MessageInput.svelte';

  interface Props {
    onBack: () => void;
  }
  let { onBack }: Props = $props();

  let messagesContainer: HTMLDivElement;
  let summarizing = $state(false);

  async function scrollToBottom() {
    await tick();
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Load messages when channel changes
  $effect(() => {
    const channel = chat.activeChannel;
    if (channel && wallet.connected) {
      api.getMessages(channel).then(messages => {
        chat.loadMessages(messages);
      }).catch(() => {});
    }
  });

  // Auto-scroll on new messages
  $effect(() => {
    chat.messages;
    scrollToBottom();
  });

  async function catchMeUp() {
    if (!wallet.address) return;
    summarizing = true;
    try {
      const summary = await api.summarize(
        chat.activeChannel,
        wallet.address,
        twin.config?.interests ?? []
      );
      chat.sendMessage(JSON.stringify({
        ...summary,
        channelId: chat.activeChannel
      }), 'summary');
    } catch (err) {
      console.error('Summarize failed:', err);
    } finally {
      summarizing = false;
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header with back button -->
  <header class="flex items-center gap-3 px-2 py-2.5 border-b border-border bg-bg-surface">
    <button
      onclick={onBack}
      class="p-1.5 -ml-0.5 rounded-md hover:bg-bg-hover transition-colors"
    >
      <svg class="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <div class="flex-1 min-w-0">
      <h2 class="text-sm font-semibold text-text-primary truncate">
        <span class="text-text-muted">#</span> {chat.activeChannel}
      </h2>
      <p class="text-[11px] text-text-muted truncate">
        {chat.members.length} online
      </p>
    </div>
    <button
      onclick={catchMeUp}
      disabled={summarizing || chat.messages.length === 0}
      class="px-2.5 py-1 text-[11px] font-medium border border-twin/40 text-twin rounded-full
             hover:bg-twin/10 transition-colors whitespace-nowrap
             disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {summarizing ? 'Summarizing...' : 'Catch up'}
    </button>
  </header>

  <!-- Messages -->
  <div bind:this={messagesContainer} class="flex-1 overflow-y-auto">
    {#if chat.messages.length === 0}
      <div class="flex items-center justify-center h-full text-text-muted text-sm">
        <div class="text-center px-6">
          <p class="text-2xl mb-2">_</p>
          <p>No messages yet in #{chat.activeChannel}</p>
          <p class="text-xs mt-1">Start the conversation</p>
        </div>
      </div>
    {:else}
      <div class="py-1">
        {#each chat.messages as message (message.id)}
          <MessageBubble {message} />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Input -->
  <MessageInput />
</div>

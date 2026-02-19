<script lang="ts">
  import { chat } from '$lib/stores/chat.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { twin } from '$lib/stores/twin.svelte';
  import { tick } from 'svelte';
  import { api } from '$lib/utils/api';
  import MessageBubble from './MessageBubble.svelte';
  import MessageInput from './MessageInput.svelte';

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
      }).catch(() => {
        // Backend may not be running yet
      });
    }
  });

  // Auto-scroll on new messages
  $effect(() => {
    chat.messages; // track
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
      // Post the summary as a local message
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
  <!-- Channel Header -->
  <div class="border-b border-border bg-bg-surface px-4 py-3 flex items-center justify-between">
    <div>
      <h2 class="text-sm font-medium text-text-primary">
        <span class="text-text-muted">#</span> {chat.activeChannel}
      </h2>
      <p class="text-xs text-text-muted">
        {chat.channels.find(c => c.id === chat.activeChannel)?.description ?? ''}
      </p>
    </div>
    <div class="flex items-center gap-3">
      <button
        onclick={catchMeUp}
        disabled={summarizing || chat.messages.length === 0}
        class="px-3 py-1 text-xs border border-twin/40 text-twin rounded-md
               hover:bg-twin/10 transition-colors
               disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {summarizing ? 'Summarizing...' : 'Catch me up'}
      </button>
      <span class="text-xs text-text-muted">{chat.members.length} online</span>
    </div>
  </div>

  <!-- Messages -->
  <div bind:this={messagesContainer} class="flex-1 overflow-y-auto">
    {#if chat.messages.length === 0}
      <div class="flex items-center justify-center h-full text-text-muted text-sm">
        <div class="text-center">
          <p class="text-accent text-glow text-2xl mb-2">_</p>
          <p>No messages yet in #{chat.activeChannel}</p>
          <p class="text-xs mt-1">Start the conversation</p>
        </div>
      </div>
    {:else}
      <div class="py-2">
        {#each chat.messages as message (message.id)}
          <MessageBubble {message} />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Input -->
  <MessageInput />
</div>

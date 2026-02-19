<script lang="ts">
  import { chat } from '$lib/stores/chat.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { onMount, tick } from 'svelte';
  import { api } from '$lib/utils/api';
  import MessageBubble from './MessageBubble.svelte';
  import MessageInput from './MessageInput.svelte';

  let messagesContainer: HTMLDivElement;

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
    <div class="flex items-center gap-2 text-xs text-text-muted">
      <span>{chat.members.length} online</span>
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

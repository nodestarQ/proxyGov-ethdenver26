<script lang="ts">
  import { chat } from '$lib/stores/chat.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { tick } from 'svelte';
  import { api } from '$lib/utils/api';
  import MessageBubble from './MessageBubble.svelte';
  import MessageInput from './MessageInput.svelte';

  interface Props {
    onBack: () => void;
  }
  let { onBack }: Props = $props();

  let messagesContainer: HTMLDivElement;

  const typingEntries = $derived.by(() => {
    const entries = (chat.typingUsers[chat.activeChannel] ?? [])
      .filter(t => t.address !== wallet.address);
    return entries.map(t => ({
      name: chat.members.find(m => m.address === t.address)?.displayName ?? t.address.slice(0, 6),
      isTwin: t.isTwin
    }));
  });

  const hasTwinTyping = $derived(typingEntries.some(e => e.isTwin));

  const typingText = $derived.by(() => {
    if (typingEntries.length === 0) return '';
    const labels = typingEntries.map(e => e.isTwin ? `${e.name}'s twin` : e.name);
    if (labels.length === 1) return `${labels[0]} is typing`;
    if (labels.length === 2) return `${labels[0]} and ${labels[1]} are typing`;
    return `${labels[0]}, ${labels[1]} and ${labels.length - 2} others are typing`;
  });

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

  // Auto-scroll on new messages (only when count changes, not on signal updates)
  let prevMessageCount = $state(0);
  $effect(() => {
    const count = chat.messages.length;
    if (count !== prevMessageCount) {
      prevMessageCount = count;
      scrollToBottom();
    }
  });
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
        {chat.members.filter(m => m.status === 'online').length} online
      </p>
    </div>
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
        {#each chat.messages as message, i (message.id)}
          {@const prev = chat.messages[i - 1]}
          {@const next = chat.messages[i + 1]}
          {@const isFirstInGroup = !prev || prev.sender !== message.sender || prev.type === 'system'}
          {@const isLastInGroup = !next || next.sender !== message.sender || next.type === 'system'}
          <MessageBubble {message} {isFirstInGroup} {isLastInGroup} />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Typing indicator -->
  {#if typingText}
    <div class="px-4 py-1 text-xs flex items-center gap-1.5" class:text-twin={hasTwinTyping} class:text-text-muted={!hasTwinTyping}>
      <span class="flex gap-0.5">
        <span class="w-1 h-1 rounded-full animate-bounce" class:bg-twin={hasTwinTyping} class:bg-text-muted={!hasTwinTyping} style="animation-delay: 0ms"></span>
        <span class="w-1 h-1 rounded-full animate-bounce" class:bg-twin={hasTwinTyping} class:bg-text-muted={!hasTwinTyping} style="animation-delay: 150ms"></span>
        <span class="w-1 h-1 rounded-full animate-bounce" class:bg-twin={hasTwinTyping} class:bg-text-muted={!hasTwinTyping} style="animation-delay: 300ms"></span>
      </span>
      {#if hasTwinTyping}
        <span class="inline-flex items-center gap-1">
          <span class="px-1 py-0.5 text-[9px] font-bold bg-twin/20 text-twin rounded">TWIN</span>
          <span>{typingText}</span>
        </span>
      {:else}
        <span>{typingText}</span>
      {/if}
    </div>
  {/if}

  <!-- Input -->
  <MessageInput />
</div>

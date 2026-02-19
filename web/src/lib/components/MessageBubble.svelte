<script lang="ts">
  import type { Message } from '../../../../shared/types';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { chat } from '$lib/stores/chat.svelte';
  import { truncateAddress, formatTimestamp } from '$lib/utils/format';
  import { REACTION_EMOJIS } from '$lib/utils/constants';
  import SwapProposalCard from './SwapProposalCard.svelte';
  import PollCard from './PollCard.svelte';
  import SummaryCard from './SummaryCard.svelte';
  import OpportunityAlert from './OpportunityAlert.svelte';

  interface Props {
    message: Message;
  }
  let { message }: Props = $props();

  let showReactions = $state(false);

  const isOwn = $derived(message.sender === wallet.address);
</script>

<div
  class="group flex flex-col gap-1 px-4 py-2 hover:bg-bg-hover/50 transition-colors
         {message.isTwin ? 'border-l-2 border-twin/50' : ''}"
  onmouseenter={() => showReactions = true}
  onmouseleave={() => showReactions = false}
>
  <!-- Header -->
  <div class="flex items-center gap-2">
    <span class="font-medium text-sm {message.isTwin ? 'text-twin' : isOwn ? 'text-accent' : 'text-text-primary'}">
      {message.senderName}
    </span>
    {#if message.isTwin}
      <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-twin/20 text-twin border border-twin/40">TWIN</span>
    {/if}
    <span class="text-xs text-text-muted font-mono">{truncateAddress(message.sender)}</span>
    <span class="text-xs text-text-muted">{formatTimestamp(message.timestamp)}</span>
  </div>

  <!-- Content -->
  <div class="text-sm text-text-primary">
    {#if message.type === 'swap-proposal'}
      <SwapProposalCard payload={JSON.parse(message.content)} />
    {:else if message.type === 'poll'}
      <PollCard payload={JSON.parse(message.content)} />
    {:else if message.type === 'summary'}
      <SummaryCard payload={JSON.parse(message.content)} />
    {:else if message.type === 'opportunity'}
      <OpportunityAlert payload={JSON.parse(message.content)} />
    {:else if message.type === 'system'}
      <p class="text-text-muted italic">{message.content}</p>
    {:else}
      <p class="whitespace-pre-wrap break-words">{message.content}</p>
    {/if}
  </div>

  <!-- Reactions -->
  <div class="flex items-center gap-1 mt-0.5">
    {#each Object.entries(message.reactions) as [emoji, addresses]}
      {#if addresses.length > 0}
        <button
          onclick={() => chat.addReaction(message.id, emoji)}
          class="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors
                 {addresses.includes(wallet.address ?? '')
                   ? 'border-accent/40 bg-accent/10 text-accent'
                   : 'border-border bg-bg-hover text-text-secondary hover:border-accent/30'}"
        >
          <span>{emoji}</span>
          <span class="font-mono">{addresses.length}</span>
        </button>
      {/if}
    {/each}

    <!-- Add reaction -->
    {#if showReactions}
      <div class="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {#each REACTION_EMOJIS as emoji}
          <button
            onclick={() => chat.addReaction(message.id, emoji)}
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-bg-hover text-sm"
          >
            {emoji}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

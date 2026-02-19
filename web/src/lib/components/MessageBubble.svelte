<script lang="ts">
  import type { Message } from '../../../../shared/types';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { chat } from '$lib/stores/chat.svelte';
  import { formatTimestamp } from '$lib/utils/format';
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

{#if message.type === 'system'}
  <div class="px-4 py-1.5">
    <p class="text-xs text-text-muted italic text-center">{message.content}</p>
  </div>
{:else}
  <div
    class="px-3 py-1 {isOwn ? '' : ''}"
    onpointerdown={() => showReactions = !showReactions}
  >
    <!-- Bubble -->
    <div class="max-w-[85%] {isOwn ? 'ml-auto' : ''}">
      <!-- Sender name (not for own messages) -->
      {#if !isOwn}
        <div class="flex items-center gap-1.5 mb-0.5 px-1">
          <span class="text-xs font-medium {message.isTwin ? 'text-twin' : 'text-text-secondary'}">
            {message.senderName}
          </span>
          {#if message.isTwin}
            <span class="text-[9px] px-1 py-px rounded bg-twin/20 text-twin font-medium">TWIN</span>
          {/if}
        </div>
      {/if}

      <div class="rounded-xl px-3 py-2
                  {isOwn
                    ? 'bg-text-primary text-bg rounded-br-sm'
                    : message.isTwin
                      ? 'bg-twin/10 border border-twin/20 text-text-primary rounded-bl-sm'
                      : 'bg-bg-surface border border-border/40 text-text-primary rounded-bl-sm'}">
        <!-- Content -->
        <div class="text-[13px] leading-snug">
          {#if message.type === 'swap-proposal'}
            <SwapProposalCard payload={JSON.parse(message.content)} />
          {:else if message.type === 'poll'}
            <PollCard payload={JSON.parse(message.content)} />
          {:else if message.type === 'summary'}
            <SummaryCard payload={JSON.parse(message.content)} />
          {:else if message.type === 'opportunity'}
            <OpportunityAlert payload={JSON.parse(message.content)} />
          {:else}
            <p class="whitespace-pre-wrap break-words">{message.content}</p>
          {/if}
        </div>

        <!-- Timestamp -->
        <p class="text-[10px] mt-1 {isOwn ? 'text-bg/60' : 'text-text-muted'} text-right">
          {formatTimestamp(message.timestamp)}
        </p>
      </div>

      <!-- Reactions -->
      {#if Object.entries(message.reactions).some(([, a]) => a.length > 0) || showReactions}
        <div class="flex items-center gap-1 mt-1 px-1 flex-wrap">
          {#each Object.entries(message.reactions) as [emoji, addresses]}
            {#if addresses.length > 0}
              <button
                onclick={() => chat.addReaction(message.id, emoji)}
                class="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors
                       {addresses.includes(wallet.address ?? '')
                         ? 'border-text-primary/30 bg-text-primary/10'
                         : 'border-border bg-bg-surface hover:border-text-muted'}"
              >
                <span>{emoji}</span>
                <span class="font-mono text-[10px]">{addresses.length}</span>
              </button>
            {/if}
          {/each}

          {#if showReactions}
            <div class="flex items-center gap-0.5 ml-0.5">
              {#each REACTION_EMOJIS as emoji}
                <button
                  onclick={() => chat.addReaction(message.id, emoji)}
                  class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-bg-hover text-xs"
                >
                  {emoji}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

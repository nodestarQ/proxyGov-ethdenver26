<script lang="ts">
  import type { Message } from '../../../../shared/types';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { chat } from '$lib/stores/chat.svelte';
  import { formatTimestamp } from '$lib/utils/format';
  import SwapProposalCard from './SwapProposalCard.svelte';
  import PollCard from './PollCard.svelte';
  import SummaryCard from './SummaryCard.svelte';
  import OpportunityAlert from './OpportunityAlert.svelte';

  interface Props {
    message: Message;
  }
  let { message }: Props = $props();

  const isOwn = $derived(message.sender === wallet.address);

  const signalScore = $derived(message.signal.up.length - message.signal.down.length);
  const userVote = $derived(
    message.signal.up.includes(wallet.address ?? '') ? 'up'
    : message.signal.down.includes(wallet.address ?? '') ? 'down'
    : null
  );

  const signalClasses = $derived(
    signalScore >= 2 ? 'font-medium ring-2 ring-green-500/30 shadow-sm shadow-green-500/10'
    : signalScore >= 1 ? 'ring-1 ring-green-500/20'
    : signalScore <= -2 ? 'opacity-40'
    : signalScore <= -1 ? 'opacity-60'
    : ''
  );

  type Segment = { text: string; isMention: boolean };

  const contentSegments = $derived.by((): Segment[] => {
    if (message.type !== 'text') return [{ text: message.content, isMention: false }];

    const memberNames = new Set(chat.members.map(m => m.displayName));
    const segments: Segment[] = [];
    // Match @word patterns
    const regex = /@(\S+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(message.content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: message.content.slice(lastIndex, match.index), isMention: false });
      }
      const name = match[1];
      if (memberNames.has(name)) {
        segments.push({ text: `@${name}`, isMention: true });
      } else {
        segments.push({ text: match[0], isMention: false });
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < message.content.length) {
      segments.push({ text: message.content.slice(lastIndex), isMention: false });
    }

    return segments.length > 0 ? segments : [{ text: message.content, isMention: false }];
  });
</script>

{#if message.type === 'system'}
  <div class="px-4 py-1.5">
    <p class="text-xs text-text-muted italic text-center">{message.content}</p>
  </div>
{:else}
  <div class="px-3 py-1" style="max-width: 85%{isOwn ? '; margin-left: auto' : ''}">
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

    <!-- Bubble + signal row -->
    <div class="flex items-stretch gap-1 {isOwn ? 'flex-row-reverse' : ''}">
      <!-- Bubble -->
      <div class="min-w-0 rounded-xl px-3 py-2 {signalClasses}
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
            <p class="whitespace-pre-wrap break-words">{#each contentSegments as seg}{#if seg.isMention}<span class="font-semibold {isOwn ? 'text-bg/80' : 'text-twin'}">{seg.text}</span>{:else}{seg.text}{/if}{/each}</p>
          {/if}
        </div>

        <!-- Timestamp -->
        <p class="text-[10px] mt-1 {isOwn ? 'text-bg/60' : 'text-text-muted'} text-right">
          {formatTimestamp(message.timestamp)}
        </p>
      </div>

      <!-- Signal voting pill -->
      <div class="shrink-0 w-8 rounded-xl flex flex-col items-stretch
                  {isOwn
                    ? 'bg-text-primary text-bg'
                    : message.isTwin
                      ? 'bg-twin/10 border border-twin/20 text-text-primary'
                      : 'bg-bg-surface border border-border/40 text-text-primary'}">
        <button
          onclick={() => chat.addSignal(message.id, 'up')}
          class="flex-1 flex items-center justify-center rounded-t-lg transition-colors
                 {userVote === 'up'
                   ? isOwn ? 'text-green-300 bg-green-400/20' : 'text-green-600 bg-green-500/15'
                   : isOwn ? 'text-bg/40 hover:text-green-300 hover:bg-green-400/15' : 'text-text-muted/50 hover:text-green-600 hover:bg-green-500/10'}"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4l4 5H4l4-5z"/>
          </svg>
        </button>
        <div class="h-px mx-1 {isOwn ? 'bg-bg/15' : message.isTwin ? 'bg-twin/15' : 'bg-border/30'}"></div>
        <button
          onclick={() => chat.addSignal(message.id, 'down')}
          class="flex-1 flex items-center justify-center rounded-b-lg transition-colors
                 {userVote === 'down'
                   ? isOwn ? 'text-red-400 bg-red-400/20' : 'text-red-500 bg-red-500/15'
                   : isOwn ? 'text-bg/40 hover:text-red-400 hover:bg-red-400/15' : 'text-text-muted/50 hover:text-red-500 hover:bg-red-500/10'}"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 12l4-5H4l4 5z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}

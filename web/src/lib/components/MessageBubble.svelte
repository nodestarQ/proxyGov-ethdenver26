<script lang="ts">
  import type { Message } from '../../../../shared/types';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { chat } from '$lib/stores/chat.svelte';
  import { formatTimestamp } from '$lib/utils/format';
  import SwapProposalCard from './SwapProposalCard.svelte';
  import SwapVoteCard from './SwapVoteCard.svelte';
  import PollCard from './PollCard.svelte';
  import SummaryCard from './SummaryCard.svelte';
  import OpportunityAlert from './OpportunityAlert.svelte';
  import PriceCard from './PriceCard.svelte';
  import DaoBalanceCard from './DaoBalanceCard.svelte';

  interface Props {
    message: Message;
    isFirstInGroup?: boolean;
    isLastInGroup?: boolean;
  }
  let { message, isFirstInGroup = true, isLastInGroup = true }: Props = $props();

  const isOwn = $derived(message.sender === wallet.address);

  const signalScore = $derived(message.signal.up.length - message.signal.down.length);
  const userVote = $derived(
    message.signal.up.includes(wallet.address ?? '') ? 'up'
    : message.signal.down.includes(wallet.address ?? '') ? 'down'
    : null
  );

  const signalClasses = $derived(
    signalScore >= 2 ? 'font-medium border-2 border-text-primary'
    : signalScore >= 1 ? 'border-2 border-text-primary/50'
    : signalScore <= -2 ? 'opacity-40'
    : signalScore <= -1 ? 'opacity-60'
    : ''
  );

  const senderMember = $derived(chat.members.find(m => m.address === message.sender));
  const senderAvatarUrl = $derived(senderMember?.avatarUrl);
  const senderInitials = $derived(
    message.senderName
      ? message.senderName.slice(0, 2).toUpperCase()
      : '??'
  );

  const groupedBubbleRounding = $derived(
    isOwn
      ? isFirstInGroup && !isLastInGroup ? 'rounded-br-[4px]'
        : !isFirstInGroup && !isLastInGroup ? 'rounded-br-[4px]'
        : !isFirstInGroup && isLastInGroup ? 'rounded-br-[4px]'
        : '' // solo
      : 'rounded-bl-[4px]'
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
{:else if message.type === 'swap-proposal'}
  <SwapVoteCard payload={JSON.parse(message.content)} />
{:else if message.type === 'price'}
  <PriceCard payload={JSON.parse(message.content)} />
{:else if message.type === 'dao-balance'}
  <DaoBalanceCard payload={JSON.parse(message.content)} />
{:else}
  <div class="{!isFirstInGroup ? 'pt-0.5' : 'pt-4'} px-3 pb-0" style="max-width: 85%{isOwn ? '; margin-left: auto' : ''}">
    {#if !isOwn}
      <!-- Avatar + bubble wrapper for others' messages -->
      <div class="flex items-end gap-1.5">
        <!-- Avatar column -->
        <div class="shrink-0 w-7 flex items-end">
          {#if isLastInGroup}
            <div class="w-7 h-7 rounded-xs overflow-hidden bg-bg-elevated border border-border flex items-center justify-center">
              {#if senderAvatarUrl}
                <img src={senderAvatarUrl} alt={message.senderName} class="w-full h-full object-cover" />
              {:else}
                <span class="text-[10px] font-semibold text-text-secondary">{senderInitials}</span>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Name + bubble -->
        <div class="min-w-0 flex-1">
          {#if isFirstInGroup}
            <div class="flex items-center gap-1.5 mb-0.5 px-1">
              <span class="text-xs {message.isTwin ? 'font-bold text-text-primary' : 'font-medium text-text-secondary'}">
                {message.senderName}
              </span>
              {#if message.isTwin}
                <span class="text-[9px] px-1 py-px rounded-xs bg-text-primary text-bg font-bold">TWIN</span>
              {/if}
            </div>
          {/if}

          <!-- Bubble + signal row -->
          <div class="flex items-stretch gap-1">
            <!-- Bubble -->
            <div class="min-w-0 rounded-[18px] px-3 py-2 {signalClasses} {groupedBubbleRounding}
                        {message.isTwin
                          ? 'bg-transparent border border-dashed border-border/40 text-text-primary'
                          : 'bg-bg-surface border border-border/40 text-text-primary'}">
              <div class="text-[13px] leading-snug">
                {#if message.type === 'poll'}
                  <PollCard payload={JSON.parse(message.content)} />
                {:else if message.type === 'summary'}
                  <SummaryCard payload={JSON.parse(message.content)} />
                {:else if message.type === 'opportunity'}
                  <OpportunityAlert payload={JSON.parse(message.content)} />
                {:else}
                  <p class="whitespace-pre-wrap break-words">{#each contentSegments as seg}{#if seg.isMention}<span class="font-semibold text-twin">{seg.text}</span>{:else}{seg.text}{/if}{/each}</p>
                {/if}
              </div>
              <p class="text-[10px] mt-1 text-text-muted text-right">
                {formatTimestamp(message.timestamp)}
              </p>
            </div>

            <!-- Signal voting pill -->
            <div class="shrink-0 w-8 rounded-[18px] flex flex-col items-stretch
                        {message.isTwin
                          ? 'bg-transparent border border-dashed border-border/40 text-text-primary'
                          : 'bg-bg-surface border border-border/40 text-text-primary'}">
              <button
                onclick={() => chat.addSignal(message.id, 'up')}
                class="flex-1 flex items-center justify-center rounded-t-[18px] transition-colors
                       {userVote === 'up'
                         ? 'text-green-600 bg-green-500/15'
                         : 'text-text-muted/50 hover:text-green-600 hover:bg-green-500/10'}"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 4l4 5H4l4-5z"/>
                </svg>
              </button>
              <div class="h-px mx-1 bg-border/30"></div>
              <button
                onclick={() => chat.addSignal(message.id, 'down')}
                class="flex-1 flex items-center justify-center rounded-b-[18px] transition-colors
                       {userVote === 'down'
                         ? 'text-red-500 bg-red-500/15'
                         : 'text-text-muted/50 hover:text-red-500 hover:bg-red-500/10'}"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 12l4-5H4l4 5z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <!-- Own messages (no avatar, no signal pill) -->
      <div class="flex flex-col items-end">
        {#if message.isTwin && isFirstInGroup}
          <div class="flex items-center gap-1.5 mb-0.5 px-1">
            <span class="text-[9px] px-1 py-px rounded-xs bg-text-primary text-bg font-bold">TWIN</span>
          </div>
        {/if}
        <div class="min-w-0 rounded-[18px] px-3 py-2 {signalClasses} {groupedBubbleRounding}
                    {message.isTwin
                      ? 'bg-transparent border border-dashed border-border/40 text-text-primary'
                      : 'bg-text-primary text-bg'}">
          <div class="text-[13px] leading-snug">
            {#if message.type === 'poll'}
              <PollCard payload={JSON.parse(message.content)} />
            {:else if message.type === 'summary'}
              <SummaryCard payload={JSON.parse(message.content)} />
            {:else if message.type === 'opportunity'}
              <OpportunityAlert payload={JSON.parse(message.content)} />
            {:else}
              <p class="whitespace-pre-wrap break-words">{#each contentSegments as seg}{#if seg.isMention}<span class="font-semibold {message.isTwin ? 'text-twin' : 'text-bg/80'}">{seg.text}</span>{:else}{seg.text}{/if}{/each}</p>
            {/if}
          </div>
          <p class="text-[10px] mt-1 {message.isTwin ? 'text-text-muted' : 'text-bg/60'} text-right">
            {formatTimestamp(message.timestamp)}
          </p>
        </div>
      </div>
    {/if}
  </div>
{/if}

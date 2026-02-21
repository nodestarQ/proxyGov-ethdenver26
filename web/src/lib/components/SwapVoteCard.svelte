<script lang="ts">
  import type { SwapProposalPayload } from '../../../../shared/types';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { chat } from '$lib/stores/chat.svelte';

  interface Props {
    payload: SwapProposalPayload;
  }
  let { payload }: Props = $props();

  const yesVotes = $derived(payload.votes.filter(v => v.vote === 'yes').length);
  const noVotes = $derived(payload.votes.filter(v => v.vote === 'no').length);
  const needed = $derived(Math.floor(payload.totalMembers / 2) + 1);
  const progressPct = $derived(payload.totalMembers > 0 ? (yesVotes / payload.totalMembers) * 100 : 0);

  const hasVoted = $derived(
    payload.votes.some(v => v.voter === wallet.address)
  );
  const canVote = $derived(payload.status === 'pending' && !hasVoted);

  const statusColor = $derived(
    payload.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    : payload.status === 'executing' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    : payload.status === 'executed' ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : payload.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  );

  const statusLabel = $derived(payload.status.toUpperCase());

  const etherscanBase = 'https://sepolia.etherscan.io';
</script>

<div class="w-full flex justify-center px-3 py-1.5">
  <div class="crt-border rounded-xl p-4 bg-bg-elevated w-full max-w-sm">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/30 font-semibold tracking-wider">SWAP PROPOSAL</span>
        <span class="text-[10px] px-2 py-0.5 rounded-full border font-medium {statusColor}">{statusLabel}</span>
      </div>
    </div>

    <!-- Creator -->
    <p class="text-[11px] text-text-muted mb-2">Proposed by <span class="font-medium text-text-secondary">{payload.creatorName}</span></p>

    <!-- Swap details -->
    <div class="flex items-center gap-2 mb-1">
      <span class="font-mono font-bold text-base text-text-primary">{payload.amountIn}</span>
      <span class="text-accent font-semibold">{payload.tokenInSymbol}</span>
      <svg class="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14m-4-4l4 4-4 4"/>
      </svg>
      <span class="font-mono font-bold text-base text-text-primary">{payload.amountOut}</span>
      <span class="text-accent font-semibold">{payload.tokenOutSymbol}</span>
    </div>

    <!-- USD value -->
    <p class="text-xs text-text-muted mb-3">~${payload.amountInUsd.toFixed(2)} USD</p>

    <!-- Quote details -->
    {#if payload.quote}
      <div class="space-y-1 text-[11px] text-text-secondary mb-3 border-t border-border/30 pt-2">
        <div class="flex justify-between">
          <span>Price impact</span>
          <span class="font-mono">{payload.quote.priceImpact}%</span>
        </div>
        <div class="flex justify-between">
          <span>Gas estimate</span>
          <span class="font-mono">{payload.quote.gasEstimate}</span>
        </div>
        <div class="flex justify-between">
          <span>Route</span>
          <span class="font-mono text-text-muted">{payload.quote.route}</span>
        </div>
      </div>
    {/if}

    <!-- Vote progress -->
    <div class="mb-3">
      <div class="flex justify-between text-[11px] text-text-secondary mb-1">
        <span>{yesVotes} Yes / {noVotes} No</span>
        <span>Need {needed} of {payload.totalMembers}</span>
      </div>
      <div class="w-full h-2 rounded-full bg-bg-surface border border-border/30 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500 {payload.status === 'executed' ? 'bg-green-500' : 'bg-green-500/70'}"
          style="width: {progressPct}%"
        ></div>
      </div>
    </div>

    <!-- Vote buttons -->
    {#if canVote}
      <div class="flex gap-2 mb-3">
        <button
          onclick={() => chat.voteOnSwap(payload.proposalId, 'yes')}
          class="flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                 bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 active:bg-green-500/30"
        >
          Vote Yes
        </button>
        <button
          onclick={() => chat.voteOnSwap(payload.proposalId, 'no')}
          class="flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 active:bg-red-500/30"
        >
          Vote No
        </button>
      </div>
    {:else if hasVoted && payload.status === 'pending'}
      <p class="text-[11px] text-text-muted italic text-center mb-3">You have voted</p>
    {/if}

    <!-- Voter list -->
    {#if payload.votes.length > 0}
      <div class="border-t border-border/30 pt-2 space-y-1">
        {#each payload.votes as v}
          <div class="flex items-center gap-2 text-[11px]">
            <span class="w-2 h-2 rounded-full {v.vote === 'yes' ? 'bg-green-500' : 'bg-red-500'}"></span>
            <span class="text-text-secondary">{v.voterName}</span>
            {#if v.isTwin}
              <span class="text-[9px] px-1 py-px rounded bg-twin/20 text-twin font-medium">TWIN</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Tx hash -->
    {#if payload.txHash && payload.status === 'executed'}
      <div class="mt-2 pt-2 border-t border-border/30">
        <a
          href="{etherscanBase}/tx/{payload.txHash}"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[11px] text-accent hover:underline font-mono break-all"
        >
          View on Etherscan: {payload.txHash.slice(0, 10)}...{payload.txHash.slice(-8)}
        </a>
      </div>
    {/if}

    <!-- Fail reason -->
    {#if payload.failReason && payload.status === 'failed'}
      <div class="mt-2 pt-2 border-t border-border/30">
        <p class="text-[11px] text-red-400">{payload.failReason}</p>
      </div>
    {/if}
  </div>
</div>

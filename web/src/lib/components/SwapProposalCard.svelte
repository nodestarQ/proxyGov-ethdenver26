<script lang="ts">
  import type { SwapProposalPayload } from '../../../../shared/types';

  interface Props {
    payload: SwapProposalPayload;
  }
  let { payload }: Props = $props();
</script>

<div class="crt-border rounded-md p-3 bg-bg-elevated max-w-sm">
  <div class="flex items-center gap-2 mb-2">
    <span class="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/30">SWAP</span>
    <span class="text-xs text-text-muted">Uniswap Quote</span>
  </div>

  <div class="flex items-center gap-2 text-sm">
    <span class="font-mono font-bold text-text-primary">{payload.amountIn}</span>
    <span class="text-accent font-medium">{payload.tokenInSymbol}</span>
    <span class="text-text-muted">→</span>
    <span class="font-mono font-bold text-text-primary">{payload.amountOut}</span>
    <span class="text-accent font-medium">{payload.tokenOutSymbol}</span>
  </div>

  {#if payload.quote}
    <div class="mt-2 space-y-1 text-xs text-text-secondary">
      <div class="flex justify-between">
        <span>Expected output</span>
        <span class="font-mono">{payload.quote.amountOut} {payload.tokenOutSymbol}</span>
      </div>
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
  {:else}
    <p class="mt-2 text-xs text-text-muted italic">Fetching quote...</p>
  {/if}
</div>

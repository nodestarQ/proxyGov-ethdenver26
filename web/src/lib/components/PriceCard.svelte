<script lang="ts">
  interface Props {
    payload: {
      symbol: string;
      price: number;
      address: string;
      timestamp: string;
    };
  }
  let { payload }: Props = $props();

  const formattedPrice = $derived(
    payload.price >= 1
      ? `$${payload.price.toFixed(2)}`
      : `$${payload.price.toFixed(6)}`
  );

  const truncatedAddress = $derived(
    payload.address
      ? `${payload.address.slice(0, 6)}...${payload.address.slice(-4)}`
      : ''
  );

  const time = $derived(
    new Date(payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
</script>

<div class="w-full flex justify-center px-3 py-1.5">
  <div class="crt-border rounded-xs p-4 bg-bg-elevated w-full max-w-sm">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[10px] px-2 py-0.5 rounded-xs bg-text-primary text-bg font-bold tracking-wider">PRICE</span>
      <span class="text-[10px] text-text-muted">{time}</span>
    </div>

    <div class="flex items-baseline gap-2 mb-1">
      <span class="text-xl font-bold text-text-primary">{payload.symbol}</span>
      <span class="text-xl font-mono font-bold text-text-primary">{formattedPrice}</span>
    </div>

    {#if truncatedAddress}
      <p class="text-[11px] text-text-muted font-mono">{truncatedAddress}</p>
    {/if}
  </div>
</div>

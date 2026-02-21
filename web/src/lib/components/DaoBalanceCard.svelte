<script lang="ts">
  interface Props {
    payload: {
      address: string;
      balances: { symbol: string; balance: string }[];
      timestamp: string;
    };
  }
  let { payload }: Props = $props();

  const truncatedAddress = $derived(
    payload.address
      ? `${payload.address.slice(0, 6)}...${payload.address.slice(-4)}`
      : ''
  );

  const time = $derived(
    new Date(payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  function formatBalance(bal: string): string {
    const num = parseFloat(bal);
    if (isNaN(num)) return '0';
    if (num === 0) return '0';
    if (num >= 1) return num.toFixed(4);
    return num.toFixed(6);
  }
</script>

<div class="w-full flex justify-center px-3 py-1.5">
  <div class="crt-border rounded-xs p-4 bg-bg-elevated w-full max-w-sm">
    <div class="flex items-center justify-between mb-3">
      <span class="text-[10px] px-2 py-0.5 rounded-xs bg-text-primary text-bg font-bold tracking-wider">DAO TREASURY</span>
      <span class="text-[10px] text-text-muted">{time}</span>
    </div>

    {#if truncatedAddress}
      <p class="text-[11px] text-text-muted font-mono mb-3">{truncatedAddress}</p>
    {/if}

    <div class="space-y-2">
      {#each payload.balances as item}
        <div class="flex items-center justify-between">
          <span class="text-sm font-bold text-text-primary">{item.symbol}</span>
          <span class="text-sm font-mono text-text-primary">{formatBalance(item.balance)}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

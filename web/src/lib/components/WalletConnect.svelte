<script lang="ts">
  import { wallet } from '$lib/stores/wallet.svelte';
  import { truncateAddress } from '$lib/utils/format';
</script>

{#if wallet.connected}
  <button
    onclick={() => wallet.disconnect()}
    class="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md
           hover:bg-bg-hover transition-colors font-mono text-sm text-text-primary"
  >
    <span class="w-2 h-2 rounded-full bg-text-primary animate-pulse"></span>
    {truncateAddress(wallet.address!)}
  </button>
{:else}
  <button
    onclick={() => wallet.connect()}
    disabled={wallet.connecting}
    class="px-4 py-2 border border-border text-text-primary rounded-md font-medium
           hover:bg-bg-hover transition-colors
           disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {#if wallet.connecting}
      connecting...
    {:else}
      Connect Wallet
    {/if}
  </button>
{/if}

{#if wallet.error}
  <p class="text-danger text-xs mt-1">{wallet.error}</p>
{/if}

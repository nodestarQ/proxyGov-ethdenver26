<script lang="ts">
  import { wallet } from '$lib/stores/wallet.svelte';
  import { truncateAddress } from '$lib/utils/format';
</script>

{#if wallet.connected}
  <button
    onclick={() => wallet.disconnect()}
    class="flex items-center gap-1.5 px-2.5 py-1 border border-border rounded-full
           hover:bg-bg-hover transition-colors text-xs text-text-primary"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-text-primary"></span>
    <span class="font-mono">{truncateAddress(wallet.address!)}</span>
  </button>
{:else}
  <button
    onclick={() => wallet.connect()}
    disabled={wallet.connecting}
    class="px-4 py-2 border border-border text-text-primary rounded-full font-medium text-sm
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

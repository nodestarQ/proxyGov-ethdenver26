<script lang="ts">
  import { chat } from '$lib/stores/chat.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { twin } from '$lib/stores/twin.svelte';
  import { truncateAddress } from '$lib/utils/format';
  import TwinStatusBadge from './TwinStatusBadge.svelte';

  interface Props {
    onNavigateTwin?: () => void;
  }
  let { onNavigateTwin }: Props = $props();
</script>

<aside class="w-60 border-r border-border bg-bg-surface flex flex-col h-full">
  <!-- Logo -->
  <div class="p-4 border-b border-border">
    <h1 class="text-lg font-bold text-accent text-glow tracking-tight">proxyGov</h1>
    <p class="text-xs text-text-muted mt-0.5">DAO Twin Chat</p>
  </div>

  <!-- Channels -->
  <div class="flex-1 overflow-y-auto p-3">
    <p class="text-xs text-text-muted uppercase tracking-wider mb-2 px-1">Channels</p>
    {#each chat.channels as channel}
      <button
        onclick={() => chat.setActiveChannel(channel.id)}
        class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors mb-0.5
               {chat.activeChannel === channel.id
                 ? 'bg-accent/10 text-accent border border-accent/30'
                 : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}"
      >
        <span class="text-text-muted mr-1">#</span>{channel.name}
      </button>
    {/each}
  </div>

  <!-- Members -->
  <div class="border-t border-border p-3">
    <p class="text-xs text-text-muted uppercase tracking-wider mb-2 px-1">
      Online - {chat.members.length}
    </p>
    <div class="space-y-1 max-h-32 overflow-y-auto">
      {#each chat.members as member}
        <div class="flex items-center gap-2 px-1 py-0.5 text-xs">
          <span class="w-1.5 h-1.5 rounded-full {member.status === 'online' ? 'bg-accent' : member.status === 'away' ? 'bg-warning' : 'bg-text-muted'}"></span>
          <span class="text-text-secondary font-mono truncate">{truncateAddress(member.address)}</span>
          {#if member.twinEnabled}
            <TwinStatusBadge small />
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Twin Toggle -->
  <div class="border-t border-border p-3">
    <button
      onclick={onNavigateTwin}
      class="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm
             border border-twin/30 text-twin hover:bg-twin/10 transition-colors"
    >
      <span>AI Twin</span>
      <TwinStatusBadge active={twin.enabled} />
    </button>
  </div>
</aside>

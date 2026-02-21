<script lang="ts">
  import { chat } from '$lib/stores/chat.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { twin } from '$lib/stores/twin.svelte';
  import { profile } from '$lib/stores/profile.svelte';
  import { api } from '$lib/utils/api';
  import { truncateAddress } from '$lib/utils/format';
  import { slide } from 'svelte/transition';
  import TwinStatusBadge from './TwinStatusBadge.svelte';
  import SummaryCard from './SummaryCard.svelte';

  interface Props {
    onSelectChannel: (channelId: string) => void;
    onOpenTwin: () => void;
    onOpenSettings: () => void;
  }
  let { onSelectChannel, onOpenTwin, onOpenSettings }: Props = $props();

  const initials = $derived(
    profile.displayName
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );

  async function handleCatchUp(e: Event, channelId: string) {
    e.stopPropagation();
    if (!wallet.address) return;
    if (chat.catchUpLoading[channelId]) return;

    chat.setCatchUpLoading(channelId, true);
    try {
      const summary = await api.summarize(
        channelId,
        wallet.address,
        twin.config?.interests ?? ''
      );
      chat.setCatchUpSummary(channelId, summary);
      if (!chat.catchUpExpanded[channelId]) {
        chat.toggleCatchUpExpanded(channelId);
      }
    } catch (err) {
      console.error('Catch-up failed:', err);
    } finally {
      chat.setCatchUpLoading(channelId, false);
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <header class="px-4 py-3 border-b border-border bg-bg-surface">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-text-primary tracking-tight">TwinGovernance</h1>
        <p class="text-[11px] text-text-muted">Your Digital Twin for Governance</p>
      </div>
      <!-- Profile avatar → settings -->
      <button
        onclick={onOpenSettings}
        class="w-9 h-9 rounded-xs border border-border bg-bg-surface flex items-center justify-center overflow-hidden
               hover:border-text-muted transition-colors"
        aria-label="Settings"
      >
        {#if profile.avatarUrl}
          <img src={profile.avatarUrl} alt="" class="w-full h-full object-cover" />
        {:else}
          <span class="text-xs font-semibold text-text-muted">{initials}</span>
        {/if}
      </button>
    </div>
  </header>

  <!-- Channel List -->
  <div class="flex-1 overflow-y-auto">
    <p class="text-[11px] text-text-muted uppercase tracking-wider px-4 pt-4 pb-2">Channels</p>
    <div class="px-3 space-y-2">
    {#each chat.channels as channel}
      <div class="space-y-1">
        <!-- Chat button -->
        <button
          onclick={() => onSelectChannel(channel.id)}
          class="w-full text-left px-4 py-3 flex items-center justify-between
                 rounded-xs bg-bg-surface border border-border/30
                 hover:bg-bg-hover active:bg-bg-elevated transition-colors"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-text-primary">
                <span class="text-text-muted">#</span> {channel.name}
              </span>
              {#if chat.unreadCounts[channel.id]}
                <span class="px-1.5 py-0.5 text-[10px] font-black bg-text-primary text-bg rounded-xs leading-none">
                  {chat.unreadCounts[channel.id]}
                </span>
              {/if}
            </div>
            {#if channel.description}
              <p class="text-xs text-text-muted mt-0.5">{channel.description}</p>
            {/if}
          </div>
          <svg class="w-4 h-4 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <!-- Catch up -->
        <button
          onclick={(e) => {
            e.stopPropagation();
            if (chat.catchUpExpanded[channel.id]) {
              chat.toggleCatchUpExpanded(channel.id);
            } else {
              handleCatchUp(e, channel.id);
            }
          }}
          disabled={chat.catchUpLoading[channel.id]}
          class="w-full py-2 rounded-xs bg-text-primary text-bg
                 text-[11px] font-medium text-center
                 hover:opacity-90 transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if chat.catchUpLoading[channel.id]}
            ...
          {:else if chat.catchUpExpanded[channel.id]}
            Close
          {:else}
            Catch up
          {/if}
        </button>
      </div>
      <!-- Accordion: summary card -->
      {#if chat.catchUpExpanded[channel.id] && chat.catchUpSummaries[channel.id]}
        {@const summary = chat.catchUpSummaries[channel.id]!}
        <div transition:slide={{ duration: 200 }} class="rounded-xs bg-bg-surface border border-border/30 px-3 py-3">
          {#if summary.isUpToDate}
            <div class="text-center py-3">
              <p class="text-xs text-text-muted">You're all caught up</p>
            </div>
          {:else}
            <SummaryCard payload={summary} />
          {/if}
        </div>
      {/if}
    {/each}
    </div>

    <!-- Online Members -->
    <p class="text-[11px] text-text-muted uppercase tracking-wider px-4 pt-5 pb-2">
      Members - {chat.members.length}
    </p>
    <div class="px-4 space-y-1 pb-4">
      {#each chat.members as member}
        <div class="flex items-center gap-2 py-1.5 text-sm">
          <span class="text-[10px] font-bold flex-shrink-0 w-5 text-center
                 {member.status === 'online' ? 'text-text-primary' : 'text-text-muted'}">
            {member.status === 'online' ? 'ON' : 'OFF'}
          </span>
          <span class="w-px h-3 bg-border flex-shrink-0"></span>
          <span class="text-text-secondary truncate">{member.displayName}</span>
          <span class="text-xs text-text-muted font-mono">{truncateAddress(member.address)}</span>
          {#if member.twinEnabled}
            <span class="text-[9px] px-1 py-px rounded-xs bg-text-primary text-bg font-bold flex-shrink-0">TWIN</span>
          {/if}
        </div>
      {/each}
      {#if chat.members.length === 0}
        <p class="text-xs text-text-muted py-2">No members online</p>
      {/if}
    </div>
  </div>

  <!-- Twin Toggle (bottom) -->
  <div class="border-t border-border p-3 bg-bg-surface">
    <button
      onclick={onOpenTwin}
      class="w-full relative flex items-center justify-center rounded-xs
             bg-text-primary text-bg hover:opacity-90 transition-colors overflow-hidden"
    >
      <span class="text-sm font-bold py-3">Your Twin</span>
      <span class="absolute right-0 top-0 bottom-0 flex items-center justify-center px-3
                   {twin.enabled ? 'bg-bg text-text-primary' : 'bg-bg-hover text-text-muted'} border border-border">
        <span class="flex items-center gap-1 text-xs font-medium">
          <span class="w-1.5 h-1.5 rounded-full {twin.enabled ? 'bg-text-primary animate-pulse' : 'bg-text-muted'}"></span>
          {twin.enabled ? 'ON' : 'OFF'}
        </span>
      </span>
    </button>
  </div>
</div>

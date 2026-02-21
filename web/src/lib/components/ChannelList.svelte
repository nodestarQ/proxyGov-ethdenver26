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
        <h1 class="text-lg font-bold text-text-primary tracking-tight">proxyGov</h1>
        <p class="text-[11px] text-text-muted">Governance, without timezones</p>
      </div>
      <!-- Profile avatar → settings -->
      <button
        onclick={onOpenSettings}
        class="w-9 h-9 rounded-full border border-border bg-bg-surface flex items-center justify-center overflow-hidden
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
      <div class="flex items-stretch gap-2">
        <!-- Chat button -->
        <button
          onclick={() => onSelectChannel(channel.id)}
          class="flex-1 text-left px-4 py-3 flex items-center justify-between
                 rounded-xl bg-bg-surface border border-border/30
                 hover:bg-bg-hover active:bg-bg-elevated transition-colors min-w-0"
        >
          <div class="min-w-0">
            <span class="text-sm font-medium text-text-primary">
              <span class="text-text-muted">#</span> {channel.name}
            </span>
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
          class="w-20 flex-shrink-0 rounded-xl bg-bg-surface border border-border/30 overflow-hidden
                 flex flex-col
                 transition-colors whitespace-nowrap
                 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span class="flex-1 flex items-center justify-center text-[11px] font-bold
                 {chat.unreadCounts[channel.id] ? 'bg-text-primary text-bg' : 'text-text-muted'}">
            {chat.unreadCounts[channel.id] ?? 0}
          </span>
          <span class="w-full h-px {chat.unreadCounts[channel.id] ? 'bg-bg/20' : 'bg-border/30'}"></span>
          <span class="flex-1 flex items-center justify-center text-[11px] font-medium
                 {chat.unreadCounts[channel.id] ? 'text-twin hover:bg-twin/10' : 'text-text-muted hover:bg-bg-hover'}">
            {#if chat.catchUpLoading[channel.id]}
              ...
            {:else if chat.catchUpExpanded[channel.id]}
              Close
            {:else}
              Catch up
            {/if}
          </span>
        </button>
      </div>
      <!-- Accordion: summary card -->
      {#if chat.catchUpExpanded[channel.id] && chat.catchUpSummaries[channel.id]}
        {@const summary = chat.catchUpSummaries[channel.id]!}
        <div transition:slide={{ duration: 200 }} class="rounded-xl bg-bg-surface border border-border/30 px-3 py-3">
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
      Online - {chat.members.length}
    </p>
    <div class="px-4 space-y-1 pb-4">
      {#each chat.members as member}
        <div class="flex items-center gap-2 py-1.5 text-sm">
          <span class="w-2 h-2 rounded-full flex-shrink-0
                 {member.status === 'online' ? 'bg-text-primary' : member.status === 'away' ? 'bg-warning' : 'bg-text-muted'}"></span>
          <span class="text-text-secondary truncate">{member.displayName}</span>
          <span class="text-xs text-text-muted font-mono">{truncateAddress(member.address)}</span>
          {#if member.twinEnabled}
            <TwinStatusBadge small active />
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
      class="w-full flex items-center justify-between px-4 py-3 rounded-md
             border border-twin/30 text-twin hover:bg-twin/10 transition-colors"
    >
      <div class="flex items-center gap-2">
        <span class="text-base">🤖</span>
        <span class="text-sm font-medium">Twin</span>
      </div>
      <TwinStatusBadge active={twin.enabled} />
    </button>
  </div>
</div>

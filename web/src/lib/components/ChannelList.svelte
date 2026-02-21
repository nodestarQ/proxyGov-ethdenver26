<script lang="ts">
  import { chat } from '$lib/stores/chat.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { twin } from '$lib/stores/twin.svelte';
  import { profile } from '$lib/stores/profile.svelte';
  import { api } from '$lib/utils/api';
  import { truncateAddress } from '$lib/utils/format';
  import TwinStatusBadge from './TwinStatusBadge.svelte';
  import SummaryCard from './SummaryCard.svelte';

  interface Props {
    onSelectChannel: (channelId: string) => void;
    onOpenTwin: () => void;
    onOpenSettings: () => void;
  }
  let { onSelectChannel, onOpenTwin, onOpenSettings }: Props = $props();

  const EMOJI_AVATARS = [
    '🦊', '🐺', '🦁', '🐸', '🐙',
    '🤖', '👾', '🛸', '🌀', '💎',
    '🔮', '🧿', '⚡', '🌿', '🎭',
    '🗿', '🏴‍☠️', '🧬', '🪐', '🎲',
  ];
  const isEmoji = $derived(EMOJI_AVATARS.includes(profile.avatarUrl));

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
        {#if profile.avatarUrl && !isEmoji}
          <img src={profile.avatarUrl} alt="" class="w-full h-full object-cover" />
        {:else if isEmoji}
          <span class="text-lg">{profile.avatarUrl}</span>
        {:else}
          <span class="text-xs text-text-muted">{profile.displayName.charAt(0).toUpperCase()}</span>
        {/if}
      </button>
    </div>
  </header>

  <!-- Channel List -->
  <div class="flex-1 overflow-y-auto">
    <p class="text-[11px] text-text-muted uppercase tracking-wider px-4 pt-4 pb-2">Channels</p>
    <div class="px-3 space-y-2">
    {#each chat.channels as channel}
      <div class="rounded-xl bg-bg-surface border border-border/30 overflow-hidden">
        <!-- Channel row -->
        <div class="flex items-center">
          <button
            onclick={() => onSelectChannel(channel.id)}
            class="flex-1 text-left px-4 py-3 flex items-center justify-between
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
            <div class="flex items-center gap-2 flex-shrink-0">
              {#if chat.unreadCounts[channel.id]}
                <span class="min-w-5 h-5 flex items-center justify-center px-1.5 rounded-full bg-text-primary text-bg text-[11px] font-bold">
                  {chat.unreadCounts[channel.id]}
                </span>
              {/if}
              <svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
          <!-- Catch up button -->
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
            class="flex-shrink-0 mr-2 px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors whitespace-nowrap
                   disabled:opacity-50 disabled:cursor-not-allowed
                   {chat.unreadCounts[channel.id]
                     ? 'border border-twin/40 text-twin hover:bg-twin/10'
                     : 'border border-border/50 text-text-muted hover:bg-bg-hover'}"
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
          <div class="px-3 pb-3 border-t border-border/20">
            {#if summary.isUpToDate}
              <div class="mt-2 text-center py-3">
                <p class="text-xs text-text-muted">You're all caught up</p>
              </div>
            {:else}
              <div class="mt-2">
                <SummaryCard payload={summary} />
              </div>
            {/if}
          </div>
        {/if}
      </div>
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
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 0 1-1.59.659H9.06a2.25 2.25 0 0 1-1.591-.659L5 14.5m14 0V17a2.25 2.25 0 0 1-2.25 2.25H7.25A2.25 2.25 0 0 1 5 17v-2.5" />
        </svg>
        <span class="text-sm font-medium">AI Twin</span>
      </div>
      <TwinStatusBadge active={twin.enabled} />
    </button>
  </div>
</div>

<script lang="ts">
  import type { Poll } from '../../../../shared/types';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { api } from '$lib/utils/api';

  interface Props {
    payload: Poll;
  }
  let { payload }: Props = $props();

  const totalVotes = $derived(payload.options.reduce((sum, o) => sum + o.votes.length, 0));
  const hasVoted = $derived(payload.options.some(o => o.votes.includes(wallet.address ?? '')));

  async function vote(optionId: string) {
    if (hasVoted) return;
    try {
      await api.votePoll(payload.id, optionId);
    } catch {
      // Socket will update
    }
  }
</script>

<div class="crt-border rounded-md p-3 bg-bg-elevated max-w-sm">
  <div class="flex items-center gap-2 mb-2">
    <span class="text-xs px-2 py-0.5 rounded-full bg-info/10 text-info border border-info/30">POLL</span>
  </div>

  <p class="text-sm font-medium text-text-primary mb-2">{payload.question}</p>

  <div class="space-y-1.5">
    {#each payload.options as option}
      {@const pct = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0}
      <button
        onclick={() => vote(option.id)}
        disabled={hasVoted}
        class="w-full relative overflow-hidden rounded-md border text-left text-xs px-3 py-1.5 transition-colors
               {option.votes.includes(wallet.address ?? '')
                 ? 'border-accent/40 text-accent'
                 : 'border-border text-text-secondary hover:border-accent/30'}"
      >
        <div
          class="absolute inset-y-0 left-0 bg-accent/10 transition-all"
          style="width: {pct}%"
        ></div>
        <div class="relative flex justify-between">
          <span>{option.text}</span>
          <span class="font-mono">{pct}%</span>
        </div>
      </button>
    {/each}
  </div>

  <p class="text-[10px] text-text-muted mt-2">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
</div>

<script lang="ts">
  import type { OpportunityPayload } from '../../../../shared/types';

  interface Props {
    payload: OpportunityPayload;
  }
  let { payload }: Props = $props();

  const urgencyColor = $derived(
    payload.urgency === 'high' ? 'text-danger border-danger/30 bg-danger/10' :
    payload.urgency === 'medium' ? 'text-warning border-warning/30 bg-warning/10' :
    'text-info border-info/30 bg-info/10'
  );
</script>

<div class="crt-border rounded-md p-3 bg-bg-elevated max-w-sm twin-glow">
  <div class="flex items-center gap-2 mb-2">
    <span class="text-xs px-2 py-0.5 rounded-full bg-twin/10 text-twin border border-twin/30">OPPORTUNITY</span>
    <span class="text-xs px-1.5 py-0.5 rounded-full {urgencyColor}">{payload.urgency}</span>
    <span class="text-xs px-1.5 py-0.5 rounded-full bg-bg-hover text-text-secondary border border-border">{payload.type}</span>
  </div>

  <p class="text-sm font-medium text-text-primary">{payload.title}</p>
  <p class="text-xs text-text-secondary mt-1">{payload.description}</p>
  <p class="text-xs text-twin mt-2 italic">{payload.relevance}</p>

  {#if payload.relatedTokens && payload.relatedTokens.length > 0}
    <div class="flex gap-1 mt-2">
      {#each payload.relatedTokens as token}
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/30 font-mono">${token}</span>
      {/each}
    </div>
  {/if}
</div>

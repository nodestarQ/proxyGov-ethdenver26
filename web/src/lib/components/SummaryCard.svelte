<script lang="ts">
  import type { SummaryPayload } from '../../../../shared/types';

  interface Props {
    payload: SummaryPayload;
  }
  let { payload }: Props = $props();
</script>

<div class="crt-border rounded-xs p-3 bg-bg-elevated max-w-md">
  <div class="flex items-center gap-2 mb-2">
    <span class="text-xs px-2 py-0.5 rounded-xs bg-text-primary text-bg">SUMMARY</span>
    <span class="text-xs text-text-muted">{payload.messageCount} messages</span>
  </div>

  <p class="text-sm text-text-primary mb-2">{payload.summary}</p>

  {#if payload.keyTopics.length > 0}
    <div class="mb-2">
      <p class="text-[10px] text-text-muted uppercase tracking-wider mb-1">Key Topics</p>
      <div class="flex flex-wrap gap-1">
        {#each payload.keyTopics as topic}
          <span class="text-xs px-1.5 py-0.5 rounded-xs bg-bg-hover text-text-secondary border border-border">{topic}</span>
        {/each}
      </div>
    </div>
  {/if}

  {#if payload.actionItems.length > 0}
    <div class="mb-2">
      <p class="text-[10px] text-text-muted uppercase tracking-wider mb-1">Action Items</p>
      <ul class="text-xs text-text-secondary space-y-0.5">
        {#each payload.actionItems as item}
          <li class="flex gap-1"><span class="text-accent">→</span> {item}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if payload.mentionedTokens.length > 0}
    <div class="flex gap-1 mt-2">
      {#each payload.mentionedTokens as token}
        <span class="text-xs px-1.5 py-0.5 rounded-xs bg-text-primary text-bg font-mono">${token}</span>
      {/each}
    </div>
  {/if}
</div>

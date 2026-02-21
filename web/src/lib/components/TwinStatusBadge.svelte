<script lang="ts">
  interface Props {
    active?: boolean;
    small?: boolean;
  }
  let { active = false, small = false }: Props = $props();
</script>

<span
  class="inline-flex items-center gap-1 rounded-xs font-medium
         {small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}
         {active ? 'bg-bg text-text-primary border border-border' : 'bg-bg-hover text-text-muted border border-border'}"
>
  <span class="w-1.5 h-1.5 rounded-full {active ? 'bg-text-primary animate-pulse' : 'bg-text-muted'}"></span>
  {#if !small}
    {active ? 'ON' : 'OFF'}
  {/if}
</span>

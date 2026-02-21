<script lang="ts">
  import { twin } from '$lib/stores/twin.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { slide } from 'svelte/transition';

  interface Props {
    onBack: () => void;
  }
  let { onBack }: Props = $props();

  let explainerOpen = $state(false);

  function handleSave() {
    if (wallet.address) {
      twin.save(wallet.address);
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header with back button -->
  <header class="flex items-center gap-3 px-2 py-2.5 border-b border-border bg-bg-surface">
    <button
      onclick={onBack}
      class="p-1.5 -ml-0.5 rounded-md hover:bg-bg-hover transition-colors"
    >
      <svg class="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <h2 class="text-sm font-semibold text-text-primary">Twin</h2>
  </header>

  <!-- Config Content -->
  <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
    <div class="rounded-lg border border-twin/30 bg-twin/5 overflow-hidden">
      <button
        onclick={() => explainerOpen = !explainerOpen}
        class="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-twin/10 transition-colors"
      >
        <span class="text-sm font-medium text-text-primary">What's a Twin?</span>
        <svg
          class="w-4 h-4 text-text-muted transition-transform {explainerOpen ? 'rotate-180' : ''}"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {#if explainerOpen}
        <div transition:slide={{ duration: 200 }} class="px-3 pb-3">
          <p class="text-xs text-text-secondary leading-relaxed">Your Twin is your AI representation in the DAO. It follows conversations and responds on your behalf based on the personality and interests you define. When the DAO proposes actions like treasury swaps that need member signatures, your Twin can vote autonomously if the proposal aligns with your interests and falls within your spending cap.</p>
        </div>
      {/if}
    </div>

    {#if twin.config}
      <!-- Enable Toggle -->
      <div class="crt-border rounded-md p-4 bg-bg-surface">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-text-primary">Enable Twin</p>
            <p class="text-xs text-text-muted">Responds when you're away</p>
          </div>
          <button
            onclick={() => twin.updateField('enabled', !twin.config!.enabled)}
            class="w-12 h-6 rounded-full border transition-colors relative
                   {twin.config.enabled ? 'bg-twin/20 border-twin/40' : 'bg-bg-hover border-border'}"
          >
            <span
              class="absolute top-0.5 w-5 h-5 rounded-full transition-all
                     {twin.config.enabled ? 'left-6 bg-twin' : 'left-0.5 bg-text-muted'}"
            ></span>
          </button>
        </div>
      </div>

      <!-- Personality -->
      <div class="crt-border rounded-md p-4 bg-bg-surface">
        <label class="block text-sm font-medium text-text-primary mb-1">Personality</label>
        <p class="text-xs text-text-muted mb-2">How should your twin behave?</p>
        <textarea
          value={twin.config.personality}
          oninput={(e) => twin.updateField('personality', (e.target as HTMLTextAreaElement).value)}
          placeholder="e.g., Direct and analytical. Interested in DeFi yields. Slightly skeptical of new tokens."
          rows="3"
          class="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm
                 text-text-primary placeholder:text-text-muted
                 focus:outline-none focus:border-accent/50 resize-none"
        ></textarea>
      </div>

      <!-- Interests -->
      <div class="crt-border rounded-md p-4 bg-bg-surface">
        <label class="block text-sm font-medium text-text-primary mb-1">Interests</label>
        <p class="text-xs text-text-muted mb-2">Topics your twin pays attention to</p>
        <textarea
          value={twin.config.interests}
          oninput={(e) => twin.updateField('interests', (e.target as HTMLTextAreaElement).value)}
          placeholder="e.g., ETH price action, governance proposals, DeFi yields, layer 2 scaling"
          rows="3"
          class="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm
                 text-text-primary placeholder:text-text-muted
                 focus:outline-none focus:border-accent/50 resize-none"
        ></textarea>
      </div>

      <!-- Response Style -->
      <div class="crt-border rounded-md p-4 bg-bg-surface">
        <label class="block text-sm font-medium text-text-primary mb-1">Response Style</label>
        <p class="text-xs text-text-muted mb-2">How should your twin talk?</p>
        <textarea
          value={twin.config.responseStyle}
          oninput={(e) => twin.updateField('responseStyle', (e.target as HTMLTextAreaElement).value)}
          placeholder="e.g., Keep it short and data-driven. No fluff, just facts and numbers."
          rows="3"
          class="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm
                 text-text-primary placeholder:text-text-muted
                 focus:outline-none focus:border-accent/50 resize-none"
        ></textarea>
      </div>

      <!-- Autonomous Cap -->
      <div class="crt-border rounded-md p-4 bg-bg-surface">
        <label class="block text-sm font-medium text-text-primary mb-1">Autonomous Cap (USD)</label>
        <p class="text-xs text-text-muted mb-2">Your Twin can sign off on DAO proposals up to this value without your approval</p>
        <input
          type="number"
          value={twin.config.autonomousCapUsd}
          oninput={(e) => twin.updateField('autonomousCapUsd', parseFloat((e.target as HTMLInputElement).value) || 0)}
          step="1"
          min="0"
          class="w-full bg-bg-elevated border border-border rounded-md px-3 py-1.5 text-sm font-mono
                 text-text-primary focus:outline-none focus:border-accent/50"
        />
      </div>

      <!-- Save -->
      <button
        onclick={handleSave}
        disabled={twin.saving}
        class="w-full py-2.5 border border-border text-text-primary rounded-md font-medium
               hover:bg-bg-hover transition-colors
               disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {twin.saving ? 'Saving...' : 'Save Configuration'}
      </button>
    {:else}
      <p class="text-text-muted text-sm">Loading twin configuration...</p>
    {/if}
  </div>
</div>

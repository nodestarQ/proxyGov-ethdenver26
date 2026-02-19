<script lang="ts">
  import { twin } from '$lib/stores/twin.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';

  interface Props {
    onBack: () => void;
  }
  let { onBack }: Props = $props();

  let interestInput = $state('');

  function addInterest() {
    const val = interestInput.trim();
    if (!val || !twin.config) return;
    if (!twin.config.interests.includes(val)) {
      twin.updateField('interests', [...twin.config.interests, val]);
    }
    interestInput = '';
  }

  function removeInterest(interest: string) {
    if (!twin.config) return;
    twin.updateField('interests', twin.config.interests.filter(i => i !== interest));
  }

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
    <h2 class="text-sm font-semibold text-text-primary">AI Twin</h2>
  </header>

  <!-- Config Content -->
  <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
    {#if twin.config}
      <!-- Enable Toggle -->
      <div class="crt-border rounded-md p-4 bg-bg-surface">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-text-primary">Enable AI Twin</p>
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
        <p class="text-xs text-text-muted mb-2">Keywords your twin responds to</p>
        <div class="flex gap-2 mb-2">
          <input
            bind:value={interestInput}
            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }}
            placeholder="Add interest..."
            class="flex-1 bg-bg-elevated border border-border rounded-md px-3 py-1.5 text-sm
                   text-text-primary placeholder:text-text-muted
                   focus:outline-none focus:border-accent/50"
          />
          <button onclick={addInterest} class="px-3 py-1.5 border border-border text-text-primary rounded-md text-sm hover:bg-bg-hover transition-colors">
            Add
          </button>
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each twin.config.interests as interest}
            <button
              onclick={() => removeInterest(interest)}
              class="text-xs px-2 py-0.5 rounded-full bg-bg-elevated text-text-secondary border border-border hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-colors"
            >
              {interest} x
            </button>
          {/each}
        </div>
      </div>

      <!-- Response Style -->
      <div class="crt-border rounded-md p-4 bg-bg-surface">
        <label class="block text-sm font-medium text-text-primary mb-2">Response Style</label>
        <div class="flex gap-2">
          {#each ['concise', 'detailed', 'casual'] as style}
            <button
              onclick={() => twin.updateField('responseStyle', style as any)}
              class="flex-1 px-3 py-1.5 rounded-md text-sm border transition-colors
                     {twin.config.responseStyle === style
                       ? 'border-text-primary bg-text-primary/10 text-text-primary font-medium'
                       : 'border-border text-text-secondary hover:border-text-muted'}"
            >
              {style}
            </button>
          {/each}
        </div>
      </div>

      <!-- Max Swap Size -->
      <div class="crt-border rounded-md p-4 bg-bg-surface">
        <label class="block text-sm font-medium text-text-primary mb-1">Max Swap Size (ETH)</label>
        <p class="text-xs text-text-muted mb-2">Maximum swap your twin can propose</p>
        <input
          type="number"
          value={twin.config.maxSwapSizeEth}
          oninput={(e) => twin.updateField('maxSwapSizeEth', parseFloat((e.target as HTMLInputElement).value) || 0)}
          step="0.01"
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

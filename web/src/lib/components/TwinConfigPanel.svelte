<script lang="ts">
  import { twin } from '$lib/stores/twin.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';

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

<div class="max-w-lg mx-auto p-6 space-y-6">
  <div>
    <h2 class="text-lg font-bold text-accent text-glow">AI Twin Configuration</h2>
    <p class="text-sm text-text-muted mt-1">Configure your AI proxy that stays active when you're away</p>
  </div>

  {#if twin.config}
    <!-- Enable Toggle -->
    <div class="crt-border rounded-md p-4 bg-bg-surface">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-text-primary">Enable AI Twin</p>
          <p class="text-xs text-text-muted">Your twin will respond when you're away</p>
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
        placeholder="e.g., Direct and analytical. Interested in DeFi yields and governance proposals. Slightly skeptical of new tokens."
        rows="3"
        class="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm
               text-text-primary placeholder:text-text-muted
               focus:outline-none focus:border-accent/50 resize-none"
      ></textarea>
    </div>

    <!-- Interests -->
    <div class="crt-border rounded-md p-4 bg-bg-surface">
      <label class="block text-sm font-medium text-text-primary mb-1">Interests</label>
      <p class="text-xs text-text-muted mb-2">Keywords your twin will respond to</p>
      <div class="flex gap-2 mb-2">
        <input
          bind:value={interestInput}
          onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }}
          placeholder="Add interest..."
          class="flex-1 bg-bg-elevated border border-border rounded-md px-3 py-1.5 text-sm
                 text-text-primary placeholder:text-text-muted
                 focus:outline-none focus:border-accent/50"
        />
        <button onclick={addInterest} class="px-3 py-1.5 border border-accent/40 text-accent rounded-md text-sm hover:bg-accent hover:text-bg transition-colors">
          Add
        </button>
      </div>
      <div class="flex flex-wrap gap-1">
        {#each twin.config.interests as interest}
          <button
            onclick={() => removeInterest(interest)}
            class="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/30 hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-colors"
          >
            {interest} ×
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
            class="px-3 py-1.5 rounded-md text-sm border transition-colors
                   {twin.config.responseStyle === style
                     ? 'border-accent/40 bg-accent/10 text-accent'
                     : 'border-border text-text-secondary hover:border-accent/30'}"
          >
            {style}
          </button>
        {/each}
      </div>
    </div>

    <!-- Max Swap Size -->
    <div class="crt-border rounded-md p-4 bg-bg-surface">
      <label class="block text-sm font-medium text-text-primary mb-1">Max Swap Size (ETH)</label>
      <p class="text-xs text-text-muted mb-2">Maximum swap amount your twin can propose</p>
      <input
        type="number"
        value={twin.config.maxSwapSizeEth}
        oninput={(e) => twin.updateField('maxSwapSizeEth', parseFloat((e.target as HTMLInputElement).value) || 0)}
        step="0.01"
        min="0"
        class="w-32 bg-bg-elevated border border-border rounded-md px-3 py-1.5 text-sm font-mono
               text-text-primary focus:outline-none focus:border-accent/50"
      />
    </div>

    <!-- Save -->
    <button
      onclick={handleSave}
      disabled={twin.saving}
      class="w-full py-2 bg-accent/10 border border-accent/40 text-accent rounded-md font-medium
             hover:bg-accent hover:text-bg transition-colors
             disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {twin.saving ? 'Saving...' : 'Save Configuration'}
    </button>
  {:else}
    <p class="text-text-muted text-sm">Loading twin configuration...</p>
  {/if}
</div>

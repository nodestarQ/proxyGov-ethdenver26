<script lang="ts">
  import { twin } from '$lib/stores/twin.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';
  import { slide } from 'svelte/transition';

  interface Props {
    onBack: () => void;
  }
  let { onBack }: Props = $props();

  let explainerOpen = $state(false);
  let personalityOpen = $state(false);
  let interestsOpen = $state(false);
  let responseStyleOpen = $state(false);
  let autonomousCapOpen = $state(false);

  // Draft values for each field
  let personalityDraft = $state('');
  let interestsDraft = $state('');
  let responseStyleDraft = $state('');
  let autonomousCapDraft = $state(0);

  const personalityChanged = $derived(twin.config ? personalityDraft !== twin.config.personality : false);
  const interestsChanged = $derived(twin.config ? interestsDraft !== twin.config.interests : false);
  const responseStyleChanged = $derived(twin.config ? responseStyleDraft !== twin.config.responseStyle : false);
  const autonomousCapChanged = $derived(twin.config ? autonomousCapDraft !== twin.config.autonomousCapUsd : false);

  function openField(field: 'personality' | 'interests' | 'responseStyle' | 'autonomousCap') {
    if (!twin.config) return;
    if (field === 'personality') { personalityDraft = twin.config.personality; personalityOpen = true; }
    else if (field === 'interests') { interestsDraft = twin.config.interests; interestsOpen = true; }
    else if (field === 'responseStyle') { responseStyleDraft = twin.config.responseStyle; responseStyleOpen = true; }
    else if (field === 'autonomousCap') { autonomousCapDraft = twin.config.autonomousCapUsd; autonomousCapOpen = true; }
  }

  function saveField(field: 'personality' | 'interests' | 'responseStyle' | 'autonomousCap') {
    if (!twin.config || !wallet.address) return;
    if (field === 'personality') { twin.updateField('personality', personalityDraft); personalityOpen = false; }
    else if (field === 'interests') { twin.updateField('interests', interestsDraft); interestsOpen = false; }
    else if (field === 'responseStyle') { twin.updateField('responseStyle', responseStyleDraft); responseStyleOpen = false; }
    else if (field === 'autonomousCap') { twin.updateField('autonomousCapUsd', autonomousCapDraft); autonomousCapOpen = false; }
    twin.save(wallet.address);
  }

  function cancelField(field: 'personality' | 'interests' | 'responseStyle' | 'autonomousCap') {
    if (field === 'personality') personalityOpen = false;
    else if (field === 'interests') interestsOpen = false;
    else if (field === 'responseStyle') responseStyleOpen = false;
    else if (field === 'autonomousCap') autonomousCapOpen = false;
  }

  function handleToggleEnabled() {
    if (!twin.config || !wallet.address) return;
    twin.updateField('enabled', !twin.config.enabled);
    twin.save(wallet.address);
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
    <h2 class="text-sm font-semibold text-text-primary">Your Twin</h2>
  </header>

  <!-- Config Content -->
  <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
    <div class="rounded-xs border border-border bg-text-primary overflow-hidden">
      <button
        onclick={() => explainerOpen = !explainerOpen}
        class="w-full flex items-center justify-between px-3 py-2.5 text-left hover:opacity-90 transition-colors"
      >
        <div class="flex items-center gap-1.5">
          <svg class="w-4 h-4 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-bold text-bg">What's a Twin?</span>
        </div>
        <svg
          class="w-4 h-4 text-bg/60 transition-transform {explainerOpen ? 'rotate-180' : ''}"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {#if explainerOpen}
        <div transition:slide={{ duration: 200 }} class="px-3 py-3 bg-bg-surface border-t border-border">
          <p class="text-xs text-text-primary leading-relaxed">Your Twin is your AI representation in the DAO. It follows conversations and responds on your behalf based on the personality and interests you define. When the DAO proposes actions like treasury swaps that need member signatures, your Twin can vote autonomously if the proposal aligns with your interests and falls within your spending cap.</p>
        </div>
      {/if}
    </div>

    {#if twin.config}
      <!-- Enable Toggle -->
      <div class="crt-border rounded-xs p-4 bg-bg-surface">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-text-primary">Enable Twin</p>
            <p class="text-xs text-text-muted">Responds when you're away</p>
          </div>
          <button
            onclick={handleToggleEnabled}
            class="w-16 h-7 rounded-xs border transition-colors relative flex items-center
                   {twin.config.enabled ? 'bg-text-primary border-text-primary' : 'bg-bg-hover border-border'}"
          >
            <span class="absolute inset-y-0 left-1.5 flex items-center text-[9px] font-bold transition-opacity
                         {twin.config.enabled ? 'text-bg opacity-100' : 'opacity-0'}">ON</span>
            <span class="absolute inset-y-0 right-1.5 flex items-center text-[9px] font-bold transition-opacity
                         {!twin.config.enabled ? 'text-text-muted opacity-100' : 'opacity-0'}">OFF</span>
            <span
              class="absolute inset-y-0.5 w-6 rounded-xs transition-all
                     {twin.config.enabled ? 'left-[34px] bg-bg' : 'left-0.5 bg-text-muted'}"
            ></span>
          </button>
        </div>
      </div>

      <!-- Personality -->
      <div class="crt-border rounded-xs bg-bg-surface overflow-hidden">
        <button
          onclick={() => personalityOpen ? cancelField('personality') : openField('personality')}
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-hover transition-colors"
        >
          <svg class="w-4 h-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary">Personality</p>
            <p class="text-xs text-text-muted">How should your twin behave?</p>
          </div>
          <svg class="w-4 h-4 text-text-muted shrink-0 transition-transform {personalityOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {#if personalityOpen}
          <div transition:slide={{ duration: 200 }} class="px-4 pb-3 space-y-2">
            <textarea
              bind:value={personalityDraft}
              placeholder="e.g., Direct and analytical. Interested in DeFi yields. Slightly skeptical of new tokens."
              rows="3"
              class="w-full bg-bg border border-border rounded-xs px-3 py-2 text-sm
                     text-text-primary placeholder:text-text-muted
                     focus:outline-none focus:border-accent/50 resize-none"
            ></textarea>
            <div class="flex gap-2">
              <button
                onclick={() => saveField('personality')}
                disabled={!personalityChanged}
                class="flex-1 py-1.5 bg-text-primary text-bg rounded-xs text-xs font-bold
                       hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >Save</button>
              <button
                onclick={() => cancelField('personality')}
                disabled={!personalityChanged}
                class="flex-1 py-1.5 bg-transparent border border-border text-text-primary rounded-xs text-xs font-bold
                       hover:bg-bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >Cancel</button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Interests -->
      <div class="crt-border rounded-xs bg-bg-surface overflow-hidden">
        <button
          onclick={() => interestsOpen ? cancelField('interests') : openField('interests')}
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-hover transition-colors"
        >
          <svg class="w-4 h-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary">Interests</p>
            <p class="text-xs text-text-muted">Topics your twin pays attention to</p>
          </div>
          <svg class="w-4 h-4 text-text-muted shrink-0 transition-transform {interestsOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {#if interestsOpen}
          <div transition:slide={{ duration: 200 }} class="px-4 pb-3 space-y-2">
            <textarea
              bind:value={interestsDraft}
              placeholder="e.g., ETH price action, governance proposals, DeFi yields, layer 2 scaling"
              rows="3"
              class="w-full bg-bg border border-border rounded-xs px-3 py-2 text-sm
                     text-text-primary placeholder:text-text-muted
                     focus:outline-none focus:border-accent/50 resize-none"
            ></textarea>
            <div class="flex gap-2">
              <button
                onclick={() => saveField('interests')}
                disabled={!interestsChanged}
                class="flex-1 py-1.5 bg-text-primary text-bg rounded-xs text-xs font-bold
                       hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >Save</button>
              <button
                onclick={() => cancelField('interests')}
                disabled={!interestsChanged}
                class="flex-1 py-1.5 bg-transparent border border-border text-text-primary rounded-xs text-xs font-bold
                       hover:bg-bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >Cancel</button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Response Style -->
      <div class="crt-border rounded-xs bg-bg-surface overflow-hidden">
        <button
          onclick={() => responseStyleOpen ? cancelField('responseStyle') : openField('responseStyle')}
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-hover transition-colors"
        >
          <svg class="w-4 h-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary">Response Style</p>
            <p class="text-xs text-text-muted">How should your twin talk?</p>
          </div>
          <svg class="w-4 h-4 text-text-muted shrink-0 transition-transform {responseStyleOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {#if responseStyleOpen}
          <div transition:slide={{ duration: 200 }} class="px-4 pb-3 space-y-2">
            <textarea
              bind:value={responseStyleDraft}
              placeholder="e.g., Keep it short and data-driven. No fluff, just facts and numbers."
              rows="3"
              class="w-full bg-bg border border-border rounded-xs px-3 py-2 text-sm
                     text-text-primary placeholder:text-text-muted
                     focus:outline-none focus:border-accent/50 resize-none"
            ></textarea>
            <div class="flex gap-2">
              <button
                onclick={() => saveField('responseStyle')}
                disabled={!responseStyleChanged}
                class="flex-1 py-1.5 bg-text-primary text-bg rounded-xs text-xs font-bold
                       hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >Save</button>
              <button
                onclick={() => cancelField('responseStyle')}
                disabled={!responseStyleChanged}
                class="flex-1 py-1.5 bg-transparent border border-border text-text-primary rounded-xs text-xs font-bold
                       hover:bg-bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >Cancel</button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Autonomous Cap -->
      <div class="crt-border rounded-xs bg-bg-surface overflow-hidden">
        <button
          onclick={() => autonomousCapOpen ? cancelField('autonomousCap') : openField('autonomousCap')}
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-hover transition-colors"
        >
          <svg class="w-4 h-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary">Autonomous Cap (USD)</p>
            <p class="text-xs text-text-muted">Max value your Twin can approve without you</p>
          </div>
          <svg class="w-4 h-4 text-text-muted shrink-0 transition-transform {autonomousCapOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {#if autonomousCapOpen}
          <div transition:slide={{ duration: 200 }} class="px-4 pb-3 space-y-2">
            <input
              type="number"
              bind:value={autonomousCapDraft}
              step="1"
              min="0"
              class="w-full bg-bg border border-border rounded-xs px-3 py-1.5 text-sm font-mono
                     text-text-primary focus:outline-none focus:border-accent/50"
            />
            <div class="flex gap-2">
              <button
                onclick={() => saveField('autonomousCap')}
                disabled={!autonomousCapChanged}
                class="flex-1 py-1.5 bg-text-primary text-bg rounded-xs text-xs font-bold
                       hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >Save</button>
              <button
                onclick={() => cancelField('autonomousCap')}
                disabled={!autonomousCapChanged}
                class="flex-1 py-1.5 bg-transparent border border-border text-text-primary rounded-xs text-xs font-bold
                       hover:bg-bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >Cancel</button>
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <p class="text-text-muted text-sm">Loading twin configuration...</p>
    {/if}
  </div>
</div>

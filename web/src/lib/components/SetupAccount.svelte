<script lang="ts">
  import { wallet } from '$lib/stores/wallet.svelte';
  import { api } from '$lib/utils/api';
  import { truncateAddress } from '$lib/utils/format';
  import { slide } from 'svelte/transition';

  interface Props {
    onComplete: (displayName: string, avatarUrl: string) => void;
  }
  let { onComplete }: Props = $props();

  type Step = 'profile' | 'twin';
  let step = $state<Step>('profile');

  // Profile step
  let username = $state('');
  let customAvatarUrl = $state('');
  let saving = $state(false);
  let error = $state('');

  const avatarPreview = $derived(customAvatarUrl);
  const canSubmitProfile = $derived(username.trim().length >= 2);
  const initials = $derived(
    username.trim()
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );

  // Twin step
  let personality = $state('');
  let interests = $state('');
  let responseStyle = $state('');

  let personalityOpen = $state(false);
  let interestsOpen = $state(false);
  let responseStyleOpen = $state(false);

  // Drafts for accordion editing
  let personalityDraft = $state('');
  let interestsDraft = $state('');
  let responseStyleDraft = $state('');

  const personalityChanged = $derived(personalityDraft !== personality);
  const interestsChanged = $derived(interestsDraft !== interests);
  const responseStyleChanged = $derived(responseStyleDraft !== responseStyle);

  const canSubmitTwin = $derived(personality.trim() !== '' && interests.trim() !== '' && responseStyle.trim() !== '');

  function openSetupField(field: 'personality' | 'interests' | 'responseStyle') {
    if (field === 'personality') { personalityDraft = personality; personalityOpen = true; }
    else if (field === 'interests') { interestsDraft = interests; interestsOpen = true; }
    else if (field === 'responseStyle') { responseStyleDraft = responseStyle; responseStyleOpen = true; }
  }

  function saveSetupField(field: 'personality' | 'interests' | 'responseStyle') {
    if (field === 'personality') { personality = personalityDraft; personalityOpen = false; }
    else if (field === 'interests') { interests = interestsDraft; interestsOpen = false; }
    else if (field === 'responseStyle') { responseStyle = responseStyleDraft; responseStyleOpen = false; }
  }

  function cancelSetupField(field: 'personality' | 'interests' | 'responseStyle') {
    if (field === 'personality') personalityOpen = false;
    else if (field === 'interests') interestsOpen = false;
    else if (field === 'responseStyle') responseStyleOpen = false;
  }

  function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error = 'Please select an image file';
      return;
    }
    if (file.size > 1024 * 1024) {
      error = 'Image must be under 1MB';
      return;
    }

    error = '';
    const reader = new FileReader();
    reader.onload = () => {
      customAvatarUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleProfileNext() {
    if (!canSubmitProfile || !wallet.address) return;
    saving = true;
    error = '';

    try {
      await api.updateUser(wallet.address, {
        displayName: username.trim(),
        avatarUrl: avatarPreview
      });
      step = 'twin';
    } catch (err: any) {
      error = err.message || 'Failed to save profile';
    } finally {
      saving = false;
    }
  }

  async function handleTwinSave() {
    if (!wallet.address) return;
    saving = true;
    error = '';

    try {
      await api.updateTwinConfig(wallet.address, {
        enabled: false,
        personality,
        interests,
        responseStyle,
        autonomousCapUsd: 100,
        autoSummarize: true
      });
      onComplete(username.trim(), avatarPreview);
    } catch (err: any) {
      error = err.message || 'Failed to save';
    } finally {
      saving = false;
    }
  }

  function handleSkip() {
    onComplete(username.trim(), avatarPreview);
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <header class="px-4 py-3 border-b border-border bg-bg-surface">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-sm font-semibold text-text-primary">
          {step === 'profile' ? 'Set up your profile' : 'Your Twin'}
        </h1>
        <p class="text-[11px] text-text-muted">{truncateAddress(wallet.address!)}</p>
      </div>
      <!-- Step indicator -->
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full {step === 'profile' ? 'bg-text-primary' : 'bg-text-muted'}"></span>
        <span class="w-2 h-2 rounded-full {step === 'twin' ? 'bg-twin' : 'bg-text-muted'}"></span>
      </div>
    </div>
  </header>

  {#if step === 'profile'}
    <!-- ═══ Step 1: Profile ═══ -->
    <div class="flex-1 overflow-y-auto px-5 py-6 space-y-6">
      <!-- Avatar Preview -->
      <div class="flex flex-col items-center gap-3">
        <div class="w-20 h-20 rounded-xs border-2 border-border bg-bg-elevated flex items-center justify-center overflow-hidden">
          {#if customAvatarUrl}
            <img src={customAvatarUrl} alt="Avatar" class="w-full h-full object-cover" />
          {:else}
            <span class="text-xl font-semibold text-text-muted">{initials}</span>
          {/if}
        </div>
        {#if customAvatarUrl}
          <div class="flex flex-col items-center gap-1">
            <label class="text-xs text-text-muted underline cursor-pointer hover:text-text-secondary transition-colors">
              Change photo
              <input type="file" accept="image/*" class="hidden" onchange={handleFileUpload} />
            </label>
            <button
              onclick={() => customAvatarUrl = ''}
              class="text-xs text-danger underline hover:opacity-70 transition-colors"
            >
              Remove
            </button>
          </div>
        {:else}
          <label class="text-xs text-text-muted underline cursor-pointer hover:text-text-secondary transition-colors">
            Upload photo
            <input type="file" accept="image/*" class="hidden" onchange={handleFileUpload} />
          </label>
        {/if}
      </div>

      <!-- Username Input -->
      <div>
        <label class="block text-sm font-medium text-text-primary mb-1.5">Username</label>
        <input
          bind:value={username}
          placeholder="Enter a display name..."
          maxlength="24"
          class="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm
                 text-text-primary placeholder:text-text-muted
                 focus:outline-none focus:border-text-muted transition-colors"
        />
        <p class="text-[11px] text-text-muted mt-1">2-24 characters. This is how others will see you.</p>
      </div>

      {#if error}
        <p class="text-danger text-xs">{error}</p>
      {/if}
    </div>

    <!-- Next -->
    <div class="p-4 border-t border-border bg-bg-surface">
      <button
        onclick={handleProfileNext}
        disabled={!canSubmitProfile || saving}
        class="w-full py-2.5 rounded-lg font-medium text-sm transition-colors
               {canSubmitProfile && !saving
                 ? 'bg-text-primary text-bg hover:opacity-90'
                 : 'bg-bg-elevated text-text-muted border border-border cursor-not-allowed'}"
      >
        {saving ? 'Saving...' : 'Next'}
      </button>
    </div>

  {:else}
    <!-- ═══ Step 2: Tell us about you ═══ -->
    <div class="flex-1 overflow-y-auto px-5 py-6 space-y-4">
      <div class="text-center px-2">
        <p class="text-sm text-text-primary font-medium">Tell us about yourself</p>
        <p class="text-xs text-text-muted mt-1">This helps your Twin know how to represent you when you're away.</p>
      </div>

      <!-- Personality -->
      <div class="crt-border rounded-xs bg-bg-surface overflow-hidden">
        <button
          onclick={() => personalityOpen ? cancelSetupField('personality') : openSetupField('personality')}
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-hover transition-colors"
        >
          <svg class="w-4 h-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary">Personality</p>
            <p class="text-xs text-text-muted">How would you describe your vibe?</p>
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
                onclick={() => saveSetupField('personality')}
                disabled={!personalityChanged}
                class="flex-1 py-1.5 bg-text-primary text-bg rounded-xs text-xs font-bold
                       hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >Save</button>
              <button
                onclick={() => cancelSetupField('personality')}
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
          onclick={() => interestsOpen ? cancelSetupField('interests') : openSetupField('interests')}
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-hover transition-colors"
        >
          <svg class="w-4 h-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary">Interests</p>
            <p class="text-xs text-text-muted">Topics you care about - your twin will pay attention to these</p>
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
                onclick={() => saveSetupField('interests')}
                disabled={!interestsChanged}
                class="flex-1 py-1.5 bg-text-primary text-bg rounded-xs text-xs font-bold
                       hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >Save</button>
              <button
                onclick={() => cancelSetupField('interests')}
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
          onclick={() => responseStyleOpen ? cancelSetupField('responseStyle') : openSetupField('responseStyle')}
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
                onclick={() => saveSetupField('responseStyle')}
                disabled={!responseStyleChanged}
                class="flex-1 py-1.5 bg-text-primary text-bg rounded-xs text-xs font-bold
                       hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >Save</button>
              <button
                onclick={() => cancelSetupField('responseStyle')}
                disabled={!responseStyleChanged}
                class="flex-1 py-1.5 bg-transparent border border-border text-text-primary rounded-xs text-xs font-bold
                       hover:bg-bg-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >Cancel</button>
            </div>
          </div>
        {/if}
      </div>

      {#if error}
        <p class="text-danger text-xs">{error}</p>
      {/if}
    </div>

    <!-- Actions -->
    <div class="p-4 border-t border-border bg-bg-surface space-y-2">
      <button
        onclick={handleTwinSave}
        disabled={!canSubmitTwin || saving}
        class="w-full py-2.5 rounded-lg font-medium text-sm transition-colors
               {canSubmitTwin && !saving
                 ? 'bg-text-primary text-bg hover:opacity-90'
                 : 'bg-bg-elevated text-text-muted border border-border cursor-not-allowed'}"
      >
        {saving ? 'Saving...' : 'Get started'}
      </button>
      <button
        onclick={handleSkip}
        class="w-full py-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        Skip for now
      </button>
    </div>
  {/if}
</div>

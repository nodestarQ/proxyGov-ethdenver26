<script lang="ts">
  import { wallet } from '$lib/stores/wallet.svelte';
  import { api } from '$lib/utils/api';
  import { truncateAddress } from '$lib/utils/format';

  interface Props {
    onComplete: (displayName: string, avatarUrl: string) => void;
  }
  let { onComplete }: Props = $props();

  const AVATARS = [
    '🦊', '🐺', '🦁', '🐸', '🐙',
    '🤖', '👾', '🛸', '🌀', '💎',
    '🔮', '🧿', '⚡', '🌿', '🎭',
    '🗿', '🏴‍☠️', '🧬', '🪐', '🎲',
  ];

  type Step = 'profile' | 'twin';
  let step = $state<Step>('profile');

  // Profile step
  let username = $state('');
  let selectedAvatar = $state('');
  let customAvatarUrl = $state('');
  let saving = $state(false);
  let error = $state('');

  const avatarPreview = $derived(customAvatarUrl || selectedAvatar);
  const canSubmitProfile = $derived(username.trim().length >= 2 && avatarPreview);

  // Twin step
  let personality = $state('');
  let interests = $state('');
  let responseStyle = $state('');
  const canSubmitTwin = $derived(personality.trim() !== '' && interests.trim() !== '' && responseStyle.trim() !== '');

  function selectAvatar(emoji: string) {
    selectedAvatar = emoji;
    customAvatarUrl = '';
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
      selectedAvatar = '';
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
        maxSwapSizeEth: 0.1,
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
          {step === 'profile' ? 'Set up your profile' : 'Your AI Twin'}
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
        <div class="w-20 h-20 rounded-full border-2 border-border bg-bg-surface flex items-center justify-center overflow-hidden">
          {#if customAvatarUrl}
            <img src={customAvatarUrl} alt="Avatar" class="w-full h-full object-cover" />
          {:else if selectedAvatar}
            <span class="text-4xl">{selectedAvatar}</span>
          {:else}
            <span class="text-text-muted text-sm">?</span>
          {/if}
        </div>
        <label class="text-xs text-text-muted underline cursor-pointer hover:text-text-secondary transition-colors">
          Upload photo
          <input type="file" accept="image/*" class="hidden" onchange={handleFileUpload} />
        </label>
      </div>

      <!-- Avatar Grid -->
      <div>
        <p class="text-xs text-text-muted mb-2">Or pick an avatar</p>
        <div class="grid grid-cols-5 gap-2">
          {#each AVATARS as emoji}
            <button
              onclick={() => selectAvatar(emoji)}
              class="w-full aspect-square rounded-lg border flex items-center justify-center text-2xl transition-all
                     {selectedAvatar === emoji
                       ? 'border-text-primary bg-text-primary/10 scale-110'
                       : 'border-border bg-bg-surface hover:bg-bg-hover'}"
            >
              {emoji}
            </button>
          {/each}
        </div>
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
    <div class="flex-1 overflow-y-auto px-5 py-6 space-y-5">
      <div class="text-center px-2">
        <p class="text-sm text-text-primary font-medium">Tell us about yourself</p>
        <p class="text-xs text-text-muted mt-1">This helps your AI Twin know how to represent you when you're away.</p>
      </div>

      <!-- Personality -->
      <div class="crt-border rounded-md p-4 bg-bg-surface">
        <label class="block text-sm font-medium text-text-primary mb-1">Personality</label>
        <p class="text-xs text-text-muted mb-2">How would you describe your vibe?</p>
        <textarea
          bind:value={personality}
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
        <p class="text-xs text-text-muted mb-2">Topics you care about - your twin will pay attention to these</p>
        <textarea
          bind:value={interests}
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
          bind:value={responseStyle}
          placeholder="e.g., Keep it short and data-driven. No fluff, just facts and numbers."
          rows="3"
          class="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm
                 text-text-primary placeholder:text-text-muted
                 focus:outline-none focus:border-accent/50 resize-none"
        ></textarea>
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

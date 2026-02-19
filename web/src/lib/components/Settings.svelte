<script lang="ts">
  import { wallet } from '$lib/stores/wallet.svelte';
  import { profile } from '$lib/stores/profile.svelte';
  import { api } from '$lib/utils/api';
  import { truncateAddress } from '$lib/utils/format';

  interface Props {
    onBack: () => void;
  }
  let { onBack }: Props = $props();

  const AVATARS = [
    '🦊', '🐺', '🦁', '🐸', '🐙',
    '🤖', '👾', '🛸', '🌀', '💎',
    '🔮', '🧿', '⚡', '🌿', '🎭',
    '🗿', '🏴‍☠️', '🧬', '🪐', '🎲',
  ];

  // Pre-populate from current profile
  let username = $state(profile.displayName);
  let selectedAvatar = $state(AVATARS.includes(profile.avatarUrl) ? profile.avatarUrl : '');
  let customAvatarUrl = $state(
    profile.avatarUrl && !AVATARS.includes(profile.avatarUrl) ? profile.avatarUrl : ''
  );
  let saving = $state(false);
  let saved = $state(false);
  let error = $state('');

  const avatarPreview = $derived(customAvatarUrl || selectedAvatar);
  const canSubmit = $derived(username.trim().length >= 2 && avatarPreview);

  function selectAvatar(emoji: string) {
    selectedAvatar = emoji;
    customAvatarUrl = '';
    saved = false;
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
    saved = false;
    const reader = new FileReader();
    reader.onload = () => {
      customAvatarUrl = reader.result as string;
      selectedAvatar = '';
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!canSubmit || !wallet.address) return;
    saving = true;
    error = '';
    saved = false;

    try {
      await api.updateUser(wallet.address, {
        displayName: username.trim(),
        avatarUrl: avatarPreview
      });
      profile.set(username.trim(), avatarPreview);
      saved = true;
    } catch (err: any) {
      error = err.message || 'Failed to save profile';
    } finally {
      saving = false;
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header with back button -->
  <header class="flex items-center gap-3 px-2 py-2.5 border-b border-border bg-bg-surface">
    <button
      onclick={onBack}
      class="p-1.5 -ml-0.5 rounded-md hover:bg-bg-hover transition-colors"
      aria-label="Back"
    >
      <svg class="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <h2 class="text-sm font-semibold text-text-primary">Settings</h2>
  </header>

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
        oninput={() => saved = false}
        placeholder="Enter a display name..."
        maxlength="24"
        class="w-full bg-bg-elevated border border-border rounded-lg px-4 py-2.5 text-sm
               text-text-primary placeholder:text-text-muted
               focus:outline-none focus:border-text-muted transition-colors"
      />
      <p class="text-[11px] text-text-muted mt-1">2-24 characters. This is how others will see you.</p>
    </div>

    <!-- Wallet Address -->
    <div>
      <p class="text-xs text-text-muted mb-1">Wallet</p>
      <p class="text-sm font-mono text-text-secondary">{truncateAddress(wallet.address!)}</p>
    </div>

    {#if error}
      <p class="text-danger text-xs">{error}</p>
    {/if}
  </div>

  <!-- Save -->
  <div class="p-4 border-t border-border bg-bg-surface">
    <button
      onclick={handleSave}
      disabled={!canSubmit || saving}
      class="w-full py-2.5 rounded-lg font-medium text-sm transition-colors
             {saved
               ? 'bg-bg-elevated text-text-muted border border-border'
               : canSubmit && !saving
                 ? 'bg-text-primary text-bg hover:opacity-90'
                 : 'bg-bg-elevated text-text-muted border border-border cursor-not-allowed'}"
    >
      {#if saving}
        Saving...
      {:else if saved}
        Saved
      {:else}
        Save changes
      {/if}
    </button>
  </div>
</div>

<script lang="ts">
  import { chat } from '$lib/stores/chat.svelte';

  let inputValue = $state('');

  function handleSend() {
    const content = inputValue.trim();
    if (!content) return;
    chat.sendMessage(content, content.startsWith('/') ? 'text' : undefined);
    inputValue = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
</script>

<div class="border-t border-border bg-bg-surface px-3 py-2">
  <div class="flex items-end gap-2">
    <textarea
      bind:value={inputValue}
      onkeydown={handleKeydown}
      placeholder="Message #{chat.activeChannel}..."
      rows="1"
      class="flex-1 bg-bg-elevated border border-border rounded-full px-4 py-2 text-sm
             text-text-primary placeholder:text-text-muted
             focus:outline-none focus:border-text-muted resize-none"
    ></textarea>
    <button
      onclick={handleSend}
      disabled={!inputValue.trim()}
      class="p-2 rounded-full transition-colors flex-shrink-0
             {inputValue.trim()
               ? 'bg-text-primary text-bg'
               : 'bg-bg-elevated text-text-muted border border-border'}"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</div>

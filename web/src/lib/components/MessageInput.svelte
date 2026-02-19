<script lang="ts">
  import { chat } from '$lib/stores/chat.svelte';

  let inputValue = $state('');

  function handleSend() {
    const content = inputValue.trim();
    if (!content) return;

    // Check for slash commands
    if (content.startsWith('/swap ')) {
      chat.sendMessage(content, 'text');
    } else if (content.startsWith('/price ')) {
      chat.sendMessage(content, 'text');
    } else if (content.startsWith('/poll ')) {
      chat.sendMessage(content, 'text');
    } else {
      chat.sendMessage(content);
    }
    inputValue = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
</script>

<div class="border-t border-border bg-bg-surface p-3">
  <div class="flex items-end gap-2">
    <div class="flex-1 relative">
      <textarea
        bind:value={inputValue}
        onkeydown={handleKeydown}
        placeholder="Message #{chat.activeChannel}... (try /swap ETH USDC 0.01)"
        rows="1"
        class="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm
               text-text-primary placeholder:text-text-muted
               focus:outline-none focus:border-accent/50 resize-none
               transition-colors"
      ></textarea>
    </div>
    <button
      onclick={handleSend}
      disabled={!inputValue.trim()}
      class="px-4 py-2 bg-accent/10 border border-accent/40 text-accent rounded-md text-sm font-medium
             hover:bg-accent hover:text-bg transition-colors
             disabled:opacity-30 disabled:cursor-not-allowed"
    >
      Send
    </button>
  </div>
  <div class="flex gap-3 mt-1.5 text-[10px] text-text-muted">
    <span>/swap TOKEN TOKEN AMT</span>
    <span>/price TOKEN</span>
    <span>/poll "Question?" Option1, Option2</span>
  </div>
</div>

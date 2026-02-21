<script lang="ts">
  import { chat } from '$lib/stores/chat.svelte';
  import { wallet } from '$lib/stores/wallet.svelte';

  let inputValue = $state('');
  let textareaEl = $state<HTMLTextAreaElement>();
  let mentionQuery = $state<string | null>(null);
  let mentionStartIndex = $state(0);
  let selectedIndex = $state(0);

  // Slash command autocomplete state
  let slashMode = $state<'command' | 'token-in' | 'token-out' | 'amount' | null>(null);
  let slashQuery = $state('');
  let slashSelectedIndex = $state(0);

  const SLASH_COMMANDS = [
    { name: 'swap', description: 'Propose a token swap for DAO vote' },
    { name: 'poll', description: 'Create a poll for the channel' },
    { name: 'price', description: 'Check token price' },
    { name: 'daobalance', description: 'Show DAO treasury balances' },
  ];

  const TOKENS = [
    { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000' },
    { symbol: 'WETH', address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' },
    { symbol: 'USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
    { symbol: 'UNI', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
  ];

  const filteredSlashItems = $derived.by(() => {
    if (slashMode === 'command') {
      return SLASH_COMMANDS.filter(c => c.name.startsWith(slashQuery.toLowerCase()));
    }
    if (slashMode === 'token-in' || slashMode === 'token-out') {
      return TOKENS.filter(t => t.symbol.toLowerCase().startsWith(slashQuery.toLowerCase()));
    }
    return [];
  });

  let typingTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastTypingSent = 0;

  const filteredMembers = $derived(
    mentionQuery !== null
      ? chat.members
          .filter(m => m.address !== wallet.address)
          .filter(m => m.displayName.toLowerCase().includes(mentionQuery!.toLowerCase()))
          .slice(0, 5)
      : []
  );

  function handleTyping() {
    const now = Date.now();
    if (now - lastTypingSent > 1000) {
      chat.notifyTyping(chat.activeChannel);
      lastTypingSent = now;
    }
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      chat.notifyStopTyping(chat.activeChannel);
      typingTimeout = null;
    }, 3000);
  }

  function stopTyping() {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }
    chat.notifyStopTyping(chat.activeChannel);
  }

  function updateMentionQuery() {
    if (!textareaEl) return;
    const pos = textareaEl.selectionStart;
    const textBefore = inputValue.slice(0, pos);
    // Find the last @ that isn't preceded by a non-space char
    const match = textBefore.match(/(^|[\s])@([^\s]*)$/);
    if (match) {
      mentionQuery = match[2];
      mentionStartIndex = textBefore.length - match[2].length - 1; // position of @
      selectedIndex = 0;
    } else {
      mentionQuery = null;
    }
  }

  function updateSlashState() {
    if (!textareaEl) return;
    const val = inputValue;
    const pos = textareaEl.selectionStart;

    // Only activate if input starts with /
    if (!val.startsWith('/')) {
      slashMode = null;
      return;
    }

    // Check if cursor is within the first word (command selection)
    const firstSpaceIdx = val.indexOf(' ');
    if (firstSpaceIdx === -1 || pos <= firstSpaceIdx) {
      // Still typing the command name
      slashMode = 'command';
      slashQuery = val.slice(1, pos); // strip leading /
      slashSelectedIndex = 0;
      return;
    }

    // Beyond first word — only /swap has token autocomplete
    if (!val.startsWith('/swap ')) {
      slashMode = null;
      return;
    }

    // Parse the arguments after "/swap "
    const afterSwap = val.slice(6); // after "/swap "
    const args = afterSwap.split(/\s+/).filter(Boolean);
    const endsWithSpace = afterSwap.endsWith(' ');

    // Determine which argument position we're at
    const completedArgs = endsWithSpace ? args.length : Math.max(0, args.length - 1);
    const isTyping = !endsWithSpace && args.length > 0;

    if (completedArgs === 0) {
      // No completed args — typing (or about to type) token-in
      slashMode = 'token-in';
      slashQuery = isTyping ? args[0] : '';
      slashSelectedIndex = 0;
    } else if (completedArgs === 1 && !isTyping) {
      // 1 completed arg, cursor after space — amount field, show hint
      slashMode = 'amount';
      slashQuery = '';
    } else if (completedArgs === 1 && isTyping) {
      // Typing the amount — show hint
      slashMode = 'amount';
      slashQuery = args[1] || '';
    } else if (completedArgs === 2) {
      // 2 completed args (token-in + amount) — typing or about to type token-out
      slashMode = 'token-out';
      slashQuery = isTyping ? args[args.length - 1] : '';
      slashSelectedIndex = 0;
    } else {
      slashMode = null;
    }
  }

  function selectSlashCommand(name: string) {
    inputValue = `/${name} `;
    slashMode = null;
    tick().then(() => {
      if (textareaEl) {
        const pos = inputValue.length;
        textareaEl.selectionStart = pos;
        textareaEl.selectionEnd = pos;
        textareaEl.focus();
        updateSlashState();
      }
    });
  }

  function selectSlashToken(address: string) {
    const parts = inputValue.split(/\s+/);
    const endsWithSpace = inputValue.endsWith(' ');

    if (endsWithSpace) {
      inputValue = inputValue + address + ' ';
    } else {
      parts[parts.length - 1] = address;
      inputValue = parts.join(' ') + ' ';
    }

    slashMode = null;
    tick().then(() => {
      if (textareaEl) {
        const pos = inputValue.length;
        textareaEl.selectionStart = pos;
        textareaEl.selectionEnd = pos;
        textareaEl.focus();
        updateSlashState();
      }
    });
  }

  function selectMention(displayName: string) {
    const before = inputValue.slice(0, mentionStartIndex);
    const after = inputValue.slice(mentionStartIndex + 1 + (mentionQuery?.length ?? 0));
    inputValue = `${before}@${displayName} ${after}`;
    mentionQuery = null;
    // Refocus and set cursor after inserted mention
    tick().then(() => {
      if (textareaEl) {
        const cursorPos = before.length + 1 + displayName.length + 1;
        textareaEl.selectionStart = cursorPos;
        textareaEl.selectionEnd = cursorPos;
        textareaEl.focus();
      }
    });
  }

  function handleSend() {
    const content = inputValue.trim();
    if (!content) return;
    stopTyping();
    chat.sendMessage(content, content.startsWith('/') ? 'text' : undefined);
    inputValue = '';
    mentionQuery = null;
    slashMode = null;
  }

  function handleKeydown(e: KeyboardEvent) {
    // Slash command autocomplete takes priority
    if (slashMode !== null && filteredSlashItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        slashSelectedIndex = (slashSelectedIndex + 1) % filteredSlashItems.length;
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        slashSelectedIndex = (slashSelectedIndex - 1 + filteredSlashItems.length) % filteredSlashItems.length;
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const item = filteredSlashItems[slashSelectedIndex];
        if (slashMode === 'command') {
          selectSlashCommand((item as typeof SLASH_COMMANDS[number]).name);
        } else {
          selectSlashToken((item as typeof TOKENS[number]).address);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        slashMode = null;
        return;
      }
    }

    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % filteredMembers.length;
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + filteredMembers.length) % filteredMembers.length;
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        selectMention(filteredMembers[selectedIndex].displayName);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        mentionQuery = null;
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Svelte 5 doesn't have tick as auto-import, import it
  import { tick } from 'svelte';
</script>

<div class="border-t border-border bg-bg-surface px-3 py-2 relative">
  <!-- Slash command autocomplete dropdown -->
  {#if slashMode !== null && (filteredSlashItems.length > 0 || slashMode === 'amount')}
    <div class="absolute bottom-full left-3 right-3 mb-1 bg-bg-elevated border border-border rounded-lg shadow-md overflow-hidden z-10">
      {#if slashMode === 'command'}
        {#each filteredSlashItems as item, i}
          {@const cmd = item as typeof SLASH_COMMANDS[number]}
          <button
            class="w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors
                   {i === slashSelectedIndex ? 'bg-bg-hover' : 'hover:bg-bg-hover'}"
            onpointerdown={(e) => { e.preventDefault(); selectSlashCommand(cmd.name); }}
          >
            <span class="font-mono text-text-accent font-medium">/{cmd.name}</span>
            <span class="text-text-muted text-xs">{cmd.description}</span>
          </button>
        {/each}
      {:else if slashMode === 'amount'}
        <div class="px-3 py-2 flex items-center gap-2 text-sm text-text-muted">
          <span class="font-mono">0.01</span>
          <span class="text-xs">Enter swap amount</span>
        </div>
      {:else}
        {#each filteredSlashItems as item, i}
          {@const token = item as typeof TOKENS[number]}
          <button
            class="w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors
                   {i === slashSelectedIndex ? 'bg-bg-hover' : 'hover:bg-bg-hover'}"
            onpointerdown={(e) => { e.preventDefault(); selectSlashToken(token.address); }}
          >
            <span class="text-text-primary font-bold">{token.symbol}</span>
            <span class="font-mono text-text-muted text-xs ml-auto">{token.address.slice(0, 6)}...{token.address.slice(-4)}</span>
          </button>
        {/each}
      {/if}
    </div>
  {/if}

  <!-- Mention autocomplete dropdown -->
  {#if mentionQuery !== null && filteredMembers.length > 0}
    <div class="absolute bottom-full left-3 right-3 mb-1 bg-bg-elevated border border-border rounded-lg shadow-md overflow-hidden z-10">
      {#each filteredMembers as member, i}
        <button
          class="w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors
                 {i === selectedIndex ? 'bg-bg-hover' : 'hover:bg-bg-hover'}"
          onpointerdown={(e) => { e.preventDefault(); selectMention(member.displayName); }}
        >
          {#if member.avatarUrl}
            {#if member.avatarUrl.length <= 4}
              <span class="w-6 h-6 flex items-center justify-center rounded-full bg-bg-surface text-sm">{member.avatarUrl}</span>
            {:else}
              <img src={member.avatarUrl} alt="" class="w-6 h-6 rounded-full object-cover" />
            {/if}
          {:else}
            <span class="w-6 h-6 flex items-center justify-center rounded-full bg-bg-surface text-xs font-medium">
              {member.displayName.charAt(0).toUpperCase()}
            </span>
          {/if}
          <span class="text-text-primary font-medium">{member.displayName}</span>
          <span class="text-text-muted text-xs ml-auto">{member.address.slice(0, 6)}...{member.address.slice(-4)}</span>
        </button>
      {/each}
    </div>
  {/if}

  <div class="flex items-end gap-2">
    <textarea
      bind:this={textareaEl}
      bind:value={inputValue}
      oninput={() => { updateMentionQuery(); updateSlashState(); handleTyping(); }}
      onkeydown={handleKeydown}
      onclick={() => { updateMentionQuery(); updateSlashState(); }}
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

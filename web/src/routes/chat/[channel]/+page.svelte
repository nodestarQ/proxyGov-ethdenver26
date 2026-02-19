<script lang="ts">
  import { page } from '$app/state';
  import { chat } from '$lib/stores/chat.svelte';
  import ChatWindow from '$lib/components/ChatWindow.svelte';

  $effect(() => {
    const channel = page.params.channel;
    if (channel && channel !== chat.activeChannel) {
      chat.setActiveChannel(channel);
    }
  });
</script>

<ChatWindow />

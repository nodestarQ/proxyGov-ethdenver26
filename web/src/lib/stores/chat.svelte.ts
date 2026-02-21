import type { Message, User, Channel, SummaryPayload } from '../../../../shared/types.js';
import { getSocket } from '../utils/socket-client.js';
import { DEFAULT_CHANNELS } from '../utils/constants.js';

interface ChatState {
  messages: Message[];
  channels: Channel[];
  activeChannel: string;
  members: User[];
  loading: boolean;
  unreadCounts: Record<string, number>;
  catchUpSummaries: Record<string, SummaryPayload | null>;
  catchUpLoading: Record<string, boolean>;
  catchUpExpanded: Record<string, boolean>;
}

let state = $state<ChatState>({
  messages: [],
  channels: DEFAULT_CHANNELS.map(c => ({ ...c, members: [], createdAt: new Date().toISOString() })),
  activeChannel: 'general',
  members: [],
  loading: false,
  unreadCounts: {},
  catchUpSummaries: {},
  catchUpLoading: {},
  catchUpExpanded: {}
});

let socketBound = false;
let viewingChat = false;

export const chat = {
  get messages() { return state.messages.filter(m => m.channelId === state.activeChannel); },
  get allMessages() { return state.messages; },
  get channels() { return state.channels; },
  get activeChannel() { return state.activeChannel; },
  get members() { return state.members; },
  get loading() { return state.loading; },
  get unreadCounts() { return state.unreadCounts; },
  get catchUpSummaries() { return state.catchUpSummaries; },
  get catchUpLoading() { return state.catchUpLoading; },
  get catchUpExpanded() { return state.catchUpExpanded; },

  setCatchUpLoading(channelId: string, loading: boolean) {
    state.catchUpLoading = { ...state.catchUpLoading, [channelId]: loading };
  },

  setCatchUpSummary(channelId: string, summary: SummaryPayload | null) {
    state.catchUpSummaries = { ...state.catchUpSummaries, [channelId]: summary };
  },

  toggleCatchUpExpanded(channelId: string) {
    state.catchUpExpanded = { ...state.catchUpExpanded, [channelId]: !state.catchUpExpanded[channelId] };
  },

  collapseCatchUp(channelId: string) {
    state.catchUpExpanded = { ...state.catchUpExpanded, [channelId]: false };
  },

  setViewingChat(viewing: boolean) {
    viewingChat = viewing;
    if (viewing) {
      // Clear unread for the channel being viewed
      state.unreadCounts = { ...state.unreadCounts, [state.activeChannel]: 0 };
    }
  },

  setActiveChannel(channelId: string) {
    state.activeChannel = channelId;
    state.unreadCounts = { ...state.unreadCounts, [channelId]: 0 };
    const socket = getSocket();
    socket.emit('channel:join', channelId);
  },

  sendMessage(content: string, type: 'text' | 'swap-proposal' | 'poll' | 'summary' | 'opportunity' | 'system' = 'text') {
    const socket = getSocket();
    socket.emit('message:send', {
      channelId: state.activeChannel,
      content,
      type
    });
  },

  addSignal(messageId: string, vote: 'up' | 'down') {
    const socket = getSocket();
    socket.emit('message:signal', { messageId, vote });
  },

  bindSocket() {
    if (socketBound) return;
    const socket = getSocket();

    socket.on('message:new', (message) => {
      state.messages = [...state.messages, message];
      // Count as unread unless we're currently viewing that channel's chat
      const isViewing = viewingChat && message.channelId === state.activeChannel;
      if (!isViewing) {
        state.unreadCounts = {
          ...state.unreadCounts,
          [message.channelId]: (state.unreadCounts[message.channelId] ?? 0) + 1
        };
      }
    });

    socket.on('message:signal', ({ messageId, vote, address, action }) => {
      state.messages = state.messages.map(m => {
        if (m.id !== messageId) return m;
        const signal = { ...m.signal, up: [...m.signal.up], down: [...m.signal.down] };
        if (action === 'remove') {
          signal[vote] = signal[vote].filter(a => a !== address);
        } else {
          // Remove from opposite first
          const opposite = vote === 'up' ? 'down' : 'up';
          signal[opposite] = signal[opposite].filter(a => a !== address);
          if (!signal[vote].includes(address)) signal[vote].push(address);
        }
        return { ...m, signal };
      });
    });

    socket.on('user:join', (user) => {
      state.members = [...state.members.filter(m => m.address !== user.address), user];
    });

    socket.on('user:leave', (address) => {
      // Keep twin-enabled users in the list (their twin is still active)
      state.members = state.members.filter(m => m.address !== address || m.twinEnabled);
    });

    socket.on('user:status', ({ address, status }) => {
      state.members = state.members.map(m =>
        m.address === address ? { ...m, status } : m
      );
    });

    socket.on('channel:members', ({ channelId, members }) => {
      if (channelId === state.activeChannel) {
        state.members = members;
      }
    });

    socketBound = true;
  },

  loadMessages(messages: Message[]) {
    // Merge, avoiding duplicates
    const existing = new Set(state.messages.map(m => m.id));
    const newMsgs = messages.filter(m => !existing.has(m.id));
    state.messages = [...state.messages, ...newMsgs];
  }
};

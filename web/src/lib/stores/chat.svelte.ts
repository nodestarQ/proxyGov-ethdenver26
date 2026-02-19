import type { Message, User, Channel } from '../../../../shared/types.js';
import { getSocket } from '../utils/socket-client.js';
import { DEFAULT_CHANNELS } from '../utils/constants.js';

interface ChatState {
  messages: Message[];
  channels: Channel[];
  activeChannel: string;
  members: User[];
  loading: boolean;
  unreadCounts: Record<string, number>;
}

let state = $state<ChatState>({
  messages: [],
  channels: DEFAULT_CHANNELS.map(c => ({ ...c, members: [], createdAt: new Date().toISOString() })),
  activeChannel: 'general',
  members: [],
  loading: false,
  unreadCounts: {}
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

  addReaction(messageId: string, emoji: string) {
    const socket = getSocket();
    socket.emit('message:react', { messageId, emoji });
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

    socket.on('message:reaction', ({ messageId, emoji, address, action }) => {
      state.messages = state.messages.map(m => {
        if (m.id !== messageId) return m;
        const reactions = { ...m.reactions };
        const list = reactions[emoji] ? [...reactions[emoji]] : [];
        if (action === 'add' && !list.includes(address)) {
          list.push(address);
        } else if (action === 'remove') {
          const idx = list.indexOf(address);
          if (idx >= 0) list.splice(idx, 1);
        }
        reactions[emoji] = list;
        return { ...m, reactions };
      });
    });

    socket.on('user:join', (user) => {
      state.members = [...state.members.filter(m => m.address !== user.address), user];
    });

    socket.on('user:leave', (address) => {
      state.members = state.members.filter(m => m.address !== address);
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

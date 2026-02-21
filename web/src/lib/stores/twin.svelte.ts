import type { TwinConfig, TwinStatus } from '../../../../shared/types.js';
import { api } from '../utils/api.js';
import { getSocket } from '../utils/socket-client.js';

interface TwinState {
  config: TwinConfig | null;
  savedConfig: TwinConfig | null;
  status: TwinStatus | null;
  loading: boolean;
  saving: boolean;
}

let state = $state<TwinState>({
  config: null,
  savedConfig: null,
  status: null,
  loading: false,
  saving: false
});

let socketBound = false;

export const twin = {
  get config() { return state.config; },
  get status() { return state.status; },
  get loading() { return state.loading; },
  get saving() { return state.saving; },
  get enabled() { return state.config?.enabled ?? false; },
  get hasChanges() {
    if (!state.config || !state.savedConfig) return false;
    return state.config.personality !== state.savedConfig.personality
      || state.config.interests !== state.savedConfig.interests
      || state.config.responseStyle !== state.savedConfig.responseStyle
      || state.config.autonomousCapUsd !== state.savedConfig.autonomousCapUsd;
  },

  async load(address: string) {
    state.loading = true;
    try {
      state.config = await api.getTwinConfig(address);
      state.savedConfig = { ...state.config };
    } catch {
      // No config yet - use defaults
      state.config = {
        ownerAddress: address,
        enabled: false,
        personality: '',
        interests: '',
        responseStyle: '',
        autonomousCapUsd: 100,
        autoSummarize: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.savedConfig = { ...state.config };
    } finally {
      state.loading = false;
    }
  },

  async save(address: string) {
    if (!state.config) return;
    state.saving = true;
    try {
      state.config = await api.updateTwinConfig(address, state.config);
      state.savedConfig = { ...state.config };
    } finally {
      state.saving = false;
    }
  },

  updateField<K extends keyof TwinConfig>(key: K, value: TwinConfig[K]) {
    if (!state.config) return;
    state.config = { ...state.config, [key]: value, updatedAt: new Date().toISOString() };
  },

  bindSocket() {
    if (socketBound) return;
    const socket = getSocket();
    socket.on('twin:status', (status) => {
      state.status = status;
    });
    socketBound = true;
  }
};

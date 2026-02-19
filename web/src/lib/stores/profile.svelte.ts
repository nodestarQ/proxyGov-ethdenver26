let state = $state<{ displayName: string; avatarUrl: string }>({
  displayName: '',
  avatarUrl: ''
});

export const profile = {
  get displayName() { return state.displayName; },
  get avatarUrl() { return state.avatarUrl; },

  set(displayName: string, avatarUrl: string) {
    state.displayName = displayName;
    state.avatarUrl = avatarUrl;
  }
};

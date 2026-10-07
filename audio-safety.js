// Audio safety: keeps sound opt-in and prevents runaway audio nodes.
(() => {
  const state = {
    enabled: false,
    ctx: null,
    master: null,
    lastPlayed: new Map(),
  };

  function ensureContext() {
    if (!state.ctx) {
      state.ctx = new (window.AudioContext || window.webkitAudioContext)();
      state.master = state.ctx.createGain();
      state.master.gain.value = 0.035;
      state.master.connect(state.ctx.destination);
    }
    if (state.ctx.state === 'suspended') state.ctx.resume();
  }

  function canPlay(key, cooldown = 900) {
    const now = performance.now();
    const last = state.lastPlayed.get(key) || 0;
    if (now - last < cooldown) return false;
    state.lastPlayed.set(key, now);
    return true;
  }

  function chirp({ frequency = 440, duration = 0.12, type = 'sine', key = 'default' } = {}) {
    if (!state.enabled || !canPlay(key)) return;
    ensureContext();

    const osc = state.ctx.createOscillator();
    const gain = state.ctx.createGain();
    const now = state.ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(state.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  window.AudioSafety = {
    enable() {
      state.enabled = true;
      ensureContext();
    },
    disable() {
      state.enabled = false;
      if (state.ctx) state.ctx.suspend();
    },
    chirp,
    get enabled() {
      return state.enabled;
    },
  };
})();

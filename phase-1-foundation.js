// Synapse Reef v2 Phase 1 foundation: deterministic randomness, fixed-step time,
// bounded event history, and runtime diagnostics. Presentation remains a consumer.
(() => {
  const MAX_EVENTS = 240;
  const DEFAULT_SEED = 482901;
  let state;

  function hashSeed(value) {
    const text = String(value ?? DEFAULT_SEED);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRandom(seed) {
    let value = hashSeed(seed) || 1;
    return () => {
      value += 0x6D2B79F5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function create(options = {}) {
    const seed = options.seed ?? DEFAULT_SEED;
    state = {
      seed,
      random: createRandom(seed),
      tick: 0,
      elapsed: 0,
      accumulator: 0,
      fixedStep: options.fixedStep ?? 1 / 30,
      maxSubSteps: options.maxSubSteps ?? 5,
      running: true,
      speed: 1,
      events: [],
      nextEntityId: 1,
      metrics: {
        frames: 0,
        frameMs: 0,
        droppedSteps: 0,
        births: 0,
        deaths: 0,
      },
    };
    return api;
  }

  function record(type, payload = {}) {
    if (!state) return null;
    const event = {
      id: `${state.tick}-${state.events.length + 1}`,
      tick: state.tick,
      time: Number(state.elapsed.toFixed(4)),
      type,
      ...payload,
    };
    state.events.push(event);
    if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
    if (type === 'birth') state.metrics.births += 1;
    if (type === 'death') state.metrics.deaths += 1;
    return event;
  }

  function advance(realDelta, update) {
    if (!state) return 0;
    const frameStart = performance.now();
    const delta = Math.min(Math.max(realDelta, 0), 0.25) * state.speed;
    state.metrics.frames += 1;
    state.metrics.frameMs = performance.now() - frameStart;
    if (!state.running) return 0;

    state.accumulator += delta;
    let steps = 0;
    while (state.accumulator >= state.fixedStep && steps < state.maxSubSteps) {
      state.tick += 1;
      state.elapsed += state.fixedStep;
      update(state.fixedStep, state);
      state.accumulator -= state.fixedStep;
      steps += 1;
    }
    if (state.accumulator >= state.fixedStep) {
      state.accumulator = 0;
      state.metrics.droppedSteps += 1;
      record('clock_drop', { reason: 'substep_limit' });
    }
    state.metrics.frameMs = performance.now() - frameStart;
    return steps;
  }

  function reset(seed = state?.seed ?? DEFAULT_SEED) {
    return create({ seed, fixedStep: state?.fixedStep, maxSubSteps: state?.maxSubSteps });
  }

  const api = {
    create,
    reset,
    advance,
    record,
    random: () => state?.random?.() ?? Math.random(),
    nextEntityId: (kind = 'entity') => `${kind}-${state.nextEntityId++}`,
    setRunning: (value) => { state.running = Boolean(value); },
    toggleRunning: () => { state.running = !state.running; return state.running; },
    setSpeed: (value) => { state.speed = Math.max(0.05, Math.min(8, Number(value) || 1)); },
    step: (update) => {
      if (!state) return;
      state.tick += 1;
      state.elapsed += state.fixedStep;
      update(state.fixedStep, state);
    },
    snapshot: () => ({
      seed: state.seed,
      tick: state.tick,
      elapsed: state.elapsed,
      fixedStep: state.fixedStep,
      running: state.running,
      speed: state.speed,
      eventCount: state.events.length,
      metrics: { ...state.metrics },
    }),
    events: () => state?.events.slice() ?? [],
  };

  window.SynapseFoundation = api;
  create();
})();

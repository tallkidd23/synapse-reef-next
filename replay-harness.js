// Deterministic replay checks for Synapse Reef v2 Phase 1.
(() => {
  const DEFAULT_SEED = 482901;
  const DEFAULT_STEPS = 900;

  function run(seed = DEFAULT_SEED, steps = DEFAULT_STEPS) {
    const foundation = window.SynapseFoundation;
    foundation.create({ seed });
    const values = [];
    for (let i = 0; i < steps; i += 1) {
      values.push(Number(foundation.random().toFixed(12)));
      foundation.step(() => {});
    }
    const snapshot = foundation.snapshot();
    return {
      seed,
      steps,
      randomTrace: values,
      snapshot,
      eventTrace: foundation.events(),
      fingerprint: foundation.fingerprint({ seed, values, snapshot }),
    };
  }

  function compare(left, right) {
    return {
      sameSeed: left.seed === right.seed,
      sameRandomTrace: foundationEqual(left.randomTrace, right.randomTrace),
      sameSnapshot: foundationEqual(left.snapshot, right.snapshot),
      sameEvents: foundationEqual(left.eventTrace, right.eventTrace),
      sameFingerprint: left.fingerprint === right.fingerprint,
    };
  }

  function foundationEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function verify(options = {}) {
    const seed = options.seed ?? DEFAULT_SEED;
    const steps = options.steps ?? DEFAULT_STEPS;
    const first = run(seed, steps);
    const second = run(seed, steps);
    const alternate = run(seed + 1, steps);
    const identical = compare(first, second);
    const divergent = first.fingerprint !== alternate.fingerprint;
    const bounded = first.eventTrace.length <= 240;
    return {
      seed,
      steps,
      identical,
      divergent,
      bounded,
      passed: Object.values(identical).every(Boolean) && divergent && bounded,
      first,
      second,
      alternate,
    };
  }

  window.SynapseReplay = { run, compare, verify };
})();

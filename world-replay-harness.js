// Headless deterministic ecology replay for the current Synapse Reef v2 rules.
(() => {
  const TAU = Math.PI * 2;
  const DEFAULT_SEED = 482901;
  const DEFAULT_TICKS = 1800;

  function createWorld(seed) {
    const foundation = window.SynapseFoundation;
    foundation.create({ seed, fixedStep: 1 / 30 });
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const rand = (min, max) => foundation.random() * (max - min) + min;
    const world = {
      width: 1100,
      height: 570,
      time: 0,
      day: 1,
      temperature: 24,
      plants: [],
      herbivores: [],
    };

    const makePlant = () => ({
      id: foundation.nextEntityId('plant'), x: rand(20, world.width - 20), y: rand(80, world.height - 20),
      size: rand(6, 14), growth: rand(0.35, 1), hue: rand(100, 145), age: 0, maxAge: rand(45, 90),
    });
    const makeHerbivore = () => ({
      id: foundation.nextEntityId('grazer'), x: rand(20, world.width - 20), y: rand(90, world.height - 30),
      size: rand(5, 9), energy: rand(0.55, 1), speed: rand(12, 25), hue: rand(25, 55),
      age: rand(0, 20), maxAge: rand(90, 180), direction: rand(0, TAU), turnTimer: rand(0.5, 3),
    });

    world.plants = Array.from({ length: 38 }, makePlant);
    world.herbivores = Array.from({ length: 9 }, makeHerbivore);

    function step(dt) {
      world.time += dt;
      world.day += dt / 12;
      world.temperature = 24 + Math.sin(world.time / 9) * 2.2;
      let feedingCount = 0;

      for (const plant of world.plants) {
        plant.age += dt;
        plant.growth = clamp(plant.growth + dt * 0.012, 0, 1);
        plant.size += dt * 0.03 * plant.growth;
      }

      for (const herbivore of world.herbivores) {
        herbivore.age += dt;
        herbivore.energy -= dt * 0.006;
        herbivore.turnTimer -= dt;
        if (herbivore.turnTimer <= 0) {
          herbivore.direction += rand(-0.9, 0.9);
          herbivore.turnTimer = rand(0.5, 2.5);
        }
        herbivore.x = clamp(herbivore.x + Math.cos(herbivore.direction) * herbivore.speed * dt, 18, world.width - 18);
        herbivore.y = clamp(herbivore.y + Math.sin(herbivore.direction) * herbivore.speed * dt, 78, world.height - 18);

        const nearby = world.plants.find((plant) => Math.hypot(plant.x - herbivore.x, plant.y - herbivore.y) < 18);
        if (nearby && nearby.growth > 0.25) {
          nearby.growth = clamp(nearby.growth - dt * 0.08, 0.08, 1);
          herbivore.energy = clamp(herbivore.energy + dt * 0.03, 0, 1);
          feedingCount += 1;
        }

        if (herbivore.energy > 0.88 && foundation.random() < dt * 0.002 && world.herbivores.length < 24) {
          world.herbivores.push(makeHerbivore());
          herbivore.energy *= 0.55;
        }
      }

      if (feedingCount) foundation.record('feeding', { count: feedingCount });
      world.plants = world.plants.filter((plant) => plant.age < plant.maxAge && plant.growth > 0.03);
      if (foundation.random() < dt * 0.035 && world.plants.length < 80) world.plants.push(makePlant());
      world.herbivores = world.herbivores.filter((herbivore) => herbivore.age < herbivore.maxAge && herbivore.energy > 0);
    }

    return { world, step };
  }

  function canonicalWorld(world) {
    return {
      time: Number(world.time.toFixed(6)),
      day: Number(world.day.toFixed(6)),
      temperature: Number(world.temperature.toFixed(6)),
      plants: world.plants.map((entity) => ({ ...entity })).sort((a, b) => a.id.localeCompare(b.id)),
      herbivores: world.herbivores.map((entity) => ({ ...entity })).sort((a, b) => a.id.localeCompare(b.id)),
    };
  }

  function run(seed = DEFAULT_SEED, ticks = DEFAULT_TICKS) {
    const simulation = createWorld(seed);
    for (let tick = 0; tick < ticks; tick += 1) {
      simulation.step(1 / 30);
      simulation.world.tick = tick + 1;
    }
    const foundation = window.SynapseFoundation;
    const state = canonicalWorld(simulation.world);
    return {
      seed,
      ticks,
      state,
      fingerprint: foundation.fingerprint(state),
      events: foundation.events(),
      finite: Number.isFinite(simulation.world.time)
        && Number.isFinite(simulation.world.day)
        && simulation.world.plants.every((entity) => Object.values(entity).every(Number.isFinite))
        && simulation.world.herbivores.every((entity) => Object.values(entity).every(Number.isFinite)),
    };
  }

  function verify(options = {}) {
    const seed = options.seed ?? DEFAULT_SEED;
    const ticks = options.ticks ?? DEFAULT_TICKS;
    const first = run(seed, ticks);
    const second = run(seed, ticks);
    const alternate = run(seed + 1, ticks);
    const sameState = first.fingerprint === second.fingerprint;
    const sameEvents = JSON.stringify(first.events) === JSON.stringify(second.events);
    const diverges = first.fingerprint !== alternate.fingerprint;
    const bounded = first.events.length <= 240;
    const finite = first.finite && second.finite && alternate.finite;
    return {
      seed, ticks, sameState, sameEvents, diverges, bounded, finite,
      passed: sameState && sameEvents && diverges && bounded && finite,
      first, second, alternate,
    };
  }

  window.SynapseWorldReplay = { createWorld, run, verify };
})();

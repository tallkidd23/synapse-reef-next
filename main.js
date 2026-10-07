const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
const chronicleEl = document.getElementById('chronicle');
const toggleBtn = document.getElementById('toggleBtn');
const stepBtn = document.getElementById('stepBtn');
const resetBtn = document.getElementById('resetBtn');
const soundBtn = document.getElementById('soundBtn');
const speedRange = document.getElementById('speedRange');
const diagnosticsBtn = document.getElementById('diagnosticsBtn');
const diagnosticsEl = document.getElementById('diagnostics');

const stats = {
  day: document.getElementById('dayStat'),
  plants: document.getElementById('plantStat'),
  herbivores: document.getElementById('herbivoreStat'),
  temp: document.getElementById('tempStat'),
};

const diagnosticStats = {
  seed: document.getElementById('seedDiag'),
  tick: document.getElementById('tickDiag'),
  elapsed: document.getElementById('elapsedDiag'),
  frame: document.getElementById('frameDiag'),
  events: document.getElementById('eventsDiag'),
  drops: document.getElementById('dropsDiag'),
};

let world;
let lastTime = performance.now();
let speed = 1;

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const pick = (array) => array[Math.floor(SynapseFoundation.random() * array.length)];
const rand = (min, max) => SynapseFoundation.random() * (max - min) + min;

function resize() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (world) {
    world.width = rect.width;
    world.height = rect.height;
  }
}

function makePlant(x = rand(20, world.width - 20), y = rand(80, world.height - 20)) {
  return {
    id: SynapseFoundation.nextEntityId('plant'),
    x, y,
    size: rand(6, 14),
    growth: rand(0.35, 1),
    hue: rand(100, 145),
    age: 0,
    maxAge: rand(45, 90),
  };
}

function makeHerbivore() {
  return {
    id: SynapseFoundation.nextEntityId('grazer'),
    x: rand(20, world.width - 20),
    y: rand(90, world.height - 30),
    size: rand(5, 9),
    energy: rand(0.55, 1),
    speed: rand(12, 25),
    hue: rand(25, 55),
    age: rand(0, 20),
    maxAge: rand(90, 180),
    direction: rand(0, TAU),
    turnTimer: rand(0.5, 3),
  };
}

function reset(seed = 482901) {
  SynapseFoundation.create({ seed });
  world = {
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    time: 0,
    day: 1,
    temperature: 24,
    plants: Array.from({ length: 38 }, () => makePlant()),
    herbivores: Array.from({ length: 9 }, makeHerbivore),
    chronicle: [
      { day: 1, text: 'The habitat wakes beneath a soft green light.' },
      { day: 1, text: 'Nine grazers begin mapping the young growth.' },
    ],
  };
  SynapseFoundation.record('reset', { seed });
  renderChronicle();
}

function addChronicle(text, type = 'chronicle') {
  world.chronicle.unshift({ day: Math.floor(world.day), text });
  world.chronicle = world.chronicle.slice(0, 8);
  SynapseFoundation.record(type, { text });
  renderChronicle();
}

function renderChronicle() {
  chronicleEl.innerHTML = world.chronicle
    .map((entry) => `<li><span>Day ${entry.day}</span>${entry.text}</li>`)
    .join('');
}

function simulate(dt) {
  world.time += dt;
  world.day += dt / 12;
  world.temperature = 24 + Math.sin(world.time / 9) * 2.2;

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

    herbivore.x += Math.cos(herbivore.direction) * herbivore.speed * dt;
    herbivore.y += Math.sin(herbivore.direction) * herbivore.speed * dt;
    herbivore.x = clamp(herbivore.x, 18, world.width - 18);
    herbivore.y = clamp(herbivore.y, 78, world.height - 18);

    const nearby = world.plants.find((plant) => Math.hypot(plant.x - herbivore.x, plant.y - herbivore.y) < 18);
    if (nearby && nearby.growth > 0.25) {
      nearby.growth = clamp(nearby.growth - dt * 0.08, 0.08, 1);
      herbivore.energy = clamp(herbivore.energy + dt * 0.03, 0, 1);
      SynapseFoundation.record('feeding', { actor: herbivore.id, target: nearby.id });
    }

    if (herbivore.energy > 0.88 && SynapseFoundation.random() < dt * 0.002 && world.herbivores.length < 24) {
      const offspring = makeHerbivore();
      world.herbivores.push(offspring);
      herbivore.energy *= 0.55;
      addChronicle('A new grazer joins the moving constellation.', 'birth');
      SynapseFoundation.record('birth', { parent: herbivore.id, child: offspring.id });
      AudioSafety.chirp({ frequency: 620, key: 'birth' });
    }
  }

  const beforePlants = world.plants.length;
  world.plants = world.plants.filter((plant) => plant.age < plant.maxAge && plant.growth > 0.03);
  if (world.plants.length < beforePlants) addChronicle('A patch of old growth returns to the soil.', 'death');

  if (SynapseFoundation.random() < dt * 0.035 && world.plants.length < 80) {
    const plant = makePlant();
    world.plants.push(plant);
    SynapseFoundation.record('plant_growth', { entity: plant.id });
  }

  const beforeHerbivores = world.herbivores.length;
  world.herbivores = world.herbivores.filter((herbivore) => herbivore.age < herbivore.maxAge && herbivore.energy > 0);
  if (world.herbivores.length < beforeHerbivores) addChronicle('One quiet life-cycle closes beneath the canopy.', 'death');

  if (Math.floor(world.day) !== Math.floor(world.day - dt / 12)) {
    addChronicle(pick([
      'The waterline holds steady through another day.',
      'Feeding trails begin to appear between the older plants.',
      'The habitat settles into a warmer rhythm.',
    ]));
  }
}

function drawBackground(width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#102d22');
  gradient.addColorStop(0.62, '#0a2119');
  gradient.addColorStop(1, '#06130e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(75, 154, 112, 0.08)';
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.ellipse(width * (i / 7), height * 0.45, 90, 26, 0, 0, TAU);
    ctx.fill();
  }
}

function drawPlant(plant) {
  ctx.save();
  ctx.translate(plant.x, plant.y);
  ctx.strokeStyle = `hsl(${plant.hue} 46% 52% / ${0.5 + plant.growth * 0.5})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.quadraticCurveTo(-3, -plant.size * 0.3, 0, -plant.size);
  ctx.stroke();

  ctx.fillStyle = `hsl(${plant.hue} 58% ${31 + plant.growth * 17}%)`;
  for (let i = 0; i < 3; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    ctx.beginPath();
    ctx.ellipse(side * (3 + i), -plant.size * (0.25 + i * 0.2), 5 + plant.size * 0.12, 2.5, side * 0.45, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawHerbivore(herbivore) {
  ctx.save();
  ctx.translate(herbivore.x, herbivore.y);
  ctx.rotate(herbivore.direction);
  ctx.fillStyle = `hsl(${herbivore.hue} 67% ${43 + herbivore.energy * 18}%)`;
  ctx.beginPath();
  ctx.ellipse(0, 0, herbivore.size * 1.45, herbivore.size, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f4e7b1';
  ctx.beginPath();
  ctx.arc(herbivore.size * 1.1, -1, 1.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function renderDiagnostics() {
  const snapshot = SynapseFoundation.snapshot();
  diagnosticStats.seed.textContent = snapshot.seed;
  diagnosticStats.tick.textContent = snapshot.tick;
  diagnosticStats.elapsed.textContent = `${snapshot.elapsed.toFixed(1)}s`;
  diagnosticStats.frame.textContent = `${snapshot.metrics.frameMs.toFixed(2)}ms`;
  diagnosticStats.events.textContent = snapshot.eventCount;
  diagnosticStats.drops.textContent = snapshot.metrics.droppedSteps;
}

function render() {
  const width = world.width;
  const height = world.height;
  drawBackground(width, height);

  for (const plant of world.plants) drawPlant(plant);
  for (const herbivore of world.herbivores) drawHerbivore(herbivore);

  stats.day.textContent = Math.floor(world.day);
  stats.plants.textContent = world.plants.length;
  stats.herbivores.textContent = world.herbivores.length;
  stats.temp.textContent = `${world.temperature.toFixed(1)}°C`;
  renderDiagnostics();
}

function advance(delta) {
  SynapseFoundation.advance(delta, simulate);
}

function frame(now) {
  const delta = (now - lastTime) / 1000;
  lastTime = now;
  advance(delta);
  render();
  requestAnimationFrame(frame);
}

toggleBtn.addEventListener('click', () => {
  const running = SynapseFoundation.toggleRunning();
  toggleBtn.textContent = running ? 'Pause' : 'Resume';
});

stepBtn.addEventListener('click', () => {
  SynapseFoundation.step(simulate);
  render();
});

resetBtn.addEventListener('click', () => {
  reset();
  addChronicle('The habitat is reset, carrying only its possibility forward.');
});

soundBtn.addEventListener('click', () => {
  if (AudioSafety.enabled) {
    AudioSafety.disable();
    soundBtn.textContent = 'Sound: off';
  } else {
    AudioSafety.enable();
    soundBtn.textContent = 'Sound: on';
  }
});

diagnosticsBtn.addEventListener('click', () => {
  const visible = diagnosticsEl.hidden;
  diagnosticsEl.hidden = !visible;
  diagnosticsBtn.setAttribute('aria-expanded', String(visible));
});

speedRange.addEventListener('input', (event) => {
  speed = Number(event.target.value);
  SynapseFoundation.setSpeed(speed);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) SynapseFoundation.setRunning(false);
});

window.addEventListener('resize', resize);

resize();
reset();
requestAnimationFrame(frame);

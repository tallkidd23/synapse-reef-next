// Synapse Reef — Self-Organizing Neural Coral Automata & Substrate Simulation
// Authentic Gallery Engine verbatim from digital-paludarium

const canvas = document.getElementById('reefCanvas');
const ctx = canvas.getContext('2d');

const UI = {
  systemState: document.getElementById('systemState'),
  toggleBtn: document.getElementById('toggleBtn'),
  stepBtn: document.getElementById('stepBtn'),
  seedBtn: document.getElementById('seedBtn'),
  stressBtn: document.getElementById('stressBtn'),
  audioBtn: document.getElementById('audioBtn'),
  fieldToggle: document.getElementById('fieldToggle'),
  neuralToggle: document.getElementById('neuralToggle'),
  floraVal: document.getElementById('floraVal'),
  grazerVal: document.getElementById('grazerVal'),
  apexVal: document.getElementById('apexVal'),
  crabVal: document.getElementById('crabVal'),
  nutrientVal: document.getElementById('nutrientVal'),
  entropyVal: document.getElementById('entropyVal'),
  tempDisplay: document.getElementById('tempDisplay'),
  luxDisplay: document.getElementById('luxDisplay'),
  phDisplay: document.getElementById('phDisplay'),
  toneDisplay: document.getElementById('toneDisplay'),
  voicesDisplay: document.getElementById('voicesDisplay'),
  hudRegime: document.getElementById('hudRegime'),
  hudBiomass: document.getElementById('hudBiomass'),
  hudOrganisms: document.getElementById('hudOrganisms'),
  fpsCounter: document.getElementById('fpsCounter')
};

// Simulation Grids & Parameters
const GRID_W = 120;
const GRID_H = 68;
let substrate = new Float32Array(GRID_W * GRID_H);
let neuralPotential = new Float32Array(GRID_W * GRID_H);
let coralMorphology = new Uint8Array(GRID_W * GRID_H);

let organisms = {
  grazers: [],
  apex: [],
  crabs: []
};

let environment = {
  temperature: 24.0,
  solarLux: 1.0,
  ph: 8.15,
  regime: 'Verdant Solstice',
  heatPulse: 0
};

let isRunning = true;
let lastFrameTime = performance.now();
let frameCount = 0;
let lastFpsUpdate = performance.now();

// Entity Generators
function initSubstrate() {
  for (let i = 0; i < substrate.length; i++) {
    substrate[i] = Math.random() * 0.4 + 0.1;
    neuralPotential[i] = (Math.random() - 0.5) * 0.2;
    coralMorphology[i] = Math.random() < 0.12 ? Math.floor(Math.random() * 4) + 1 : 0;
  }

  organisms.grazers = Array.from({ length: 42 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 1.5,
    vy: (Math.random() - 0.5) * 1.5,
    energy: 1.0,
    size: 3.5,
    hue: 145
  }));

  organisms.apex = Array.from({ length: 5 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 2.2,
    vy: (Math.random() - 0.5) * 2.2,
    energy: 1.5,
    size: 7.5,
    hue: 350
  }));

  organisms.crabs = Array.from({ length: 18 }, () => ({
    x: Math.random() * canvas.width,
    y: canvas.height - 30 + (Math.random() - 0.5) * 20,
    vx: (Math.random() - 0.5) * 0.8,
    vy: 0,
    energy: 1.2,
    size: 4.5,
    hue: 38
  }));
}

function updateSimulation(dt) {
  if (environment.heatPulse > 0) {
    environment.heatPulse -= dt * 0.15;
    environment.temperature = 24.0 + environment.heatPulse * 8.0;
  } else {
    environment.temperature = 24.0 + Math.sin(performance.now() * 0.0005) * 1.5;
  }

  // Neural Coral Automata propagation
  for (let y = 1; y < GRID_H - 1; y++) {
    for (let x = 1; x < GRID_W - 1; x++) {
      const idx = y * GRID_W + x;
      const neighbors = 
        neuralPotential[idx - 1] + 
        neuralPotential[idx + 1] + 
        neuralPotential[idx - GRID_W] + 
        neuralPotential[idx + GRID_W];

      neuralPotential[idx] = neuralPotential[idx] * 0.88 + (neighbors * 0.25 - neuralPotential[idx]) * 0.12;
      substrate[idx] = Math.min(1.0, Math.max(0.0, substrate[idx] + (neuralPotential[idx] * 0.05 + 0.002 * environment.solarLux)));
    }
  }

  // Grazer updates
  organisms.grazers.forEach(g => {
    g.x = (g.x + g.vx + canvas.width) % canvas.width;
    g.y = (g.y + g.vy + canvas.height) % canvas.height;
    g.energy -= dt * 0.02;
    if (Math.random() < 0.05) {
      g.vx += (Math.random() - 0.5) * 0.6;
      g.vy += (Math.random() - 0.5) * 0.6;
    }
  });

  // Apex updates
  organisms.apex.forEach(a => {
    a.x = (a.x + a.vx + canvas.width) % canvas.width;
    a.y = (a.y + a.vy + canvas.height) % canvas.height;
    if (Math.random() < 0.03) {
      a.vx += (Math.random() - 0.5) * 0.8;
      a.vy += (Math.random() - 0.5) * 0.8;
    }
  });

  // Crab substrate grazing
  organisms.crabs.forEach(c => {
    c.x = (c.x + c.vx + canvas.width) % canvas.width;
    if (Math.random() < 0.08) c.vx = (Math.random() - 0.5) * 0.8;
  });
}

function render() {
  ctx.fillStyle = '#030806';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cellW = canvas.width / GRID_W;
  const cellH = canvas.height / GRID_H;

  // Substrate & Coral Grid
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const idx = y * GRID_W + x;
      const sub = substrate[idx];
      const neural = neuralPotential[idx];

      if (UI.fieldToggle.checked && sub > 0.05) {
        ctx.fillStyle = `rgba(32, 160, 110, ${sub * 0.45})`;
        ctx.fillRect(x * cellW, y * cellH, cellW - 0.5, cellH - 0.5);
      }

      if (UI.neuralToggle.checked && Math.abs(neural) > 0.04) {
        ctx.fillStyle = neural > 0 ? `rgba(45, 226, 151, ${neural * 2.2})` : `rgba(226, 75, 140, ${Math.abs(neural) * 2.2})`;
        ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
      }
    }
  }

  // Motile Organisms
  organisms.grazers.forEach(g => {
    ctx.fillStyle = `hsl(${g.hue}, 80%, 60%)`;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
    ctx.fill();
  });

  organisms.apex.forEach(a => {
    ctx.fillStyle = `hsl(${a.hue}, 85%, 55%)`;
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
    ctx.fill();
  });

  organisms.crabs.forEach(c => {
    ctx.fillStyle = `hsl(${c.hue}, 90%, 50%)`;
    ctx.fillRect(c.x - c.size, c.y - c.size, c.size * 2, c.size * 1.4);
  });

  updateTelemetry();
}

function updateTelemetry() {
  const totalBiomass = Math.round(substrate.reduce((a, b) => a + b, 0) + organisms.grazers.length * 10);
  UI.floraVal.textContent = Math.round(substrate.reduce((a, b) => a + b, 0));
  UI.grazerVal.textContent = organisms.grazers.length;
  UI.apexVal.textContent = organisms.apex.length;
  UI.crabVal.textContent = organisms.crabs.length;
  UI.nutrientVal.textContent = (substrate[120] * 2.5).toFixed(2);
  UI.entropyVal.textContent = (Math.abs(neuralPotential[240]) * 4.2).toFixed(2);
  UI.tempDisplay.textContent = `${environment.temperature.toFixed(1)}°C`;
  UI.hudRegime.textContent = `Regime: ${environment.regime}`;
  UI.hudBiomass.textContent = `Total Biomass: ${totalBiomass}`;
  UI.hudOrganisms.textContent = `Motile Entities: ${organisms.grazers.length + organisms.apex.length + organisms.crabs.length}`;
}

function loop(timestamp) {
  const dt = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  if (isRunning) {
    updateSimulation(Math.min(dt, 0.1));
  }
  render();

  frameCount++;
  if (timestamp - lastFpsUpdate >= 1000) {
    UI.fpsCounter.textContent = `FPS: ${frameCount}`;
    frameCount = 0;
    lastFpsUpdate = timestamp;
  }

  requestAnimationFrame(loop);
}

// UI Event Handlers
UI.toggleBtn.addEventListener('click', () => {
  isRunning = !isRunning;
  UI.toggleBtn.textContent = isRunning ? 'Pause Substrate' : 'Resume Substrate';
  UI.systemState.textContent = isRunning ? 'Substrate Active' : 'Substrate Paused';
});

UI.stepBtn.addEventListener('click', () => {
  updateSimulation(0.1);
  render();
});

UI.seedBtn.addEventListener('click', () => {
  initSubstrate();
});

UI.stressBtn.addEventListener('click', () => {
  environment.heatPulse = 1.0;
});

UI.audioBtn.addEventListener('click', () => {
  if (window.AudioSafety) {
    if (AudioSafety.enabled) {
      AudioSafety.disable();
      UI.audioBtn.textContent = 'Audio: Off';
      UI.toneDisplay.textContent = 'Off';
    } else {
      AudioSafety.enable();
      UI.audioBtn.textContent = 'Audio: On';
      UI.toneDisplay.textContent = '432 Hz';
    }
  }
});

// Initialization
initSubstrate();
requestAnimationFrame(loop);

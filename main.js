// Synapse Reef v4.0 - Vintage DOS / CP437 ASCII Simulation Engine
// Full mathematical parity (Kuramoto phase-locking, Gray-Scott Turing, Boids, Navier-Stokes curl flow)
// rendered in authentic IBM-PC Extended ASCII / Code Page 437 typography and 16-color CGA/EGA palette.

(function () {
  'use strict';

  // --- Canvas Setup & Monospace Grid Dimensions ---
  const canvas = document.getElementById('reefCanvas');
  const ctx = canvas.getContext('2d');
  const drawer = document.getElementById('telemetryDrawer');
  const drawerToggle = document.getElementById('drawerToggle');
  const drawerIndicator = document.getElementById('drawerIndicator');

  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;

  // CP437 Cell Dimensions (Standard 8x12 font metrics)
  const CHAR_W = 10;
  const CHAR_H = 14;
  let COLS = 40;
  let ROWS = 30;

  // Authentic 16-Color CGA/EGA Palette
  const CGA = {
    BLACK: '#000000',
    BLUE: '#0000AA',
    GREEN: '#00AA00',
    CYAN: '#00AAAA',
    RED: '#AA0000',
    MAGENTA: '#AA00AA',
    BROWN: '#AA5500',
    LIGHT_GRAY: '#AAAAAA',
    DARK_GRAY: '#555555',
    LIGHT_BLUE: '#5555FF',
    LIGHT_GREEN: '#55FF55',
    LIGHT_CYAN: '#55FFFF',
    LIGHT_RED: '#FF5555',
    LIGHT_MAGENTA: '#FF55FF',
    YELLOW: '#FFFF55',
    WHITE: '#FFFFFF'
  };

  function resize() {
    const parent = canvas.parentElement;
    width = parent.clientWidth || window.innerWidth;
    height = parent.clientHeight || window.innerHeight;
    dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    COLS = Math.max(20, Math.floor(width / CHAR_W));
    ROWS = Math.max(15, Math.floor(height / CHAR_H));

    initFields();
    if (plants.length === 0) initEcosystem();
  }

  if (drawerToggle && drawer) {
    drawerToggle.addEventListener('click', () => {
      const isExpanded = drawer.classList.toggle('expanded');
      if (drawerIndicator) {
        drawerIndicator.textContent = isExpanded ? '[-]' : '[+]';
      }
      setTimeout(resize, 320);
    });
  }

  // --- Climate Regimes (DOS Seasonal State Machine) ---
  const SEASONS = [
    { name: 'VERDANT SOLSTICE', F: 0.038, k: 0.061, temp: 26.5, lux: 100, ph: 8.18, bgChar: '░', color: CGA.GREEN },
    { name: 'NUTRIENT MONSOON', F: 0.046, k: 0.063, temp: 23.0, lux: 70, ph: 8.08, bgChar: '▒', color: CGA.CYAN },
    { name: 'ARID ECLIPSE', F: 0.028, k: 0.058, temp: 28.5, lux: 40, ph: 8.30, bgChar: '·', color: CGA.BROWN },
    { name: 'BIOLUMINESCENT BLOOM', F: 0.054, k: 0.062, temp: 25.8, lux: 125, ph: 8.24, bgChar: '▓', color: CGA.LIGHT_CYAN }
  ];

  let seasonalTime = 0;
  let currentSeasonIdx = 0;

  // --- Substrate PDE & Turing Morphogen Buffers ---
  let S_field, D_field, A_field;
  let Turing_U, Turing_V, next_U, next_V;
  let morphCycleTime = 0;

  function cellIdx(x, y) {
    const cx = (x % COLS + COLS) % COLS;
    const cy = (y % ROWS + ROWS) % ROWS;
    return cx + cy * COLS;
  }

  function initFields() {
    const total = COLS * ROWS;
    S_field = new Float32Array(total);
    D_field = new Float32Array(total);
    A_field = new Float32Array(total);

    Turing_U = new Float32Array(total);
    Turing_V = new Float32Array(total);
    next_U = new Float32Array(total);
    next_V = new Float32Array(total);

    for (let y = 0; y < ROWS; y++) {
      const depthBias = 1.0 + (y / ROWS) * 1.5;
      for (let x = 0; x < COLS; x++) {
        const i = x + y * COLS;
        S_field[i] = (2.5 + Math.random() * 2.5) * depthBias;
        D_field[i] = (0.4 + Math.random() * 1.2) * depthBias;
        A_field[i] = 0.0;

        Turing_U[i] = 1.0;
        Turing_V[i] = 0.0;
        if (Math.hypot(x - COLS * 0.5, y - ROWS * 0.6) < 4 || Math.random() < 0.05) {
          Turing_V[i] = 0.8;
        }
      }
    }
  }

  function stepTuringMorphogenesis(climate) {
    morphCycleTime += 0.005;
    const breathing = Math.sin(morphCycleTime) * 0.003;
    const F = climate.F + breathing;
    const k = climate.k + breathing * 0.5;
    const Du = 0.16;
    const Dv = 0.08;

    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        const i = cellIdx(x, y);
        const u = Turing_U[i];
        const v = Turing_V[i];

        const lapU = (Turing_U[cellIdx(x+1, y)] + Turing_U[cellIdx(x-1, y)] + Turing_U[cellIdx(x, y+1)] + Turing_U[cellIdx(x, y-1)]) * 0.25 - u;
        const lapV = (Turing_V[cellIdx(x+1, y)] + Turing_V[cellIdx(x-1, y)] + Turing_V[cellIdx(x, y+1)] + Turing_V[cellIdx(x, y-1)]) * 0.25 - v;

        const localF = F + (S_field[i] / 10.0) * 0.006;
        const localK = k + (A_field[i] / 8.0) * 0.005;

        const uvv = u * v * v;
        const nU = u + (Du * lapU - uvv + localF * (1.0 - u));
        const nV = v + (Dv * lapV + uvv - (localF + localK) * v);

        next_U[i] = Math.max(0.0, Math.min(1.0, nU));
        next_V[i] = Math.max(0.0, Math.min(1.0, nV));
      }
    }

    Turing_U.set(next_U);
    Turing_V.set(next_V);
  }

  function injectMorphogen(cx, cy, r, amtV) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (dx * dx + dy * dy <= r * r) {
          const i = cellIdx(cx + dx, cy + dy);
          Turing_V[i] = Math.min(1.0, Math.max(0.0, Turing_V[i] + amtV));
        }
      }
    }
  }

  // --- Incompressible Curl Flow ---
  function getCurlVelocity(x, y, t) {
    const scale = 0.05;
    const eps = 1.0;
    const tScale = t * 0.0003;

    const psi_x1 = Math.sin((x + eps) * scale + tScale) * Math.cos(y * scale);
    const psi_x0 = Math.sin((x - eps) * scale + tScale) * Math.cos(y * scale);
    const psi_y1 = Math.sin(x * scale + tScale) * Math.cos((y + eps) * scale);
    const psi_y0 = Math.sin(x * scale + tScale) * Math.cos((y - eps) * scale);

    const dPsi_dy = (psi_y1 - psi_y0) / (2 * eps);
    const dPsi_dx = (psi_x1 - psi_x0) / (2 * eps);

    return { u: dPsi_dy * 1.5, v: -dPsi_dx * 1.5 + 0.02 };
  }

  // --- ASCII Marine Snow ---
  const marineSnow = [];
  const SNOW_COUNT = 30;

  function initMarineSnow() {
    marineSnow.length = 0;
    for (let i = 0; i < SNOW_COUNT; i++) {
      marineSnow.push({
        x: Math.random() * COLS,
        y: Math.random() * ROWS,
        char: Math.random() < 0.6 ? '·' : '°'
      });
    }
  }

  // --- Species Metadata (DOS CP437 Characters & EGA Colors) ---
  const SPECIES_DOS = [
    { name: 'Indigo Porites', char: '♣', stemChar: '│', color: CGA.LIGHT_BLUE, flash: CGA.WHITE },
    { name: 'Magenta Stylophora', char: '♠', stemChar: '┼', color: CGA.LIGHT_MAGENTA, flash: CGA.WHITE },
    { name: 'Mustard Montipora', char: '▲', stemChar: '─', color: CGA.YELLOW, flash: CGA.WHITE },
    { name: 'Olive Brain Coral', char: '●', stemChar: '║', color: CGA.LIGHT_GREEN, flash: CGA.WHITE }
  ];

  // --- Dendritic Autotroph Stalks ---
  const plants = [];
  const sparks = [];
  const decayPuffs = [];
  const MAX_PLANTS = 90;
  let globalKuramotoCoupling = 0.04;

  class DendriticAutotroph {
    constructor(x, y, parent, generation, speciesIdx) {
      this.x = x;
      this.y = y;
      this.parent = parent || null;
      this.children = [];
      this.synapseWeights = new Map();
      this.speciesIdx = speciesIdx !== undefined ? speciesIdx : (parent ? parent.speciesIdx : Math.floor(Math.random() * SPECIES_DOS.length));

      this.energy = 16.0;
      this.age = 0;
      this.maxAge = 600 + Math.floor(Math.random() * 300);
      this.phi = 0.0;
      this.theta = Math.random() * Math.PI * 2;
      this.naturalFreq = 0.03 + (Math.random() - 0.5) * 0.01;

      if (this.parent) {
        this.parent.children.push(this);
        this.parent.synapseWeights.set(this, 1.2);
      }
    }

    update(climate, allPlants, couplingK) {
      this.age++;
      this.phi = Math.max(0.0, this.phi - 0.04);

      let phaseCouplingSum = 0;
      let connectedCount = 0;

      if (this.parent && allPlants.includes(this.parent)) {
        phaseCouplingSum += Math.sin(this.parent.theta - this.theta);
        connectedCount++;
      }
      for (let i = 0; i < this.children.length; i++) {
        const ch = this.children[i];
        if (allPlants.includes(ch)) {
          phaseCouplingSum += Math.sin(ch.theta - this.theta);
          connectedCount++;
        }
      }

      if (connectedCount > 0) {
        this.theta += this.naturalFreq + (couplingK / connectedCount) * phaseCouplingSum;
      } else {
        this.theta += this.naturalFreq;
      }
      this.theta %= Math.PI * 2;

      for (const [child, w] of this.synapseWeights.entries()) {
        if (!allPlants.includes(child)) {
          this.synapseWeights.delete(child);
          const cIdx = this.children.indexOf(child);
          if (cIdx !== -1) this.children.splice(cIdx, 1);
        } else {
          this.synapseWeights.set(child, Math.max(1.0, w - 0.002));
        }
      }

      const sIndex = cellIdx(this.x, this.y);
      const turingBoost = 1.0 + Turing_V[sIndex] * 0.5;
      const u = Math.min(S_field[sIndex], 0.40 * turingBoost);
      S_field[sIndex] -= u;

      let localCrowd = 0;
      for (let i = 0; i < allPlants.length; i++) {
        const other = allPlants[i];
        if (other === this) continue;
        if (Math.hypot(other.x - this.x, other.y - this.y) < 3) localCrowd++;
      }

      if (localCrowd > 3) {
        this.energy -= 0.16;
      } else {
        this.energy += (0.45 * climate.alpha_sun * turingBoost + u) - 0.11;
      }

      if (this.phi > 0.3) {
        injectMorphogen(this.x, this.y, 1, 0.2);
      }

      // Branching into adjacent grid cells
      if (this.energy >= 28.0 && this.children.length < 2 && allPlants.length < MAX_PLANTS && Math.random() < 0.20) {
        const dx = Math.random() < 0.5 ? -1 : 1;
        const dy = -1 - (Math.random() < 0.3 ? 1 : 0);
        const childX = Math.max(2, Math.min(COLS - 3, this.x + dx));
        const childY = Math.max(2, Math.min(ROWS - 3, this.y + dy));

        this.energy -= 13.0;
        const child = new DendriticAutotroph(childX, childY, this, 2, this.speciesIdx);
        plants.push(child);
        injectMorphogen(childX, childY, 1, 0.4);
      }
    }
  }

  // --- Grazers (DOS ASCII '<°)))><' / '§' / '►') ---
  const grazers = [];
  const apexPredators = [];
  const benthicCrabs = [];

  class FlockingGrazer {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 0.6;
      this.vy = (Math.random() - 0.5) * 0.6;
      this.energy = 50.0;
      this.age = 0;
      this.maxSpeed = 0.55;
    }

    update(climate, allGrazers, allApex, allPlants, now) {
      this.age++;
      this.energy -= 0.08;

      const curl = getCurlVelocity(this.x, this.y, now);
      let sepX = 0, sepY = 0;
      let alignX = 0, alignY = 0;
      let cohX = 0, cohY = 0;
      let flockNeighbors = 0;

      for (let i = 0; i < allGrazers.length; i++) {
        const other = allGrazers[i];
        if (other === this) continue;
        const dist = Math.hypot(other.x - this.x, other.y - this.y);

        if (dist > 0 && dist < 5) {
          if (dist < 2) {
            sepX += (this.x - other.x) / dist;
            sepY += (this.y - other.y) / dist;
          }
          alignX += other.vx;
          alignY += other.vy;
          cohX += other.x;
          cohY += other.y;
          flockNeighbors++;
        }
      }

      let flockVx = 0, flockVy = 0;
      if (flockNeighbors > 0) {
        alignX /= flockNeighbors;
        alignY /= flockNeighbors;
        cohX = (cohX / flockNeighbors) - this.x;
        cohY = (cohY / flockNeighbors) - this.y;
        flockVx = sepX * 0.25 + alignX * 0.2 + cohX * 0.02;
        flockVy = sepY * 0.25 + alignY * 0.2 + cohY * 0.02;
      }

      // Predator Panic Evasion
      let evadeX = 0, evadeY = 0;
      let inDanger = false;
      for (let i = 0; i < allApex.length; i++) {
        const predator = allApex[i];
        const pDist = Math.hypot(predator.x - this.x, predator.y - this.y);
        if (pDist < 8) {
          evadeX += (this.x - predator.x) / (pDist * 0.4);
          evadeY += (this.y - predator.y) / (pDist * 0.4);
          inDanger = true;
        }
      }

      // Foraging on Autotrophs
      let forageVx = 0, forageVy = 0;
      let closestPlant = null;
      let closestDist = Infinity;

      for (let i = 0; i < allPlants.length; i++) {
        const p = allPlants[i];
        if (p.energy <= 1.0) continue;
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        if (d < 8 && d < closestDist) {
          closestDist = d;
          closestPlant = p;
        }
      }

      if (closestPlant) {
        forageVx = ((closestPlant.x - this.x) / closestDist) * this.maxSpeed;
        forageVy = ((closestPlant.y - this.y) / closestDist) * this.maxSpeed;

        if (closestDist < 1.2 && closestPlant.energy > 0) {
          closestPlant.energy -= 3.2;
          this.energy += 3.0;
          closestPlant.phi = 1.0;
          globalKuramotoCoupling = 0.25;
          propagateWave(closestPlant);
          injectMorphogen(closestPlant.x, closestPlant.y, 1, 0.3);
        }
      }

      let desiredX = curl.u * 0.1 + flockVx * 0.8 + forageVx * 0.9;
      let desiredY = curl.v * 0.1 + flockVy * 0.8 + forageVy * 0.9;

      if (inDanger) {
        desiredX = evadeX * 2.5;
        desiredY = evadeY * 2.5;
      }

      this.vx += (desiredX - this.vx) * 0.1;
      this.vy += (desiredY - this.vy) * 0.1;

      const spd = Math.hypot(this.vx, this.vy);
      const maxSpd = inDanger ? 0.75 : this.maxSpeed;
      if (spd > maxSpd) {
        this.vx = (this.vx / spd) * maxSpd;
        this.vy = (this.vy / spd) * maxSpd;
      }

      this.x = (this.x + this.vx + COLS) % COLS;
      this.y = (this.y + this.vy + ROWS) % ROWS;

      if (this.energy > 85.0 && allGrazers.length < 50) {
        this.energy -= 40.0;
        grazers.push(new FlockingGrazer((this.x + 1) % COLS, (this.y + 1) % ROWS));
      }
    }
  }

  // --- Apex Predators (DOS '▼' / '►' / '▲' / '◄' with Crimson Aura) ---
  class OrganicApex {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = (Math.random() - 0.5) * 0.8;
      this.energy = 110.0;
      this.cruiseSpeed = 0.65;
      this.burstSpeed = 1.15;
      this.isSprinting = false;
      this.sprintCooldown = 0;
    }

    update() {
      this.energy -= 0.08;
      if (this.sprintCooldown > 0) this.sprintCooldown--;
      this.isSprinting = false;

      let nearest = null;
      let minDist = Infinity;
      for (let i = 0; i < grazers.length; i++) {
        const g = grazers[i];
        const dist = Math.hypot(g.x - this.x, g.y - this.y);
        if (dist < minDist && dist < 16) {
          minDist = dist;
          nearest = { g, idx: i, dist };
        }
      }

      let desiredVx = this.vx;
      let desiredVy = this.vy;

      if (nearest) {
        const dx = nearest.g.x - this.x;
        const dy = nearest.g.y - this.y;

        if (nearest.dist < 8 && this.energy > 30.0 && this.sprintCooldown === 0) {
          this.isSprinting = true;
          this.energy -= 0.15;
          desiredVx = (dx / nearest.dist) * this.burstSpeed;
          desiredVy = (dy / nearest.dist) * this.burstSpeed;
        } else {
          desiredVx = (dx / nearest.dist) * this.cruiseSpeed;
          desiredVy = (dy / nearest.dist) * this.cruiseSpeed;
        }

        if (nearest.dist < 1.3) {
          this.energy = Math.min(160.0, this.energy + 48.0);
          spawnDecayPuff(nearest.g.x, nearest.g.y, 'apex');
          injectMorphogen(Math.floor(nearest.g.x), Math.floor(nearest.g.y), 2, 0.4);
          grazers.splice(nearest.idx, 1);
          this.sprintCooldown = 20;
        }
      } else {
        desiredVx += (Math.random() - 0.5) * 0.2;
        desiredVy += (Math.random() - 0.5) * 0.2;
      }

      this.vx += (desiredVx - this.vx) * 0.1;
      this.vy += (desiredVy - this.vy) * 0.1;

      this.x = (this.x + this.vx + COLS) % COLS;
      this.y = (this.y + this.vy + ROWS) % ROWS;

      if (this.energy > 150.0 && apexPredators.length < 5) {
        this.energy -= 65.0;
        apexPredators.push(new OrganicApex(this.x, this.y));
      }
    }
  }

  // --- Benthic Crabs (DOS '#' / '■') ---
  class OrganicBenthicCrab {
    constructor(x, y) {
      this.x = x;
      this.y = y || ROWS * 0.8 + Math.random() * (ROWS * 0.15);
      this.vx = (Math.random() - 0.5) * 0.3;
      this.energy = 55.0;
    }

    update() {
      this.energy -= 0.06;
      const sIndex = cellIdx(Math.floor(this.x), Math.floor(this.y));

      if (D_field[sIndex] > 0.2) {
        D_field[sIndex] -= 0.3;
        S_field[sIndex] = Math.min(10.0, S_field[sIndex] + 0.45);
        this.energy = Math.min(90.0, this.energy + 0.5);
      }

      this.vx += (Math.random() - 0.5) * 0.08;
      this.vx = Math.max(-0.35, Math.min(0.35, this.vx));
      this.x = (this.x + this.vx + COLS) % COLS;
      this.y = Math.min(ROWS - 1, Math.max(ROWS * 0.7, this.y + (Math.random() - 0.5) * 0.2));

      if (this.energy > 80.0 && benthicCrabs.length < 20) {
        this.energy -= 40.0;
        benthicCrabs.push(new OrganicBenthicCrab(this.x, this.y));
      }
    }
  }

  function spawnDecayPuff(x, y, type) {
    for (let i = 0; i < 4; i++) {
      decayPuffs.push({
        x: x + (Math.random() - 0.5) * 1.5,
        y: y + (Math.random() - 0.5) * 1.5,
        char: '*',
        life: 18,
        color: type === 'apex' ? CGA.LIGHT_RED : CGA.YELLOW
      });
    }
  }

  function propagateWave(startPlant) {
    const queue = [{ plant: startPlant, phi: 1.0, depth: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
      const { plant, phi, depth } = queue.shift();
      if (depth > 6 || phi < 0.08) continue;
      if (visited.has(plant)) continue;
      visited.add(plant);

      plant.phi = Math.max(plant.phi, phi);

      for (let i = 0; i < plant.children.length; i++) {
        const child = plant.children[i];
        sparks.push({
          x1: plant.x,
          y1: plant.y,
          x2: child.x,
          y2: child.y,
          sigma: 0,
          v: 0.18
        });
        queue.push({ plant: child, phi: phi * 0.75, depth: depth + 1 });
      }

      if (plant.parent && !visited.has(plant.parent)) {
        sparks.push({
          x1: plant.x,
          y1: plant.y,
          x2: plant.parent.x,
          y2: plant.parent.y,
          sigma: 0,
          v: 0.18
        });
        queue.push({ plant: plant.parent, phi: phi * 0.70, depth: depth + 1 });
      }
    }
  }

  function initEcosystem() {
    plants.length = 0;
    grazers.length = 0;
    apexPredators.length = 0;
    benthicCrabs.length = 0;
    sparks.length = 0;
    decayPuffs.length = 0;

    initMarineSnow();

    // Seed 6 root stalks along bottom grid
    const rootCount = 6;
    for (let k = 0; k < rootCount; k++) {
      const rootX = Math.floor(4 + (k / (rootCount - 1)) * (COLS - 8) + (Math.random() - 0.5) * 2);
      const rootY = Math.floor(ROWS * 0.75 + Math.random() * (ROWS * 0.15));
      const speciesIdx = k % SPECIES_DOS.length;
      const root = new DendriticAutotroph(rootX, rootY, null, 1, speciesIdx);
      plants.push(root);

      for (let b = 0; b < 2; b++) {
        const bX = Math.max(2, Math.min(COLS - 3, rootX + (b === 0 ? -1 : 1)));
        const bY = Math.max(2, Math.min(ROWS - 3, rootY - 1));
        plants.push(new DendriticAutotroph(bX, bY, root, 2, speciesIdx));
      }
    }

    for (let i = 0; i < 30; i++) grazers.push(new FlockingGrazer(Math.random() * COLS, Math.random() * ROWS));
    for (let i = 0; i < 12; i++) benthicCrabs.push(new OrganicBenthicCrab(Math.random() * COLS));
    for (let i = 0; i < 3; i++) apexPredators.push(new OrganicApex(Math.random() * COLS, Math.random() * ROWS));
  }

  function stepSubstrates(climate) {
    const total = COLS * ROWS;
    const nextA = new Float32Array(total);

    stepTuringMorphogenesis(climate);

    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        const idx = cellIdx(x, y);
        const dVal = D_field[idx];
        const deltaD = -0.015 * dVal + climate.beta_climate;
        D_field[idx] = Math.max(0.0, dVal + deltaD);
        S_field[idx] = Math.min(10.0, S_field[idx] + 1.3 * Math.abs(deltaD));

        let sumA = 0;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            sumA += A_field[cellIdx(x + dx, y + dy)];
          }
        }
        nextA[idx] = 0.42 * A_field[idx] + (0.16 / 8.0) * sumA;
      }
    }
    A_field.set(nextA);
  }

  function updateTelemetryUI(climate) {
    let totalPlantMass = 0;
    let totalSoilMass = 0;
    let totalPhi = 0;

    for (let i = 0; i < S_field.length; i++) totalSoilMass += S_field[i];
    for (let i = 0; i < plants.length; i++) {
      totalPlantMass += plants[i].energy * 10;
      totalPhi += plants[i].phi;
    }

    const totalBiomass = totalPlantMass + grazers.length * 15 + benthicCrabs.length * 10 + apexPredators.length * 40;
    const meanVoltage = plants.length > 0 ? (totalPhi / plants.length).toFixed(2) : '0.00';
    const nutrientIdx = (totalSoilMass / (COLS * ROWS)).toFixed(2);

    const hudRegime = document.getElementById('hudRegime');
    const hudBiomass = document.getElementById('hudBiomass');
    const hudEntities = document.getElementById('hudEntities');

    const mFlora = document.getElementById('metricFlora');
    const mGrazer = document.getElementById('metricGrazer');
    const mApex = document.getElementById('metricApex');
    const mCrabs = document.getElementById('metricCrabs');
    const mNutrient = document.getElementById('metricNutrient');
    const mEntropy = document.getElementById('metricEntropy');
    const mEnv = document.getElementById('metricEnv');

    if (hudRegime) hudRegime.textContent = climate.name;
    if (hudBiomass) hudBiomass.textContent = Math.round(totalBiomass);
    if (hudEntities) hudEntities.textContent = plants.length + grazers.length + benthicCrabs.length + apexPredators.length;

    if (mFlora) mFlora.textContent = Math.round(totalPlantMass);
    if (mGrazer) mGrazer.textContent = grazers.length;
    if (mApex) mApex.textContent = apexPredators.length;
    if (mCrabs) mCrabs.textContent = benthicCrabs.length;
    if (mNutrient) mNutrient.textContent = nutrientIdx;
    if (mEntropy) mEntropy.textContent = meanVoltage;
    if (mEnv) mEnv.textContent = `DOS C: ${climate.temp.toFixed(1)}°C | LUX: ${climate.lux}% | pH: ${climate.ph.toFixed(2)}`;
  }

  let isPaused = false;
  let showSubstrate = true;
  let lastTick = performance.now();

  function loop(now) {
    requestAnimationFrame(loop);

    ctx.fillStyle = CGA.BLACK;
    ctx.fillRect(0, 0, width, height);

    seasonalTime += 0.0015;
    currentSeasonIdx = Math.floor((seasonalTime % (Math.PI * 2)) / (Math.PI * 0.5)) % SEASONS.length;
    const climate = SEASONS[currentSeasonIdx];

    if (!isPaused) {
      globalKuramotoCoupling = Math.max(0.04, globalKuramotoCoupling - 0.001);

      stepSubstrates(climate);

      // Step autotrophs
      for (let i = plants.length - 1; i >= 0; i--) {
        const p = plants[i];
        p.update(climate, plants, globalKuramotoCoupling);
        if (p.energy <= 0 || p.age > p.maxAge) {
          const sIndex = cellIdx(p.x, p.y);
          D_field[sIndex] = Math.min(8.0, D_field[sIndex] + 1.2);
          spawnDecayPuff(p.x, p.y, 'flora');
          if (p.parent) {
            const idx = p.parent.children.indexOf(p);
            if (idx !== -1) p.parent.children.splice(idx, 1);
          }
          plants.splice(i, 1);
        }
      }

      // Step Grazers
      for (let i = grazers.length - 1; i >= 0; i--) {
        grazers[i].update(climate, grazers, apexPredators, plants, now);
        if (grazers[i].energy <= 0) {
          spawnDecayPuff(grazers[i].x, grazers[i].y, 'grazer');
          grazers.splice(i, 1);
        }
      }

      for (let i = benthicCrabs.length - 1; i >= 0; i--) {
        benthicCrabs[i].update();
        if (benthicCrabs[i].energy <= 0) {
          spawnDecayPuff(benthicCrabs[i].x, benthicCrabs[i].y, 'crab');
          benthicCrabs.splice(i, 1);
        }
      }

      for (let i = apexPredators.length - 1; i >= 0; i--) {
        apexPredators[i].update();
        if (apexPredators[i].energy <= 0) {
          spawnDecayPuff(apexPredators[i].x, apexPredators[i].y, 'apex');
          apexPredators.splice(i, 1);
        }
      }

      // Marine Snow
      for (let i = 0; i < marineSnow.length; i++) {
        const s = marineSnow[i];
        const vel = getCurlVelocity(s.x, s.y, now);
        s.x = (s.x + vel.u * 0.1 + COLS) % COLS;
        s.y = (s.y + vel.v * 0.1 + ROWS) % ROWS;
      }

      if (now - lastTick > 350) {
        updateTelemetryUI(climate);
        lastTick = now;
      }
    }

    // --- DOS CP437 ASCII RENDERING ENGINE ---
    ctx.font = '12px "Courier New", monospace';
    ctx.textBaseline = 'top';

    // 1. Render Substrate Turing Morphogenesis Grid
    if (showSubstrate) {
      for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
          const i = cellIdx(x, y);
          const v = Turing_V[i];
          const s = S_field[i] / 10.0;
          const a = A_field[i] / 8.0;

          let ch = ' ';
          let col = CGA.BLACK;

          if (a > 0.15) {
            ch = '■';
            col = CGA.RED;
          } else if (v > 0.4) {
            ch = v > 0.7 ? '▓' : '▒';
            col = climate.color;
          } else if (s > 0.35) {
            ch = '░';
            col = CGA.DARK_GRAY;
          }

          if (ch !== ' ') {
            ctx.fillStyle = col;
            ctx.fillText(ch, x * CHAR_W, y * CHAR_H);
          }
        }
      }
    }

    // 2. Render Marine Snow Specks
    ctx.fillStyle = CGA.LIGHT_GRAY;
    for (let i = 0; i < marineSnow.length; i++) {
      const s = marineSnow[i];
      ctx.fillText(s.char, Math.floor(s.x) * CHAR_W, Math.floor(s.y) * CHAR_H);
    }

    // 3. Render Coral Tendril Branch Connections
    for (let i = 0; i < plants.length; i++) {
      const p = plants[i];
      if (p.parent && plants.includes(p.parent)) {
        const sp = SPECIES_DOS[p.speciesIdx] || SPECIES_DOS[0];
        const firing = p.phi > 0.05 || p.parent.phi > 0.05;
        ctx.fillStyle = firing ? CGA.WHITE : sp.color;

        const midX = Math.floor((p.parent.x + p.x) * 0.5);
        const midY = Math.floor((p.parent.y + p.y) * 0.5);
        ctx.fillText(sp.stemChar, midX * CHAR_W, midY * CHAR_H);
      }
    }

    // 4. Render Autotroph Coral Polyps
    for (let i = 0; i < plants.length; i++) {
      const p = plants[i];
      const sp = SPECIES_DOS[p.speciesIdx] || SPECIES_DOS[0];
      const firing = p.phi > 0.08;
      ctx.fillStyle = firing ? sp.flash : sp.color;
      ctx.fillText(sp.char, p.x * CHAR_W, p.y * CHAR_H);
    }

    // 5. Render Bioluminescent Action Potential Sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.sigma += sp.v;
      if (sp.sigma >= 1.0) {
        sparks.splice(i, 1);
      } else {
        const sx = Math.floor((1 - sp.sigma) * sp.x1 + sp.sigma * sp.x2);
        const sy = Math.floor((1 - sp.sigma) * sp.y1 + sp.sigma * sp.y2);
        ctx.fillStyle = CGA.WHITE;
        ctx.fillText('☼', sx * CHAR_W, sy * CHAR_H);
      }
    }

    // 6. Render Benthic Crabs
    ctx.fillStyle = CGA.BROWN;
    for (let i = 0; i < benthicCrabs.length; i++) {
      const b = benthicCrabs[i];
      ctx.fillText('#', Math.floor(b.x) * CHAR_W, Math.floor(b.y) * CHAR_H);
    }

    // 7. Render Grazers (Fish)
    for (let i = 0; i < grazers.length; i++) {
      const g = grazers[i];
      const heading = Math.atan2(g.vy, g.vx);
      let fChar = '>';
      if (Math.abs(heading) < Math.PI * 0.25) fChar = '>';
      else if (Math.abs(heading) > Math.PI * 0.75) fChar = '<';
      else if (heading > 0) fChar = 'v';
      else fChar = '^';

      ctx.fillStyle = CGA.LIGHT_CYAN;
      ctx.fillText(fChar, Math.floor(g.x) * CHAR_W, Math.floor(g.y) * CHAR_H);
    }

    // 8. Render Apex Predators (Leviathans)
    for (let i = 0; i < apexPredators.length; i++) {
      const a = apexPredators[i];
      const heading = Math.atan2(a.vy, a.vx);
      let aChar = '►';
      if (Math.abs(heading) < Math.PI * 0.25) aChar = '►';
      else if (Math.abs(heading) > Math.PI * 0.75) aChar = '◄';
      else if (heading > 0) aChar = '▼';
      else aChar = '▲';

      ctx.fillStyle = a.isSprinting ? CGA.LIGHT_RED : CGA.RED;
      ctx.fillText(aChar, Math.floor(a.x) * CHAR_W, Math.floor(a.y) * CHAR_H);
    }

    // 9. Render Decay Puffs
    for (let i = decayPuffs.length - 1; i >= 0; i--) {
      const p = decayPuffs[i];
      p.life--;
      if (p.life <= 0) {
        decayPuffs.splice(i, 1);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillText(p.char, Math.floor(p.x) * CHAR_W, Math.floor(p.y) * CHAR_H);
      }
    }
  }

  // --- Controls & Event Listeners ---
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  const btnPause = document.getElementById('btnPause');
  if (btnPause) {
    btnPause.addEventListener('click', () => {
      isPaused = !isPaused;
      btnPause.textContent = isPaused ? 'Resume Substrate' : 'Pause Substrate';
    });
  }

  const btnStep = document.getElementById('btnStep');
  if (btnStep) {
    btnStep.addEventListener('click', () => {
      const climate = SEASONS[currentSeasonIdx];
      stepSubstrates(climate);
      updateTelemetryUI(climate);
    });
  }

  const btnReseed = document.getElementById('btnReseed');
  if (btnReseed) {
    btnReseed.addEventListener('click', () => {
      initFields();
      initEcosystem();
    });
  }

  const btnHeat = document.getElementById('btnHeatPulse');
  if (btnHeat) {
    btnHeat.addEventListener('click', () => {
      globalKuramotoCoupling = 0.35;
      for (let i = 0; i < A_field.length; i++) {
        if (Math.random() < 0.25) A_field[i] = Math.min(8.0, A_field[i] + 3.0);
      }
      for (let i = 0; i < plants.length; i++) {
        if (Math.random() < 0.2) plants[i].energy -= 8.0;
      }
    });
  }

  const chkSubstrate = document.getElementById('chkSubstrate');
  if (chkSubstrate) {
    chkSubstrate.checked = showSubstrate;
    chkSubstrate.addEventListener('change', (e) => {
      showSubstrate = e.target.checked;
    });
  }

  // Boot
  resize();
  initFields();
  initEcosystem();
  requestAnimationFrame(loop);
})();

// Synapse Cosmos v5.0 - Integrated Retro Arcade Terminal & Ecological Engine
// Full mathematical parity (Kuramoto phase dynamics, Gray-Scott Turing, Boids, Navier-Stokes curl flow)
// rendered in an all-in-one IBM-PC CP437 ASCII / CGA terminal canvas.

(function () {
  'use strict';

  const canvas = document.getElementById('reefCanvas');
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;
  const CHAR_W = 10;
  const CHAR_H = 14;
  let COLS = 40;
  let ROWS = 30;

  // 16-Color CGA / EGA Retro Palette
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

  // Cosmic Regimes
const COSMIC_REGIMES = [
  {
    name: 'STELLAR ZENITH',
    morphogenFeed: 0.038,
    morphogenDamping: 0.061,
    plasmaTemperature: 26.5,
    stellarFlux: 1.2,
    ionizationIndex: 8.18,
    matterInflow: 0.005,
    dustGlyph: '░',
    color: CGA.GREEN
  },
  {
    name: 'NEBULAR ACCRETION',
    morphogenFeed: 0.046,
    morphogenDamping: 0.063,
    plasmaTemperature: 23.0,
    stellarFlux: 0.9,
    ionizationIndex: 8.08,
    matterInflow: 0.015,
    dustGlyph: '▒',
    color: CGA.CYAN
  },
  {
    name: 'PULSAR SHADOW',
    morphogenFeed: 0.028,
    morphogenDamping: 0.058,
    plasmaTemperature: 28.5,
    stellarFlux: 0.6,
    ionizationIndex: 8.30,
    matterInflow: 0.001,
    dustGlyph: '·',
    color: CGA.BROWN
  },
  {
    name: 'AURORA RESONANCE',
    morphogenFeed: 0.054,
    morphogenDamping: 0.062,
    plasmaTemperature: 25.8,
    stellarFlux: 1.4,
    ionizationIndex: 8.24,
    matterInflow: 0.008,
    dustGlyph: '▓',
    color: CGA.LIGHT_CYAN
  }
];


  let seasonalTime = 0;
  let currentSeasonIdx = 0;
  let isPaused = false;
  let showDiagnosticHUD = false;
  let lastFpsUpdate = performance.now();
  let frameCount = 0;
  let currentFps = 60;

  // Substrates & Fields
  let S_field, D_field, A_field;
  let Turing_U, Turing_V, next_U, next_V;
  let morphCycleTime = 0;

  // Margins for Integrated ASCII Canvas UI
  const HEADER_ROWS = 2;
  const FOOTER_ROWS = 3;

  function cellIdx(x, y) {
    const cx = (x % COLS + COLS) % COLS;
    const cy = (y % ROWS + ROWS) % ROWS;
    return cx + cy * COLS;
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    COLS = Math.max(25, Math.floor(width / CHAR_W));
    ROWS = Math.max(20, Math.floor(height / CHAR_H));

    initFields();
    initCosmosParticles();
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
        S_field[i] = (3.5 + Math.random() * 3.0) * depthBias;
        D_field[i] = 0.5 * depthBias;
        A_field[i] = 0.0;
        Turing_U[i] = 1.0;
        Turing_V[i] = 0.0;
        if (y > HEADER_ROWS + 3 && (Math.hypot(x - COLS * 0.5, y - ROWS * 0.7) < 4 || Math.random() < 0.035)) {
          Turing_V[i] = 0.8;
        }
      }
    }
  }

  // Turing Morphogenesis with Top Ceiling Dissipation
  function stepTuringMorphogenesis(climate) {
    morphCycleTime += 0.005;
    const breathing = Math.sin(morphCycleTime) * 0.003;
    const F = climate.morphogenFeed + breathing;
    const k = climate.morphogenDamping + breathing * 0.5;
    const Du = 0.16;
    const Dv = 0.08;

    for (let x = 0; x < COLS; x++) {
      for (let y = HEADER_ROWS; y < ROWS - FOOTER_ROWS; y++) {
        const i = cellIdx(x, y);
        const u = Turing_U[i];
        const v = Turing_V[i];

        const lapU = (Turing_U[cellIdx(x + 1, y)] + Turing_U[cellIdx(x - 1, y)] + Turing_U[cellIdx(x, y + 1)] + Turing_U[cellIdx(x, y - 1)]) * 0.25 - u;
        const lapV = (Turing_V[cellIdx(x + 1, y)] + Turing_V[cellIdx(x - 1, y)] + Turing_V[cellIdx(x, y + 1)] + Turing_V[cellIdx(x, y - 1)]) * 0.25 - v;

        const localF = F + (S_field[i] / 10.0) * 0.006;
        const localK = k + (A_field[i] / 8.0) * 0.005;
        const uvv = u * v * v;

        let nU = u + (Du * lapU - uvv + localF * (1.0 - u));
        let nV = v + (Dv * lapV + uvv - (localF + localK) * v);

        // Top-edge dissipation: smoothly decay morphogen toward ceiling
        if (y < HEADER_ROWS + 6) {
          const fade = (y - HEADER_ROWS) / 6.0;
          nV *= fade;
        }

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

  // Cosmic Dust / Particle Drift
  const cosmosParticles = [];
  const PARTICLE_COUNT = 35;
  function initCosmosParticles() {
    cosmosParticles.length = 0;
    const glyphs = ['·', '°', '*', '+'];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      cosmosParticles.push({
        x: Math.random() * COLS,
        y: HEADER_ROWS + Math.random() * (ROWS - HEADER_ROWS - FOOTER_ROWS),
        char: glyphs[Math.floor(Math.random() * glyphs.length)],
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  // Botanical & Species Definitions
  const SPECIES_DOS = [
    { name: 'Indigo Porites', char: '♣', stemChar: '│', color: CGA.LIGHT_BLUE, flash: CGA.WHITE },
    { name: 'Magenta Stylophora', char: '♠', stemChar: '┼', color: CGA.LIGHT_MAGENTA, flash: CGA.WHITE },
    { name: 'Mustard Montipora', char: '▲', stemChar: '─', color: CGA.YELLOW, flash: CGA.WHITE },
    { name: 'Olive Brain Coral', char: '●', stemChar: '║', color: CGA.LIGHT_GREEN, flash: CGA.WHITE }
  ];

  const plants = [];
  const sparks = [];
  const decayPuffs = [];
  const MAX_PLANTS = 110;
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
      this.maxAge = 1400 + Math.floor(Math.random() * 600);
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

      this.theta += this.naturalFreq + (connectedCount > 0 ? (couplingK / connectedCount) * phaseCouplingSum : 0);
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
      const turingBoost = 1.0 + Turing_V[sIndex] * 0.6;
      const u = Math.min(S_field[sIndex], 0.35 * turingBoost);
      S_field[sIndex] -= u * 0.5;

      let localCrowd = 0;
      for (let i = 0; i < allPlants.length; i++) {
        const other = allPlants[i];
        if (other !== this && Math.hypot(other.x - this.x, other.y - this.y) < 2.5) localCrowd++;
      }

      const solarRate = 0.65 * (climate.stellarFlux || 1.0) * turingBoost;
      if (localCrowd > 4) {
        this.energy -= 0.08;
      } else {
        this.energy += (solarRate + u) - 0.09;
      }

      if (this.phi > 0.3) injectMorphogen(this.x, this.y, 1, 0.2);

      // Upward Growth into Active Canvas Area
      if (this.energy >= 14.0 && this.children.length < 2 && allPlants.length < MAX_PLANTS && Math.random() < 0.25) {
        const dx = Math.random() < 0.5 ? -1 : 1;
        const dy = -1 - (Math.random() < 0.25 ? 1 : 0);
        const childX = Math.max(1, Math.min(COLS - 2, this.x + dx));
        const childY = Math.max(HEADER_ROWS + 1, Math.min(ROWS - FOOTER_ROWS - 1, this.y + dy));

        let occupied = false;
        for (let i = 0; i < allPlants.length; i++) {
          if (allPlants[i].x === childX && allPlants[i].y === childY) {
            occupied = true;
            break;
          }
        }

        if (!occupied) {
          this.energy -= 6.5;
          const child = new DendriticAutotroph(childX, childY, this, 2, this.speciesIdx);
          plants.push(child);
          injectMorphogen(childX, childY, 1, 0.4);
        }
      }
    }
  }

  const grazers = [];
  const apexPredators = [];
  const benthicCrabs = [];

  class FlockingGrazer {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 0.6;
      this.vy = (Math.random() - 0.5) * 0.6;
      this.energy = 45.0;
      this.age = 0;
      this.maxSpeed = 0.60;
    }

    update(climate, allGrazers, allApex, allPlants, now) {
      this.age++;
      this.energy -= 0.06;

      const curl = getCurlVelocity(this.x, this.y, now);
      let sepX = 0, sepY = 0, alignX = 0, alignY = 0, cohX = 0, cohY = 0, flockNeighbors = 0;

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
        cohX = cohX / flockNeighbors - this.x;
        cohY = cohY / flockNeighbors - this.y;
        flockVx = sepX * 0.25 + alignX * 0.2 + cohX * 0.02;
        flockVy = sepY * 0.25 + alignY * 0.2 + cohY * 0.02;
      }

      let evadeX = 0, evadeY = 0, inDanger = false;
      for (let i = 0; i < allApex.length; i++) {
        const predator = allApex[i];
        const pDist = Math.hypot(predator.x - this.x, predator.y - this.y);
        if (pDist < 9) {
          const safeDist = Math.max(pDist, 0.001);
          evadeX += (this.x - predator.x) / (safeDist * 0.3);
          evadeY += (this.y - predator.y) / (safeDist * 0.3);
          inDanger = true;
        }
      }

      let forageVx = 0, forageVy = 0, closestPlant = null, closestDist = Infinity;
      for (let i = 0; i < allPlants.length; i++) {
        const p = allPlants[i];
        if (p.energy <= 4.0) continue;
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        if (d < 8 && d < closestDist) {
          closestDist = d;
          closestPlant = p;
        }
      }

      if (closestPlant) {
        const safeDist = Math.max(closestDist, 0.001);
        forageVx = ((closestPlant.x - this.x) / safeDist) * this.maxSpeed;
        forageVy = ((closestPlant.y - this.y) / safeDist) * this.maxSpeed;

        if (closestDist < 1.2 && closestPlant.energy > 4.0) {
          closestPlant.energy -= 2.0;
          this.energy = Math.min(80.0, this.energy + 2.8);
          closestPlant.phi = 1.0;
          globalKuramotoCoupling = 0.20;
          propagateWave(closestPlant);
          injectMorphogen(closestPlant.x, closestPlant.y, 1, 0.3);
        }
      }

      let desiredX = curl.u * 0.1 + flockVx * 0.8 + forageVx * 0.9;
      let desiredY = curl.v * 0.1 + flockVy * 0.8 + forageVy * 0.9;

      if (inDanger) {
        desiredX = evadeX * 3.0;
        desiredY = evadeY * 3.0;
      }

      this.vx += (desiredX - this.vx) * 0.12;
      this.vy += (desiredY - this.vy) * 0.12;

      const spd = Math.hypot(this.vx, this.vy);
      const maxSpd = inDanger ? 0.95 : this.maxSpeed;
      if (spd > maxSpd) {
        this.vx = (this.vx / spd) * maxSpd;
        this.vy = (this.vy / spd) * maxSpd;
      }

      this.x = (this.x + this.vx + COLS) % COLS;
      this.y += this.vy;
      if (this.y < HEADER_ROWS + 1) this.y = HEADER_ROWS + 1;
      if (this.y > ROWS - FOOTER_ROWS - 1) this.y = ROWS - FOOTER_ROWS - 1;

      if (this.energy > 55.0 && allGrazers.length < 45) {
        this.energy -= 28.0;
        grazers.push(new FlockingGrazer((this.x + 1) % COLS, (this.y + 1) % ROWS));
      }
    }
  }

  class OrganicApex {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = (Math.random() - 0.5) * 0.8;
      this.energy = 65.0;
      this.cruiseSpeed = 0.65;
      this.burstSpeed = 1.10;
      this.isSprinting = false;
      this.sprintCooldown = 0;
    }

    update() {
      this.energy -= 0.28;
      if (this.sprintCooldown > 0) this.sprintCooldown--;
      this.isSprinting = false;

      let nearest = null;
      let minDist = Infinity;
      for (let i = 0; i < grazers.length; i++) {
        const g = grazers[i];
        const dist = Math.hypot(g.x - this.x, g.y - this.y);
        if (dist < minDist && dist < 14) {
          minDist = dist;
          nearest = { g, idx: i, dist };
        }
      }

      let desiredVx = this.vx;
      let desiredVy = this.vy;

      if (nearest) {
        const dx = nearest.g.x - this.x;
        const dy = nearest.g.y - this.y;
        const safeDist = Math.max(nearest.dist, 0.001);

        if (nearest.dist < 7 && this.energy > 20.0 && this.sprintCooldown === 0) {
          this.isSprinting = true;
          this.energy -= 0.45;
          desiredVx = (dx / safeDist) * this.burstSpeed;
          desiredVy = (dy / safeDist) * this.burstSpeed;
        } else {
          desiredVx = (dx / safeDist) * this.cruiseSpeed;
          desiredVy = (dy / safeDist) * this.cruiseSpeed;
        }

        if (nearest.dist < 1.3) {
          this.energy = Math.min(100.0, this.energy + 35.0);
          spawnDecayPuff(nearest.g.x, nearest.g.y, 'apex');
          injectMorphogen(Math.floor(nearest.g.x), Math.floor(nearest.g.y), 2, 0.4);
          grazers.splice(nearest.idx, 1);
          this.sprintCooldown = 25;
        }
      } else {
        desiredVx += (Math.random() - 0.5) * 0.2;
        desiredVy += (Math.random() - 0.5) * 0.2;
      }

      this.vx += (desiredVx - this.vx) * 0.1;
      this.vy += (desiredVy - this.vy) * 0.1;
      this.x = (this.x + this.vx + COLS) % COLS;
      this.y += this.vy;
      if (this.y < HEADER_ROWS + 1) this.y = HEADER_ROWS + 1;
      if (this.y > ROWS - FOOTER_ROWS - 1) this.y = ROWS - FOOTER_ROWS - 1;

      if (this.energy > 90.0 && apexPredators.length < 4 && grazers.length > 8) {
        this.energy -= 50.0;
        apexPredators.push(new OrganicApex(this.x, this.y));
      }
    }
  }

  class OrganicBenthicCrab {
    constructor(x, y) {
      this.x = x;
      this.y = y || (ROWS - FOOTER_ROWS - 2) + Math.random();
      this.vx = (Math.random() - 0.5) * 0.3;
      this.energy = 55.0;
    }

    update() {
      this.energy -= 0.05;
      const sIndex = cellIdx(Math.floor(this.x), Math.floor(this.y));
      if (D_field[sIndex] > 0.2) {
        D_field[sIndex] -= 0.3;
        S_field[sIndex] = Math.min(10.0, S_field[sIndex] + 0.55);
        this.energy = Math.min(90.0, this.energy + 0.6);
      }
      this.vx += (Math.random() - 0.5) * 0.08;
      this.vx = Math.max(-0.35, Math.min(0.35, this.vx));
      this.x = (this.x + this.vx + COLS) % COLS;
      this.y = Math.min(ROWS - FOOTER_ROWS - 1, Math.max(ROWS - FOOTER_ROWS - 4, this.y + (Math.random() - 0.5) * 0.2));

      if (this.energy > 80.0 && benthicCrabs.length < 18) {
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
      if (depth > 6 || phi < 0.08 || visited.has(plant)) continue;
      visited.add(plant);
      plant.phi = Math.max(plant.phi, phi);
      for (let i = 0; i < plant.children.length; i++) {
        const child = plant.children[i];
        sparks.push({ x1: plant.x, y1: plant.y, x2: child.x, y2: child.y, sigma: 0, v: 0.18 });
        queue.push({ plant: child, phi: phi * 0.75, depth: depth + 1 });
      }
      if (plant.parent && !visited.has(plant.parent)) {
        sparks.push({ x1: plant.x, y1: plant.y, x2: plant.parent.x, y2: plant.parent.y, sigma: 0, v: 0.18 });
        queue.push({ plant: plant.parent, phi: phi * 0.70, depth: depth + 1 });
      }
    }
  }

  function reseedCosmos() {
    plants.length = 0;
    grazers.length = 0;
    apexPredators.length = 0;
    benthicCrabs.length = 0;
    sparks.length = 0;
    decayPuffs.length = 0;
    initCosmosParticles();
    initFields();

    const rootCount = 7;
    for (let k = 0; k < rootCount; k++) {
      const rootX = Math.floor(3 + (k / (rootCount - 1)) * (COLS - 6) + (Math.random() - 0.5) * 2);
      const rootY = Math.floor(ROWS - FOOTER_ROWS - 2 + Math.random() * 1.5);
      const speciesIdx = k % SPECIES_DOS.length;
      const root = new DendriticAutotroph(rootX, rootY, null, 1, speciesIdx);
      plants.push(root);

      for (let b = 0; b < 2; b++) {
        const bX = Math.max(1, Math.min(COLS - 2, rootX + (b === 0 ? -1 : 1)));
        const bY = Math.max(HEADER_ROWS + 1, Math.min(ROWS - FOOTER_ROWS - 1, rootY - 1));
        plants.push(new DendriticAutotroph(bX, bY, root, 2, speciesIdx));
      }
    }

    for (let i = 0; i < 28; i++) grazers.push(new FlockingGrazer(Math.random() * COLS, HEADER_ROWS + Math.random() * (ROWS - HEADER_ROWS - FOOTER_ROWS)));
    for (let i = 0; i < 10; i++) benthicCrabs.push(new OrganicBenthicCrab(Math.random() * COLS));
    for (let i = 0; i < 2; i++) apexPredators.push(new OrganicApex(Math.random() * COLS, HEADER_ROWS + Math.random() * (ROWS - HEADER_ROWS - FOOTER_ROWS)));
  }

  function triggerSolarFlare() {
    globalKuramotoCoupling = 0.35;
    for (let i = 0; i < A_field.length; i++) {
      if (Math.random() < 0.25) A_field[i] = Math.min(8.0, A_field[i] + 3.0);
    }
    for (let i = 0; i < plants.length; i++) {
      if (Math.random() < 0.2) plants[i].energy -= 6.0;
    }
  }

  function stepSubstrates(climate) {
    const total = COLS * ROWS;
    const nextA = new Float32Array(total);
    stepTuringMorphogenesis(climate);

    for (let x = 0; x < COLS; x++) {
      for (let y = HEADER_ROWS; y < ROWS - FOOTER_ROWS; y++) {
        const idx = cellIdx(x, y);
        const dVal = D_field[idx];
        const deltaD = -0.015 * dVal + climate.matterInflow;
        D_field[idx] = Math.max(0.0, dVal + deltaD);
        S_field[idx] = Math.min(10.0, S_field[idx] + 1.2 * Math.abs(deltaD));

        let sumA = 0;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx !== 0 || dy !== 0) sumA += A_field[cellIdx(x + dx, y + dy)];
          }
        }
        nextA[idx] = 0.42 * A_field[idx] + (0.16 / 8.0) * sumA;
      }
    }
    A_field.set(nextA);

    // Autonomous Spore Settlement
    if (plants.length < 15 && Math.random() < 0.15) {
      const rx = Math.floor(Math.random() * (COLS - 4) + 2);
      const ry = Math.floor(ROWS - FOOTER_ROWS - 2 + Math.random() * 1.5);
      const idx = cellIdx(rx, ry);
      if (S_field[idx] > 3.0) {
        plants.push(new DendriticAutotroph(rx, ry, null, 1, Math.floor(Math.random() * SPECIES_DOS.length)));
      }
    }

    if (grazers.length < 5 && Math.random() < 0.08) {
      grazers.push(new FlockingGrazer(Math.random() * COLS, HEADER_ROWS + 2 + Math.random() * 5));
    }
  }

  // --- Integrated CP437 ASCII GUI Renderer ---
  function renderAsciiInterface(climate) {
    ctx.font = '12px "Courier New", monospace';
    ctx.textBaseline = 'top';

    const totalEntities = plants.length + grazers.length + benthicCrabs.length + apexPredators.length;

    // 1. Top Header Box
    ctx.fillStyle = CGA.LIGHT_CYAN;
    const topBorder = '╔' + '═'.repeat(Math.max(0, COLS - 2)) + '╗';
    ctx.fillText(topBorder, 0, 0);

    const title = `║ [SYNAPSE-COSMOS v5.0] REGIME: ${climate.name}  ENTITIES: ${totalEntities}  FPS: ${currentFps}`;
    const paddedTitle = title.padEnd(COLS - 1, ' ') + '║';
    ctx.fillText(paddedTitle, 0, CHAR_H);

    const headerDivider = '╠' + '═'.repeat(Math.max(0, COLS - 2)) + '╣';
    ctx.fillText(headerDivider, 0, CHAR_H * 2);

    // 2. Bottom Footer Control Dock
    const footerTop = (ROWS - FOOTER_ROWS) * CHAR_H;
    ctx.fillStyle = CGA.LIGHT_GREEN;
    const footerDivider = '╠' + '═'.repeat(Math.max(0, COLS - 2)) + '╣';
    ctx.fillText(footerDivider, 0, footerTop);

    const controls = `║ [P] ${isPaused ? 'RESUME' : 'PAUSE'} │ [S] STEP │ [R] RESEED COSMOS │ [H] FLARE │ [D] DIAG`;
    const paddedControls = controls.padEnd(COLS - 1, ' ') + '║';
    ctx.fillText(paddedControls, 0, footerTop + CHAR_H);

    const bottomBorder = '╚' + '═'.repeat(Math.max(0, COLS - 2)) + '╝';
    ctx.fillText(bottomBorder, 0, footerTop + CHAR_H * 2);

    // 3. Optional Diagnostics Overlay [D]
    if (showDiagnosticHUD) {
      ctx.fillStyle = CGA.YELLOW;
      const diag1 = `[DIAGNOSTICS] Flora: ${plants.length} | Grazers: ${grazers.length} | Apex: ${apexPredators.length} | Temp: ${climate.temp.toFixed(1)}°C`;
      ctx.fillText(diag1, CHAR_W * 2, CHAR_H * 3);
    }
  }

  // Main Loop
  function loop(now) {
    requestAnimationFrame(loop);

    frameCount++;
    if (now - lastFpsUpdate >= 1000) {
      currentFps = frameCount;
      frameCount = 0;
      lastFpsUpdate = now;
    }

    ctx.fillStyle = CGA.BLACK;
    ctx.fillRect(0, 0, width, height);

    seasonalTime += 0.0015;
    currentSeasonIdx = Math.floor((seasonalTime % (Math.PI * 2)) / (Math.PI * 0.5)) % COSMIC_REGIMES.length;
    const climate = COSMIC_REGIMES[currentSeasonIdx];

    if (!isPaused) {
      globalKuramotoCoupling = Math.max(0.04, globalKuramotoCoupling - 0.001);
      stepSubstrates(climate);

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

      for (let i = 0; i < cosmosParticles.length; i++) {
        const s = cosmosParticles[i];
        const vel = getCurlVelocity(s.x, s.y, now);
        s.x = (s.x + vel.u * 0.1 + COLS) % COLS;
        s.y += vel.v * 0.1;
        if (s.y < HEADER_ROWS + 1) s.y = ROWS - FOOTER_ROWS - 1;
        if (s.y > ROWS - FOOTER_ROWS - 1) s.y = HEADER_ROWS + 1;
        s.twinkle += 0.05;
      }
    }

    // --- Substrate Morphogenesis Pass ---
    ctx.font = '12px "Courier New", monospace';
    ctx.textBaseline = 'top';

    for (let x = 0; x < COLS; x++) {
      for (let y = HEADER_ROWS; y < ROWS - FOOTER_ROWS; y++) {
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

    // --- Cosmic Particle Pass ---
    for (let i = 0; i < cosmosParticles.length; i++) {
      const s = cosmosParticles[i];
      ctx.fillStyle = Math.sin(s.twinkle) > 0 ? CGA.LIGHT_GRAY : CGA.DARK_GRAY;
      ctx.fillText(s.char, Math.floor(s.x) * CHAR_W, Math.floor(s.y) * CHAR_H);
    }

    // --- Coral Branch Tendrils ---
    for (let i = 0; i < plants.length; i++) {
      const p = plants[i];
      if (p.parent && plants.includes(p.parent)) {
        const sp = SPECIES_DOS[p.speciesIdx] || SPECIES_DOS[0];
        ctx.fillStyle = p.phi > 0.05 || p.parent.phi > 0.05 ? CGA.WHITE : sp.color;
        const midX = Math.floor((p.parent.x + p.x) * 0.5);
        const midY = Math.floor((p.parent.y + p.y) * 0.5);
        ctx.fillText(sp.stemChar, midX * CHAR_W, midY * CHAR_H);
      }
    }

    // --- Autotroph Polyps ---
    for (let i = 0; i < plants.length; i++) {
      const p = plants[i];
      const sp = SPECIES_DOS[p.speciesIdx] || SPECIES_DOS[0];
      ctx.fillStyle = p.phi > 0.08 ? sp.flash : sp.color;
      ctx.fillText(sp.char, p.x * CHAR_W, p.y * CHAR_H);
    }

    // --- Action Potential Sparks ---
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

    // --- Benthic Crabs ---
    ctx.fillStyle = CGA.BROWN;
    for (let i = 0; i < benthicCrabs.length; i++) {
      const b = benthicCrabs[i];
      ctx.fillText('#', Math.floor(b.x) * CHAR_W, Math.floor(b.y) * CHAR_H);
    }

    // --- Schooling Grazers ---
    for (let i = 0; i < grazers.length; i++) {
      const g = grazers[i];
      const heading = Math.atan2(g.vy, g.vx);
      let fChar = '>';
      if (Math.abs(heading) > Math.PI * 0.75) fChar = '<';
      else if (heading > Math.PI * 0.25) fChar = 'v';
      else if (heading < -Math.PI * 0.25) fChar = '^';
      ctx.fillStyle = CGA.LIGHT_CYAN;
      ctx.fillText(fChar, Math.floor(g.x) * CHAR_W, Math.floor(g.y) * CHAR_H);
    }

    // --- Apex Predators ---
    for (let i = 0; i < apexPredators.length; i++) {
      const a = apexPredators[i];
      const heading = Math.atan2(a.vy, a.vx);
      let aChar = '►';
      if (Math.abs(heading) > Math.PI * 0.75) aChar = '◄';
      else if (heading > Math.PI * 0.25) aChar = '▼';
      else if (heading < -Math.PI * 0.25) aChar = '▲';
      ctx.fillStyle = a.isSprinting ? CGA.LIGHT_RED : CGA.RED;
      ctx.fillText(aChar, Math.floor(a.x) * CHAR_W, Math.floor(a.y) * CHAR_H);
    }

    // --- Decay Puffs ---
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

    // --- Render Top & Bottom ASCII Shell ---
    renderAsciiInterface(climate);
  }

  // --- Keyboard & Interactive Click Handling ---
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'p') isPaused = !isPaused;
    if (key === 's') {
      const climate = COSMIC_REGIMES[currentSeasonIdx];
      stepSubstrates(climate);
    }
    if (key === 'r') reseedCosmos();
    if (key === 'h') triggerSolarFlare();
    if (key === 'd') showDiagnosticHUD = !showDiagnosticHUD;
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const footerTop = (ROWS - FOOTER_ROWS) * CHAR_H;

    if (clickY >= footerTop) {
      const clickX = e.clientX - rect.left;
      const col = Math.floor(clickX / CHAR_W);
      if (col < 10) isPaused = !isPaused;
      else if (col < 20) stepSubstrates(COSMIC_REGIMES[currentSeasonIdx]);
      else if (col < 36) reseedCosmos();
      else if (col < 46) triggerSolarFlare();
      else showDiagnosticHUD = !showDiagnosticHUD;
    }
  });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // Boot
  resize();
  reseedCosmos();
  requestAnimationFrame(loop);
})();

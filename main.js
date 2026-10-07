// Synapse Reef v3.1 - Tropical Lagoon & Natural Reef Palette Engine
// Top-down tropical lagoon view: warm white-to-golden sand substrate, dynamic turquoise water caustics,
// vibrant coral species (staghorn emerald, violet gorgonian, sun coral), electric blue grazers, and tiger-amber predators.

(function () {
  'use strict';

  // --- Canvas Setup & High-DPI Scaling ---
  const canvas = document.getElementById('reefCanvas');
  const ctx = canvas.getContext('2d');
  const drawer = document.getElementById('telemetryDrawer');
  const drawerToggle = document.getElementById('drawerToggle');
  const drawerIndicator = document.getElementById('drawerIndicator');

  // Substrate buffer for fluid background PDE & Turing patterns
  const subCanvas = document.createElement('canvas');
  const subCtx = subCanvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;

  const SUB_SCALE = 10;
  let SUB_COLS = 36;
  let SUB_ROWS = 28;

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

    SUB_COLS = Math.max(20, Math.floor(width / SUB_SCALE));
    SUB_ROWS = Math.max(15, Math.floor(height / SUB_SCALE));

    subCanvas.width = SUB_COLS;
    subCanvas.height = SUB_ROWS;

    initFields();
    if (plants.length === 0) initEcosystem();
  }

  // Drawer interaction
  if (drawerToggle && drawer) {
    drawerToggle.addEventListener('click', () => {
      const isExpanded = drawer.classList.toggle('expanded');
      if (drawerIndicator) {
        drawerIndicator.textContent = isExpanded ? '▼ Collapse' : '▲ Expand';
      }
      setTimeout(resize, 320);
    });
  }

  // --- Continuous Seasonal Environmental Cycle Engine ---
  const SEASONS = [
    {
      name: 'Verdant Solstice',
      desc: 'Summer Solar Max & High Lagoon Transparency',
      alpha_sun: 1.15,
      beta_climate: 0.005,
      waterTemp: 27.2,
      solarLux: 100,
      ph: 8.22,
      turingF: 0.038,
      turingK: 0.061,
      sandHue: { r: 232, g: 218, b: 178 }, // Warm golden lagoon sand
      waterTint: { r: 0, g: 180, b: 200 }   // Turquoise shimmer
    },
    {
      name: 'Nutrient Monsoon',
      desc: 'Autumn Tidal Surge & Mineral Enrichment',
      alpha_sun: 0.85,
      beta_climate: 0.020,
      waterTemp: 24.0,
      solarLux: 70,
      ph: 8.08,
      turingF: 0.046,
      turingK: 0.063,
      sandHue: { r: 210, g: 195, b: 160 }, // Wet silt sand
      waterTint: { r: 0, g: 150, b: 185 }
    },
    {
      name: 'Arid Eclipse',
      desc: 'Twilight Low Tide & Deep Trench Shadowing',
      alpha_sun: 0.60,
      beta_climate: 0.002,
      waterTemp: 28.5,
      solarLux: 40,
      ph: 8.30,
      turingF: 0.028,
      turingK: 0.058,
      sandHue: { r: 185, g: 165, b: 135 }, // Dusky shadows
      waterTint: { r: 10, g: 110, b: 160 }
    },
    {
      name: 'Bioluminescent Bloom',
      desc: 'Spring Coral Spawning & Vivid Reef iridescence',
      alpha_sun: 1.30,
      beta_climate: 0.010,
      waterTemp: 25.8,
      solarLux: 125,
      ph: 8.24,
      turingF: 0.054,
      turingK: 0.062,
      sandHue: { r: 245, g: 235, b: 205 }, // Bright white coral sand
      waterTint: { r: 20, g: 210, b: 220 }
    }
  ];

  let seasonalTime = 0;
  const currentClimate = {
    name: 'Verdant Solstice',
    desc: '',
    alpha_sun: 1.05,
    beta_climate: 0.005,
    waterTemp: 26.5,
    solarLux: 100,
    ph: 8.18,
    turingF: 0.038,
    turingK: 0.061,
    sandHue: { r: 235, g: 222, b: 185 },
    waterTint: { r: 0, g: 180, b: 200 }
  };

  function updateSeasonalCycle() {
    seasonalTime += 0.0018;
    const normalizedPhase = (seasonalTime % (Math.PI * 2)) / (Math.PI * 2);
    const seasonIndex = Math.floor(normalizedPhase * 4) % 4;
    const nextSeasonIndex = (seasonIndex + 1) % 4;
    const seasonBlend = (normalizedPhase * 4) % 1.0;

    const sA = SEASONS[seasonIndex];
    const sB = SEASONS[nextSeasonIndex];
    const smoothT = (1 - Math.cos(seasonBlend * Math.PI)) * 0.5;

    currentClimate.name = sA.name;
    currentClimate.desc = sA.desc;
    currentClimate.alpha_sun = sA.alpha_sun * (1 - smoothT) + sB.alpha_sun * smoothT;
    currentClimate.beta_climate = sA.beta_climate * (1 - smoothT) + sB.beta_climate * smoothT;
    currentClimate.waterTemp = sA.waterTemp * (1 - smoothT) + sB.waterTemp * smoothT;
    currentClimate.solarLux = Math.round(sA.solarLux * (1 - smoothT) + sB.solarLux * smoothT);
    currentClimate.ph = sA.ph * (1 - smoothT) + sB.ph * smoothT;
    currentClimate.turingF = sA.turingF * (1 - smoothT) + sB.turingF * smoothT;
    currentClimate.turingK = sA.turingK * (1 - smoothT) + sB.turingK * smoothT;

    currentClimate.sandHue = {
      r: Math.round(sA.sandHue.r * (1 - smoothT) + sB.sandHue.r * smoothT),
      g: Math.round(sA.sandHue.g * (1 - smoothT) + sB.sandHue.g * smoothT),
      b: Math.round(sA.sandHue.b * (1 - smoothT) + sB.sandHue.b * smoothT)
    };

    currentClimate.waterTint = {
      r: Math.round(sA.waterTint.r * (1 - smoothT) + sB.waterTint.r * smoothT),
      g: Math.round(sA.waterTint.g * (1 - smoothT) + sB.waterTint.g * smoothT),
      b: Math.round(sA.waterTint.b * (1 - smoothT) + sB.waterTint.b * smoothT)
    };
  }

  // --- Substrate Fields & Morphogens ---
  let S_field, D_field, A_field;
  let Turing_U, Turing_V, next_U, next_V;
  let morphCycleTime = 0;

  function subIdx(gx, gy) {
    const x = (gx % SUB_COLS + SUB_COLS) % SUB_COLS;
    const y = (gy % SUB_ROWS + SUB_ROWS) % SUB_ROWS;
    return x + y * SUB_COLS;
  }

  function initFields() {
    const total = SUB_COLS * SUB_ROWS;
    S_field = new Float32Array(total);
    D_field = new Float32Array(total);
    A_field = new Float32Array(total);

    Turing_U = new Float32Array(total);
    Turing_V = new Float32Array(total);
    next_U = new Float32Array(total);
    next_V = new Float32Array(total);

    for (let y = 0; y < SUB_ROWS; y++) {
      const depthBias = 1.0 + (y / SUB_ROWS) * 1.5;
      for (let x = 0; x < SUB_COLS; x++) {
        const i = x + y * SUB_COLS;
        S_field[i] = (2.5 + Math.random() * 2.5) * depthBias;
        D_field[i] = (0.4 + Math.random() * 1.2) * depthBias;
        A_field[i] = 0.0;

        Turing_U[i] = 1.0;
        Turing_V[i] = 0.0;
        if (Math.hypot(x - SUB_COLS * 0.5, y - SUB_ROWS * 0.6) < 6 || Math.random() < 0.06) {
          Turing_V[i] = 0.7 + Math.random() * 0.3;
        }
      }
    }
  }

  function stepTuringMorphogenesis() {
    morphCycleTime += 0.005;
    const breathingPulse = Math.sin(morphCycleTime) * 0.004;

    const targetF = currentClimate.turingF + breathingPulse;
    const targetK = currentClimate.turingK + breathingPulse * 0.5;

    const Du = 0.16;
    const Dv = 0.08;

    for (let x = 0; x < SUB_COLS; x++) {
      for (let y = 0; y < SUB_ROWS; y++) {
        const i = subIdx(x, y);
        const u = Turing_U[i];
        const v = Turing_V[i];

        const lapU = (Turing_U[subIdx(x+1, y)] + Turing_U[subIdx(x-1, y)] + Turing_U[subIdx(x, y+1)] + Turing_U[subIdx(x, y-1)]) * 0.25 - u;
        const lapV = (Turing_V[subIdx(x+1, y)] + Turing_V[subIdx(x-1, y)] + Turing_V[subIdx(x, y+1)] + Turing_V[subIdx(x, y-1)]) * 0.25 - v;

        const localF = targetF + (S_field[i] / 10.0) * 0.008;
        const localK = targetK + (A_field[i] / 8.0) * 0.006;

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

  function injectMorphogen(x, y, radiusCells, amountV, amountU) {
    const gx = Math.floor(x / SUB_SCALE);
    const gy = Math.floor(y / SUB_SCALE);
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      for (let dy = -radiusCells; dy <= radiusCells; dy++) {
        if (dx * dx + dy * dy <= radiusCells * radiusCells) {
          const i = subIdx(gx + dx, gy + dy);
          if (amountV !== undefined) Turing_V[i] = Math.min(1.0, Math.max(0.0, Turing_V[i] + amountV));
          if (amountU !== undefined) Turing_U[i] = Math.min(1.0, Math.max(0.0, Turing_U[i] + amountU));
        }
      }
    }
  }

  // --- Incompressible Current Field ---
  function getCurlVelocity(x, y, t) {
    const scale = 0.0035;
    const eps = 1.0;
    const tScale = t * 0.0003;

    const psi_x1 = Math.sin((x + eps) * scale + tScale) * Math.cos(y * scale);
    const psi_x0 = Math.sin((x - eps) * scale + tScale) * Math.cos(y * scale);
    const psi_y1 = Math.sin(x * scale + tScale) * Math.cos((y + eps) * scale);
    const psi_y0 = Math.sin(x * scale + tScale) * Math.cos((y - eps) * scale);

    const dPsi_dy = (psi_y1 - psi_y0) / (2 * eps);
    const dPsi_dx = (psi_x1 - psi_x0) / (2 * eps);

    return {
      u: dPsi_dy * 45.0,
      v: -dPsi_dx * 45.0 + 0.08
    };
  }

  // --- Marine Snow Particles (Sunlit Floating Specks) ---
  const marineSnow = [];
  const SNOW_COUNT = 55;

  function initMarineSnow() {
    marineSnow.length = 0;
    for (let i = 0; i < SNOW_COUNT; i++) {
      marineSnow.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.8 + Math.random() * 1.5,
        alpha: 0.35 + Math.random() * 0.40,
        depth: 0.5 + Math.random() * 0.5
      });
    }
  }

  // --- Coral Species & Colors (Staghorn Emerald, Violet Gorgonian, Sun Coral Gold) ---
  const CORAL_PALETTES = [
    { stem: 'rgba(39, 174, 96, ', polyp: '#2ecc71', flash: '#a3e4d7', glow: 'rgba(46, 204, 113, ' },   // Emerald Staghorn
    { stem: 'rgba(142, 68, 173, ', polyp: '#9b59b6', flash: '#e8daef', glow: 'rgba(155, 89, 182, ' },  // Violet Gorgonian
    { stem: 'rgba(211, 84, 0, ', polyp: '#e67e22', flash: '#f9e79f', glow: 'rgba(230, 126, 34, ' },     // Sun Coral Amber
    { stem: 'rgba(22, 160, 133, ', polyp: '#1abc9c', flash: '#d1f2eb', glow: 'rgba(26, 188, 156, ' }     // Turquoise Brain Coral
  ];

  // --- Autotrophs (Kuramoto Coupled Dendritic Coral Heads) ---
  const plants = [];
  const sparks = [];
  const decayPuffs = [];
  const MAX_PLANTS = 150;
  let globalKuramotoCoupling = 0.04;

  class DendriticAutotroph {
    constructor(x, y, parent, generation, speciesIdx, genome) {
      this.x = x;
      this.y = y;
      this.parent = parent || null;
      this.children = [];
      this.synapseWeights = new Map();
      this.speciesIdx = speciesIdx !== undefined ? speciesIdx : (parent ? parent.speciesIdx : Math.floor(Math.random() * CORAL_PALETTES.length));

      this.energy = 16.0;
      this.age = 0;
      this.maxAge = 550 + Math.floor(Math.random() * 300);
      this.phi = 0.0;
      this.defCalc = 0;
      this.generation = generation || 1;

      this.theta = Math.random() * Math.PI * 2;
      this.naturalFreq = 0.025 + (Math.random() - 0.5) * 0.008;

      this.genome = genome || {
        gamma: 0.46,
        mu_p: 0.11,
        nu: 0.40,
        theta_rep: 28.0,
        c_rep: 13.0,
        maxBranches: 2
      };

      if (this.parent) {
        this.parent.children.push(this);
        this.parent.synapseWeights.set(this, 1.2);
      }
    }

    update(climate, allPlants, couplingK) {
      this.age++;
      this.phi = Math.max(0.0, this.phi - 0.035);
      if (this.defCalc > 0) this.defCalc--;

      // Kuramoto phase locking
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

      const gx = Math.floor(this.x / SUB_SCALE);
      const gy = Math.floor(this.y / SUB_SCALE);
      const sIndex = subIdx(gx, gy);

      const turingBoost = 1.0 + Turing_V[sIndex] * 0.6;
      const u = Math.min(S_field[sIndex], this.genome.nu * turingBoost);
      S_field[sIndex] -= u;

      let localCrowd = 0;
      for (let i = 0; i < allPlants.length; i++) {
        const other = allPlants[i];
        if (other === this) continue;
        if (Math.hypot(other.x - this.x, other.y - this.y) < 22) localCrowd++;
      }

      if (localCrowd > 4) {
        this.energy -= 1.4 * this.genome.mu_p;
      } else {
        this.energy += (this.genome.gamma * climate.alpha_sun * turingBoost + u) - this.genome.mu_p;
      }

      if (this.phi > 0.3) {
        injectMorphogen(this.x, this.y, 2, 0.15, -0.10);
      }

      if (this.energy >= this.genome.theta_rep && this.children.length < this.genome.maxBranches && allPlants.length < MAX_PLANTS && Math.random() < 0.22) {
        let baseAngle = -Math.PI / 2;
        if (this.parent) {
          baseAngle = Math.atan2(this.y - this.parent.y, this.x - this.parent.x);
        }
        const branchAngle = baseAngle + (Math.random() - 0.5) * 1.3;
        const branchDist = 16 + Math.random() * 10;

        const childX = Math.max(12, Math.min(width - 12, this.x + Math.cos(branchAngle) * branchDist));
        const childY = Math.max(12, Math.min(height - 12, this.y + Math.sin(branchAngle) * branchDist));

        if (Math.hypot(childX - this.x, childY - this.y) < 40) {
          this.energy -= this.genome.c_rep;
          const child = new DendriticAutotroph(childX, childY, this, this.generation + 1, this.speciesIdx);
          plants.push(child);
          injectMorphogen(childX, childY, 2, 0.35, -0.25);
        }
      }
    }
  }

  // --- Grazers (Electric Cyan/Sapphire Reef Fish with Bright Yellow Fin Accents) ---
  const grazers = [];
  const apexPredators = [];
  const benthicCrabs = [];

  class FlockingGrazer {
    constructor(x, y, genome) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 1.2;
      this.vy = (Math.random() - 0.5) * 1.2;
      this.energy = 50.0;
      this.age = 0;
      this.wanderAngle = Math.random() * Math.PI * 2;
      this.genome = genome || {
        b_eff: 3.6,
        r_sense: 90,
        r_flock: 55,
        isArmored: Math.random() < 0.25,
        maxSpeed: 1.30
      };
      this.pulse = Math.random() * Math.PI * 2;
    }

    update(climate, allGrazers, allApex, allPlants, now) {
      this.age++;
      this.energy -= 0.10;
      this.pulse += 0.08;

      const curl = getCurlVelocity(this.x, this.y, now);

      this.wanderAngle += (Math.random() - 0.5) * 0.4;
      const wanderVx = Math.cos(this.wanderAngle) * 0.5;
      const wanderVy = Math.sin(this.wanderAngle) * 0.5;

      let sepX = 0, sepY = 0;
      let alignX = 0, alignY = 0;
      let cohX = 0, cohY = 0;
      let flockNeighbors = 0;

      for (let i = 0; i < allGrazers.length; i++) {
        const other = allGrazers[i];
        if (other === this) continue;
        const dist = Math.hypot(other.x - this.x, other.y - this.y);

        if (dist > 0 && dist < this.genome.r_flock) {
          if (dist < 26) {
            const force = (26 - dist) / 26;
            sepX += ((this.x - other.x) / dist) * force;
            sepY += ((this.y - other.y) / dist) * force;
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

        flockVx = sepX * 0.28 + alignX * 0.22 + cohX * 0.015;
        flockVy = sepY * 0.28 + alignY * 0.22 + cohY * 0.015;
      }

      let evadeX = 0, evadeY = 0;
      let inDanger = false;
      for (let i = 0; i < allApex.length; i++) {
        const predator = allApex[i];
        const pDist = Math.hypot(predator.x - this.x, predator.y - this.y);
        if (pDist < 95) {
          evadeX += (this.x - predator.x) / (pDist * 0.35);
          evadeY += (this.y - predator.y) / (pDist * 0.35);
          inDanger = true;
        }
      }

      let forageVx = 0, forageVy = 0;
      let closestPlant = null;
      let closestDist = Infinity;

      for (let i = 0; i < allPlants.length; i++) {
        const p = allPlants[i];
        if (p.energy <= 1.0) continue;
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        if (d < this.genome.r_sense && d < closestDist) {
          closestDist = d;
          closestPlant = p;
        }
      }

      if (closestPlant) {
        forageVx = ((closestPlant.x - this.x) / closestDist) * this.genome.maxSpeed;
        forageVy = ((closestPlant.y - this.y) / closestDist) * this.genome.maxSpeed;

        if (closestDist < 12 && closestPlant.energy > 0) {
          const defFactor = closestPlant.defCalc > 0 ? 0.5 : 1.0;
          const bite = Math.min(closestPlant.energy, this.genome.b_eff * defFactor);
          closestPlant.energy -= bite;
          this.energy += bite * 0.9;
          closestPlant.phi = 1.0;
          globalKuramotoCoupling = 0.22;
          propagateWave(closestPlant);
          injectMorphogen(closestPlant.x, closestPlant.y, 2, 0.25, -0.15);
        }
      }

      let totalDesiredX = curl.u * 0.12 + wanderVx * 0.4 + flockVx * 0.7 + forageVx * 0.9;
      let totalDesiredY = curl.v * 0.12 + wanderVy * 0.4 + flockVy * 0.7 + forageVy * 0.9;

      if (inDanger) {
        totalDesiredX = evadeX * 2.9 + wanderVx * 0.2;
        totalDesiredY = evadeY * 2.9 + wanderVy * 0.2;
      }

      this.vx += (totalDesiredX - this.vx) * 0.09;
      this.vy += (totalDesiredY - this.vy) * 0.09;

      const maxAllowed = inDanger ? 1.70 : this.genome.maxSpeed;
      const spd = Math.hypot(this.vx, this.vy);
      if (spd > maxAllowed) {
        this.vx = (this.vx / spd) * maxAllowed;
        this.vy = (this.vy / spd) * maxAllowed;
      }

      this.x = (this.x + this.vx + width) % width;
      this.y = (this.y + this.vy + height) % height;

      if (this.energy > 85.0 && allGrazers.length < 65) {
        this.energy -= 40.0;
        grazers.push(new FlockingGrazer((this.x + 6) % width, (this.y + 6) % height, mutateGenome(this.genome)));
      }
    }
  }

  // --- Apex Predators (Tiger Amber & Deep Crimson Hunter Sharks) ---
  class OrganicApex {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 1.8;
      this.vy = (Math.random() - 0.5) * 1.8;
      this.energy = 120.0;
      this.baseCruiseSpeed = 1.65;
      this.burstSprintSpeed = 3.10;
      this.minSprintEnergy = 35.0;
      this.r_hunt = 185;
      this.mass = 90.0;
      this.sprintCooldown = 0;
      this.isSprinting = false;
      this.pulse = Math.random() * Math.PI;
    }

    update() {
      this.energy -= 0.08;
      this.pulse += 0.05;
      if (this.sprintCooldown > 0) this.sprintCooldown--;
      this.isSprinting = false;

      let nearest = null;
      let minDist = Infinity;
      for (let i = 0; i < grazers.length; i++) {
        const g = grazers[i];
        const dist = Math.hypot(g.x - this.x, g.y - this.y);
        if (dist < minDist && dist < this.r_hunt) {
          minDist = dist;
          nearest = { g, idx: i, dist };
        }
      }

      let desiredVx = this.vx;
      let desiredVy = this.vy;

      if (nearest) {
        const dx = nearest.g.x - this.x;
        const dy = nearest.g.y - this.y;

        if (nearest.dist < 110 && this.energy > this.minSprintEnergy && this.sprintCooldown === 0) {
          this.isSprinting = true;
          this.energy -= 0.18;
          desiredVx = (dx / nearest.dist) * this.burstSprintSpeed;
          desiredVy = (dy / nearest.dist) * this.burstSprintSpeed;
        } else {
          desiredVx = (dx / nearest.dist) * this.baseCruiseSpeed;
          desiredVy = (dy / nearest.dist) * this.baseCruiseSpeed;
        }

        if (nearest.dist < 16) {
          const gx = Math.floor(this.x / SUB_SCALE);
          const gy = Math.floor(this.y / SUB_SCALE);
          const sIndex = subIdx(gx, gy);

          if (nearest.g.genome.isArmored && Math.random() < 0.50) {
            A_field[sIndex] = Math.min(8.0, A_field[sIndex] + 2.0);
            this.energy -= 2.0;
            this.vx *= -0.7;
            this.vy *= -0.7;
            this.sprintCooldown = 35;
          } else {
            this.energy = Math.min(180.0, this.energy + 52.0);
            A_field[sIndex] = Math.min(8.0, A_field[sIndex] + 4.5);
            spawnDecayPuff(nearest.g.x, nearest.g.y, 'apex');
            injectMorphogen(nearest.g.x, nearest.g.y, 3, 0.45, -0.35);

            grazers.splice(nearest.idx, 1);
            this.sprintCooldown = 20;
          }
        }
      } else {
        desiredVx += (Math.random() - 0.5) * 0.4;
        desiredVy += (Math.random() - 0.5) * 0.4;
        const curSpd = Math.hypot(desiredVx, desiredVy);
        if (curSpd > this.baseCruiseSpeed) {
          desiredVx = (desiredVx / curSpd) * this.baseCruiseSpeed;
          desiredVy = (desiredVy / curSpd) * this.baseCruiseSpeed;
        }
      }

      const accel = this.isSprinting ? 0.14 : 0.08;
      this.vx += (desiredVx - this.vx) * accel;
      this.vy += (desiredVy - this.vy) * accel;

      this.x = (this.x + this.vx + width) % width;
      this.y = (this.y + this.vy + height) % height;

      if (this.energy > 155.0 && apexPredators.length < 6) {
        this.energy -= 70.0;
        apexPredators.push(new OrganicApex(this.x, this.y));
      }
    }
  }

  // --- Benthic Crabs (Coral Hermit Orange / Terracotta) ---
  class OrganicBenthicCrab {
    constructor(x, y) {
      this.x = x;
      this.y = y || height * 0.82 + Math.random() * (height * 0.15);
      this.vx = (Math.random() - 0.5) * 0.6;
      this.energy = 55.0;
      this.p_recycle = 1.4;
    }

    update() {
      this.energy -= 0.07;
      const gx = Math.floor(this.x / SUB_SCALE);
      const gy = Math.floor(this.y / SUB_SCALE);
      const sIndex = subIdx(gx, gy);

      if (D_field[sIndex] > 0.2) {
        const dScav = Math.min(D_field[sIndex], this.p_recycle);
        D_field[sIndex] -= dScav;
        S_field[sIndex] = Math.min(10.0, S_field[sIndex] + 1.6 * dScav);
        this.energy = Math.min(95.0, this.energy + 1.2 * dScav);
        injectMorphogen(this.x, this.y, 1, 0.08, 0.0);
      }

      this.vx += (Math.random() - 0.5) * 0.15;
      this.vx = Math.max(-0.65, Math.min(0.65, this.vx));
      this.x = (this.x + this.vx + width) % width;
      this.y = Math.min(height - 8, Math.max(height * 0.70, this.y + (Math.random() - 0.5) * 0.3));

      if (this.energy > 85.0 && benthicCrabs.length < 28) {
        this.energy -= 45.0;
        benthicCrabs.push(new OrganicBenthicCrab(this.x, this.y));
      }
    }
  }

  function mutateGenome(g) {
    const mut = () => (1 + (Math.random() * 0.2 - 0.10));
    return {
      b_eff: Math.max(1.0, g.b_eff * mut()),
      r_sense: Math.min(120, Math.max(40, g.r_sense * mut())),
      r_flock: Math.min(65, Math.max(30, (g.r_flock || 55) * mut())),
      isArmored: Math.random() < 0.15 ? !g.isArmored : g.isArmored,
      maxSpeed: Math.max(0.8, Math.min(1.5, (g.maxSpeed || 1.30) * mut()))
    };
  }

  function spawnDecayPuff(x, y, type) {
    const color = type === 'apex' ? '230, 75, 40' : type === 'crab' ? '230, 126, 34' : '46, 204, 113';
    for (let i = 0; i < 5; i++) {
      decayPuffs.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.2,
        r: 3.5 + Math.random() * 4.5,
        alpha: 0.65,
        color
      });
    }
  }

  function propagateWave(startPlant) {
    const queue = [{ plant: startPlant, phi: 1.0, depth: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
      const { plant, phi, depth } = queue.shift();
      if (depth > 8 || phi < 0.08) continue;
      if (visited.has(plant)) continue;
      visited.add(plant);

      plant.phi = Math.max(plant.phi, phi);

      for (let i = 0; i < plant.children.length; i++) {
        const child = plant.children[i];
        if (Math.hypot(child.x - plant.x, child.y - plant.y) < 50) {
          let w = plant.synapseWeights.get(child) || 1.0;
          const nextPhi = phi * 0.74 * Math.min(1.2, w);
          plant.synapseWeights.set(child, Math.min(3.0, w + 0.08 * phi * nextPhi));

          sparks.push({
            x1: plant.x,
            y1: plant.y,
            x2: child.x,
            y2: child.y,
            sigma: 0,
            v: 0.12 + Math.random() * 0.04
          });

          queue.push({ plant: child, phi: nextPhi, depth: depth + 1 });
        }
      }

      if (plant.parent && !visited.has(plant.parent)) {
        if (Math.hypot(plant.parent.x - plant.x, plant.parent.y - plant.y) < 50) {
          const nextPhi = phi * 0.68;
          sparks.push({
            x1: plant.x,
            y1: plant.y,
            x2: plant.parent.x,
            y2: plant.parent.y,
            sigma: 0,
            v: 0.12 + Math.random() * 0.04
          });
          queue.push({ plant: plant.parent, phi: nextPhi, depth: depth + 1 });
        }
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

    const rootCount = 7;
    for (let k = 0; k < rootCount; k++) {
      const rootX = 35 + (k / (rootCount - 1)) * (width - 70) + (Math.random() - 0.5) * 25;
      const rootY = height * 0.65 + Math.random() * (height * 0.25);
      const speciesIdx = k % CORAL_PALETTES.length;
      const root = new DendriticAutotroph(rootX, rootY, null, 1, speciesIdx);
      plants.push(root);

      for (let b = 0; b < 2; b++) {
        const bAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
        const bDist = 16 + Math.random() * 8;
        const bX = Math.max(12, Math.min(width - 12, rootX + Math.cos(bAngle) * bDist));
        const bY = Math.max(12, Math.min(height - 12, rootY + Math.sin(bAngle) * bDist));
        plants.push(new DendriticAutotroph(bX, bY, root, 2, speciesIdx));
      }
    }

    for (let i = 0; i < 38; i++) grazers.push(new FlockingGrazer(Math.random() * width, Math.random() * height));
    for (let i = 0; i < 16; i++) benthicCrabs.push(new OrganicBenthicCrab(Math.random() * width));
    for (let i = 0; i < 4; i++) apexPredators.push(new OrganicApex(Math.random() * width, Math.random() * height));
  }

  function stepSubstrates(climate) {
    const total = SUB_COLS * SUB_ROWS;
    const nextA = new Float32Array(total);

    stepTuringMorphogenesis();

    for (let x = 0; x < SUB_COLS; x++) {
      for (let y = 0; y < SUB_ROWS; y++) {
        const idx = subIdx(x, y);

        const dVal = D_field[idx];
        const deltaD = -0.015 * dVal + climate.beta_climate;
        D_field[idx] = Math.max(0.0, dVal + deltaD);
        S_field[idx] = Math.min(10.0, S_field[idx] + 1.3 * Math.abs(deltaD));

        let sumA = 0;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            sumA += A_field[subIdx(x + dx, y + dy)];
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
    const nutrientIdx = (totalSoilMass / (SUB_COLS * SUB_ROWS)).toFixed(2);

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
    if (mEnv) mEnv.textContent = `Lagoon: ${climate.waterTemp.toFixed(1)}°C | Lux: ${climate.solarLux}% | pH: ${climate.ph.toFixed(2)}`;
  }

  let isPaused = false;
  let showSubstrate = true;
  let lastTick = performance.now();

  function loop(now) {
    requestAnimationFrame(loop);

    ctx.clearRect(0, 0, width, height);

    if (!isPaused) {
      updateSeasonalCycle();

      globalKuramotoCoupling = Math.max(0.04, globalKuramotoCoupling - 0.001);

      stepSubstrates(currentClimate);

      // Step autotrophs
      for (let i = plants.length - 1; i >= 0; i--) {
        const p = plants[i];
        p.update(currentClimate, plants, globalKuramotoCoupling);
        if (p.energy <= 0 || p.age > p.maxAge) {
          const gx = Math.floor(p.x / SUB_SCALE);
          const gy = Math.floor(p.y / SUB_SCALE);
          const sIndex = subIdx(gx, gy);
          D_field[sIndex] = Math.min(8.0, D_field[sIndex] + 1.2);
          spawnDecayPuff(p.x, p.y, 'flora');
          injectMorphogen(p.x, p.y, 2, -0.2, 0.2);

          if (p.parent) {
            const idx = p.parent.children.indexOf(p);
            if (idx !== -1) p.parent.children.splice(idx, 1);
          }
          plants.splice(i, 1);
        }
      }

      // Step Flocking Grazers
      for (let i = grazers.length - 1; i >= 0; i--) {
        grazers[i].update(currentClimate, grazers, apexPredators, plants, now);
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

      // Marine Snow with Curl Flow
      for (let i = 0; i < marineSnow.length; i++) {
        const s = marineSnow[i];
        const vel = getCurlVelocity(s.x, s.y, now);

        let gravX = 0, gravY = 0;
        for (let a = 0; a < apexPredators.length; a++) {
          const apex = apexPredators[a];
          const dx = apex.x - s.x;
          const dy = apex.y - s.y;
          const distSq = dx * dx + dy * dy + 400.0;
          const dist = Math.sqrt(distSq);
          if (dist < 120) {
            const f = (apex.mass * 1.8) / distSq;
            gravX += (dx / dist) * f;
            gravY += (dy / dist) * f;
          }
        }

        s.x = (s.x + (vel.u + gravX) * s.depth * 0.4 + width) % width;
        s.y = (s.y + (vel.v + gravY) * s.depth * 0.4 + height) % height;
      }

      if (now - lastTick > 350) {
        updateTelemetryUI(currentClimate);
        lastTick = now;
      }
    }

    // --- DRAWING STAGE ---

    // 1. Natural Sand Substrate with Reaction-Diffusion Shadow Veins & Mineral Loam
    if (showSubstrate) {
      const imgData = subCtx.createImageData(SUB_COLS, SUB_ROWS);
      const data = imgData.data;
      const sand = currentClimate.sandHue;

      for (let y = 0; y < SUB_ROWS; y++) {
        for (let x = 0; x < SUB_COLS; x++) {
          const i = subIdx(x, y);
          const pIdx = (x + y * SUB_COLS) * 4;
          const sVal = S_field[i] / 10.0;
          const dVal = D_field[i] / 8.0;
          const aVal = A_field[i] / 6.0;
          const turingV = Turing_V[i];
          const turingU = Turing_U[i];

          // Sand base (white to golden beige) with darker reef trench shadowing
          const shadow = (1.0 - turingU) * 45 + dVal * 35;
          const mineralGlow = sVal * 25 + turingV * 30;

          const r = Math.max(12, Math.min(255, Math.floor(sand.r * 0.28 + aVal * 180 + mineralGlow * 1.2 - shadow * 0.6)));
          const g = Math.max(22, Math.min(255, Math.floor(sand.g * 0.32 + sVal * 40 + turingV * 55 - shadow * 0.4)));
          const b = Math.max(20, Math.min(255, Math.floor(sand.b * 0.30 + turingV * 45 + (1.0 - turingU) * 20)));
          const alpha = Math.min(255, Math.floor((0.75 + sVal * 0.15 + turingV * 0.10) * 255));

          data[pIdx] = r;
          data[pIdx + 1] = g;
          data[pIdx + 2] = b;
          data[pIdx + 3] = alpha;
        }
      }

      subCtx.putImageData(imgData, 0, 0);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(subCanvas, 0, 0, width, height);
      ctx.restore();
    }

    // 2. Turquoise Water Movement & Surface Caustic Shimmers
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const tWater = now * 0.0008;
    const causticGrad = ctx.createRadialGradient(
      width * 0.5 + Math.sin(tWater) * 60,
      height * 0.4 + Math.cos(tWater * 0.7) * 40,
      10,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.7
    );
    const tint = currentClimate.waterTint;
    causticGrad.addColorStop(0, `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.18)`);
    causticGrad.addColorStop(0.5, `rgba(${tint.r * 0.6}, ${tint.g * 0.8}, ${tint.b}, 0.09)`);
    causticGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = causticGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 3. Gravitational Apex Lensing Halo Wakes (Amber-Crimson Shadow)
    for (let a = 0; a < apexPredators.length; a++) {
      const apex = apexPredators[a];
      const haloRadius = apex.isSprinting ? 60 : 45;
      const grad = ctx.createRadialGradient(apex.x, apex.y, 4, apex.x, apex.y, haloRadius);
      grad.addColorStop(0, apex.isSprinting ? 'rgba(255, 107, 53, 0.35)' : 'rgba(211, 84, 0, 0.20)');
      grad.addColorStop(0.5, apex.isSprinting ? 'rgba(192, 57, 43, 0.18)' : 'rgba(120, 40, 20, 0.08)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(apex.x, apex.y, haloRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Sunlit Marine Snow Specks
    ctx.save();
    for (let i = 0; i < marineSnow.length; i++) {
      const s = marineSnow[i];
      ctx.fillStyle = `rgba(225, 248, 245, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 5. Species-Colored Dendritic Coral Tendrils
    for (let i = 0; i < plants.length; i++) {
      const p = plants[i];
      if (p.parent && plants.includes(p.parent)) {
        const dist = Math.hypot(p.parent.x - p.x, p.parent.y - p.y);
        if (dist < 45) {
          const firing = p.phi > 0.05 || p.parent.phi > 0.05;
          const w = p.parent.synapseWeights.get(p) || 1.0;
          const phaseSyncBrightness = (Math.sin(p.theta) + 1.0) * 0.5;
          const pal = CORAL_PALETTES[p.speciesIdx] || CORAL_PALETTES[0];

          const alpha = firing ? Math.min(0.90, 0.45 * w) : Math.min(0.40, (0.15 + phaseSyncBrightness * 0.18) * w);
          ctx.strokeStyle = firing ? '#ffffff' : `${pal.stem}${alpha})`;
          ctx.lineWidth = firing ? 2.0 : 1.1 + phaseSyncBrightness * 0.4;

          const sway = Math.sin(p.theta) * 2.2;
          const midX = (p.parent.x + p.x) * 0.5 + sway;
          const midY = (p.parent.y + p.y) * 0.5;

          ctx.beginPath();
          ctx.moveTo(p.parent.x, p.parent.y);
          ctx.quadraticCurveTo(midX, midY, p.x, p.y);
          ctx.stroke();
        }
      }
    }

    // 6. Autotroph Polyps (Multi-Hue Coral Blooms)
    for (let i = 0; i < plants.length; i++) {
      const p = plants[i];
      const pal = CORAL_PALETTES[p.speciesIdx] || CORAL_PALETTES[0];
      const breath = (Math.sin(p.theta) + 1.0) * 0.5;
      const r = Math.min(6.5, 2.4 + (p.energy / 15.0) + p.phi * 2.2 + breath * 0.8);

      ctx.beginPath();
      ctx.fillStyle = p.phi > 0.1 ? pal.flash : pal.polyp;
      ctx.shadowColor = p.phi > 0.1 ? '#ffffff' : pal.polyp;
      ctx.shadowBlur = p.phi > 0.1 ? 12 : 3 + breath * 4;
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 7. Bioluminescent Traveling Sparks (Electric Cyan / Gold Pulses)
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      if (Math.hypot(sp.x1 - sp.x2, sp.y1 - sp.y2) > 45) {
        sparks.splice(i, 1);
        continue;
      }

      sp.sigma += sp.v;
      if (sp.sigma >= 1.0) {
        sparks.splice(i, 1);
      } else {
        const sx = (1 - sp.sigma) * sp.x1 + sp.sigma * sp.x2;
        const sy = (1 - sp.sigma) * sp.y1 + sp.sigma * sp.y2;
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 8;
        ctx.arc(sx, sy, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;

    // 8. Benthic Crabs (Warm Hermit Terracotta)
    for (let i = 0; i < benthicCrabs.length; i++) {
      const b = benthicCrabs[i];
      ctx.beginPath();
      ctx.fillStyle = '#e67e22';
      ctx.shadowColor = 'rgba(230, 126, 34, 0.4)';
      ctx.shadowBlur = 4;
      ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 9. Grazers (Electric Cyan / Sapphire Reef Fish with Golden Fins)
    for (let i = 0; i < grazers.length; i++) {
      const g = grazers[i];
      const heading = Math.atan2(g.vy, g.vx);

      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(heading);

      // Streamlined body
      ctx.beginPath();
      ctx.fillStyle = g.genome.isArmored ? '#f39c12' : '#00d2d3';
      ctx.shadowColor = g.genome.isArmored ? '#f39c12' : '#00f2fe';
      ctx.shadowBlur = 5;
      ctx.ellipse(0, 0, 4.2, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden tail fin
      ctx.beginPath();
      ctx.fillStyle = '#feca57';
      ctx.arc(-3.5, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // 10. Apex Predators (Tiger Amber / Ruby Hunter Leviathans)
    for (let i = 0; i < apexPredators.length; i++) {
      const a = apexPredators[i];
      const heading = Math.atan2(a.vy, a.vx);

      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(heading);

      ctx.beginPath();
      ctx.fillStyle = a.isSprinting ? '#ee5253' : '#ff9f43';
      ctx.shadowColor = a.isSprinting ? '#ff6b6b' : '#ee5253';
      ctx.shadowBlur = a.isSprinting ? 18 : 10;
      const len = a.isSprinting ? 8.5 : 6.8;
      ctx.ellipse(0, 0, len + Math.sin(a.pulse) * 0.8, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dorsal stripe
      ctx.beginPath();
      ctx.fillStyle = '#222f3e';
      ctx.ellipse(-1.0, 0, 2.8, 1.0, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // 11. Soft Atmospheric Decay Puffs
    for (let i = decayPuffs.length - 1; i >= 0; i--) {
      const p = decayPuffs[i];
      p.x += p.vx;
      p.y += p.vy;
      p.r += 0.15;
      p.alpha -= 0.025;
      if (p.alpha <= 0) {
        decayPuffs.splice(i, 1);
      } else {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
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
      updateSeasonalCycle();
      stepSubstrates(currentClimate);
      updateTelemetryUI(currentClimate);
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
      seasonalTime += Math.PI * 0.5;
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

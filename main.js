// Synapse Reef v2.5 - Living Ocean Dynamics Engine
// Part 1: Kuramoto Coupled Oscillator Phase-Locking, Reynolds Flocking Shoals,
// Divergence-Free Incompressible Curl-Noise Marine Snow, and Inertial Trophic Dynamics

(function () {
  'use strict';

  // --- Canvas Setup & High-DPI Scaling ---
  const canvas = document.getElementById('reefCanvas');
  const ctx = canvas.getContext('2d');
  const drawer = document.getElementById('telemetryDrawer');
  const drawerToggle = document.getElementById('drawerToggle');
  const drawerIndicator = document.getElementById('drawerIndicator');

  // Substrate buffer for fluid background PDE
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

  // --- Climate Regimes State Machine ---
  const CLIMATES = [
    { name: 'Verdant Solstice', alpha_sun: 1.05, beta_climate: 0.005, temp: 25.5, lux: 100, ph: 8.15 },
    { name: 'Nutrient Monsoon', alpha_sun: 0.85, beta_climate: 0.015, temp: 23.5, lux: 75, ph: 8.05 },
    { name: 'Arid Eclipse', alpha_sun: 0.65, beta_climate: 0.001, temp: 28.0, lux: 45, ph: 8.25 },
    { name: 'Bioluminescent Bloom', alpha_sun: 1.25, beta_climate: 0.008, temp: 26.2, lux: 120, ph: 8.20 }
  ];
  let currentClimateIdx = 0;
  let climateTick = 0;

  // --- Curl Noise Field for Fluid Marine Drift (Divergence-Free Flow) ---
  function getCurlVelocity(x, y, t) {
    const scale = 0.004;
    const eps = 1.0;
    const tScale = t * 0.0003;

    // Numerical partial derivatives of potential field psi(x,y)
    const psi_x1 = Math.sin((x + eps) * scale + tScale) * Math.cos(y * scale);
    const psi_x0 = Math.sin((x - eps) * scale + tScale) * Math.cos(y * scale);
    const psi_y1 = Math.sin(x * scale + tScale) * Math.cos((y + eps) * scale);
    const psi_y0 = Math.sin(x * scale + tScale) * Math.cos((y - eps) * scale);

    const dPsi_dy = (psi_y1 - psi_y0) / (2 * eps);
    const dPsi_dx = (psi_x1 - psi_x0) / (2 * eps);

    // u = dPsi/dy, v = -dPsi/dx (guaranteed zero divergence incompressible flow)
    return {
      u: dPsi_dy * 45.0,
      v: -dPsi_dx * 45.0 + 0.15 // Gentle downward gravitational settling
    };
  }

  // --- Marine Snow Particles ---
  const marineSnow = [];
  const SNOW_COUNT = 45;

  function initMarineSnow() {
    marineSnow.length = 0;
    for (let i = 0; i < SNOW_COUNT; i++) {
      marineSnow.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.8 + Math.random() * 1.4,
        alpha: 0.2 + Math.random() * 0.35,
        depth: 0.5 + Math.random() * 0.5
      });
    }
  }

  // --- Substrate PDE Fields ---
  let S_field, D_field, A_field;

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

    for (let y = 0; y < SUB_ROWS; y++) {
      const depthBias = 1.0 + (y / SUB_ROWS) * 2.2;
      for (let x = 0; x < SUB_COLS; x++) {
        const i = x + y * SUB_COLS;
        S_field[i] = (2.5 + Math.random() * 2.5) * depthBias;
        D_field[i] = (0.4 + Math.random() * 1.2) * depthBias;
        A_field[i] = 0.0;
      }
    }
  }

  // --- Kuramoto Coupled Oscillator Autotrophs ---
  const plants = [];
  const sparks = [];
  const decayPuffs = [];
  const MAX_PLANTS = 150;
  let globalKuramotoCoupling = 0.04; // Baseline coupling; spikes during feeding/action waves

  class DendriticAutotroph {
    constructor(x, y, parent, generation, genome) {
      this.x = x;
      this.y = y;
      this.parent = parent || null;
      this.children = [];
      this.synapseWeights = new Map();

      this.energy = 16.0;
      this.age = 0;
      this.maxAge = 550 + Math.floor(Math.random() * 300);
      this.phi = 0.0;
      this.defCalc = 0;
      this.generation = generation || 1;

      // Kuramoto Phase Variables
      this.theta = Math.random() * Math.PI * 2;          // Oscillator Phase [0, 2pi]
      this.naturalFreq = 0.025 + (Math.random() - 0.5) * 0.008; // Intrinsic natural frequency omega_i

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

      // Kuramoto Phase Coupling Step: dTheta/dt = omega_i + (K/N)*sum(sin(theta_j - theta_i))
      let phaseCouplingSum = 0;
      let connectedCount = 0;

      // Primary coupling to direct tree parent and children
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

      // Synaptic relaxation
      for (const [child, w] of this.synapseWeights.entries()) {
        if (!allPlants.includes(child)) {
          this.synapseWeights.delete(child);
          const cIdx = this.children.indexOf(child);
          if (cIdx !== -1) this.children.splice(cIdx, 1);
        } else {
          this.synapseWeights.set(child, Math.max(1.0, w - 0.002));
        }
      }

      // Soil loam absorption
      const gx = Math.floor(this.x / SUB_SCALE);
      const gy = Math.floor(this.y / SUB_SCALE);
      const sIndex = subIdx(gx, gy);
      const u = Math.min(S_field[sIndex], this.genome.nu);
      S_field[sIndex] -= u;

      // Local crowding
      let localCrowd = 0;
      for (let i = 0; i < allPlants.length; i++) {
        const other = allPlants[i];
        if (other === this) continue;
        if (Math.hypot(other.x - this.x, other.y - this.y) < 22) localCrowd++;
      }

      if (localCrowd > 4) {
        this.energy -= 1.4 * this.genome.mu_p;
      } else {
        this.energy += (this.genome.gamma * climate.alpha_sun + u) - this.genome.mu_p;
      }

      // Directional dendritic branching (clamped inside bounds)
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
          const child = new DendriticAutotroph(childX, childY, this, this.generation + 1);
          plants.push(child);
        }
      }
    }
  }

  // --- Reynolds Boids Flocking Grazers ---
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
      this.genome = genome || {
        b_eff: 3.6,
        r_sense: 80,
        r_flock: 45,
        isArmored: Math.random() < 0.25,
        maxSpeed: 1.4
      };
      this.pulse = Math.random() * Math.PI * 2;
    }

    update(climate, allGrazers, allApex, allPlants, now) {
      this.age++;
      this.energy -= 0.11;
      this.pulse += 0.08;

      // 1. Fluid Curl Current Drift
      const curl = getCurlVelocity(this.x, this.y, now);

      // 2. Reynolds Flocking Forces (Separation, Alignment, Cohesion)
      let sepX = 0, sepY = 0;
      let alignX = 0, alignY = 0;
      let cohX = 0, cohY = 0;
      let flockNeighbors = 0;

      for (let i = 0; i < allGrazers.length; i++) {
        const other = allGrazers[i];
        if (other === this) continue;
        const dist = Math.hypot(other.x - this.x, other.y - this.y);

        if (dist > 0 && dist < this.genome.r_flock) {
          // Separation
          if (dist < 18) {
            sepX += (this.x - other.x) / dist;
            sepY += (this.y - other.y) / dist;
          }
          // Alignment
          alignX += other.vx;
          alignY += other.vy;
          // Cohesion
          cohX += other.x;
          cohY += other.y;
          flockNeighbors++;
        }
      }

      let flockVx = 0;
      let flockVy = 0;
      if (flockNeighbors > 0) {
        alignX /= flockNeighbors;
        alignY /= flockNeighbors;
        cohX = (cohX / flockNeighbors) - this.x;
        cohY = (cohY / flockNeighbors) - this.y;

        flockVx = sepX * 0.35 + alignX * 0.15 + cohX * 0.04;
        flockVy = sepY * 0.35 + alignY * 0.15 + cohY * 0.04;
      }

      // 3. Apex Predator Flash Evasion
      let evadeX = 0, evadeY = 0;
      for (let i = 0; i < allApex.length; i++) {
        const predator = allApex[i];
        const pDist = Math.hypot(predator.x - this.x, predator.y - this.y);
        if (pDist < 90) {
          evadeX += (this.x - predator.x) / (pDist * 0.5);
          evadeY += (this.y - predator.y) / (pDist * 0.5);
        }
      }

      // 4. Foraging Steering
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

        if (closestDist < 10 && closestPlant.energy > 0) {
          const defFactor = closestPlant.defCalc > 0 ? 0.5 : 1.0;
          const bite = Math.min(closestPlant.energy, this.genome.b_eff * defFactor);
          closestPlant.energy -= bite;
          this.energy += bite * 0.9;
          closestPlant.phi = 1.0;
          globalKuramotoCoupling = 0.22; // Spike Kuramoto coupling on graze event!
          propagateWave(closestPlant);
        }
      }

      // Combine Steering Vectors with Smooth Fluid Momentum
      const totalDesiredX = curl.u * 0.15 + flockVx * 0.8 + evadeX * 2.2 + forageVx * 1.0;
      const totalDesiredY = curl.v * 0.15 + flockVy * 0.8 + evadeY * 2.2 + forageVy * 1.0;

      this.vx += (totalDesiredX - this.vx) * 0.08;
      this.vy += (totalDesiredY - this.vy) * 0.08;

      const spd = Math.hypot(this.vx, this.vy);
      if (spd > this.genome.maxSpeed * 1.45) {
        this.vx = (this.vx / spd) * (this.genome.maxSpeed * 1.45);
        this.vy = (this.vy / spd) * (this.genome.maxSpeed * 1.45);
      }

      this.x = (this.x + this.vx + width) % width;
      this.y = (this.y + this.vy + height) % height;

      if (this.energy > 85.0 && allGrazers.length < 65) {
        this.energy -= 40.0;
        grazers.push(new FlockingGrazer((this.x + 6) % width, (this.y + 6) % height, mutateGenome(this.genome)));
      }
    }
  }

  class OrganicApex {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = (Math.random() - 0.5) * 1.5;
      this.energy = 95.0;
      this.maxSpeed = 1.65;
      this.r_hunt = 145;
      this.pulse = Math.random() * Math.PI;
    }

    update() {
      this.energy -= 0.15;
      this.pulse += 0.05;

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
        desiredVx = (dx / nearest.dist) * this.maxSpeed;
        desiredVy = (dy / nearest.dist) * this.maxSpeed;

        if (nearest.dist < 12) {
          const gx = Math.floor(this.x / SUB_SCALE);
          const gy = Math.floor(this.y / SUB_SCALE);
          const sIndex = subIdx(gx, gy);

          if (nearest.g.genome.isArmored && Math.random() < 0.65) {
            A_field[sIndex] = Math.min(8.0, A_field[sIndex] + 2.5);
            this.energy -= 4.0;
            this.vx *= -0.8;
            this.vy *= -0.8;
          } else {
            this.energy = Math.min(130.0, this.energy + 35.0);
            A_field[sIndex] = Math.min(8.0, A_field[sIndex] + 4.5);
            spawnDecayPuff(nearest.g.x, nearest.g.y, 'grazer');
            grazers.splice(nearest.idx, 1);
          }
        }
      } else {
        desiredVx += (Math.random() - 0.5) * 0.3;
        desiredVy += (Math.random() - 0.5) * 0.3;
      }

      this.vx += (desiredVx - this.vx) * 0.06;
      this.vy += (desiredVy - this.vy) * 0.06;
      this.x = (this.x + this.vx + width) % width;
      this.y = (this.y + this.vy + height) % height;

      if (this.energy > 150.0 && apexPredators.length < 7) {
        this.energy -= 70.0;
        apexPredators.push(new OrganicApex(this.x, this.y));
      }
    }
  }

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
      r_flock: Math.min(60, Math.max(25, (g.r_flock || 45) * mut())),
      isArmored: Math.random() < 0.15 ? !g.isArmored : g.isArmored,
      maxSpeed: Math.max(0.7, Math.min(2.1, g.maxSpeed * mut()))
    };
  }

  function spawnDecayPuff(x, y, type) {
    const color = type === 'apex' ? '231, 76, 60' : type === 'crab' ? '230, 126, 34' : '46, 204, 113';
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

  // --- Dendritic Action Potential Propagation ---
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

  // --- Multi-Colony Seabed Seeding ---
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
      const root = new DendriticAutotroph(rootX, rootY, null, 1);
      plants.push(root);

      for (let b = 0; b < 2; b++) {
        const bAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
        const bDist = 16 + Math.random() * 8;
        const bX = Math.max(12, Math.min(width - 12, rootX + Math.cos(bAngle) * bDist));
        const bY = Math.max(12, Math.min(height - 12, rootY + Math.sin(bAngle) * bDist));
        plants.push(new DendriticAutotroph(bX, bY, root, 2));
      }
    }

    for (let i = 0; i < 38; i++) grazers.push(new FlockingGrazer(Math.random() * width, Math.random() * height));
    for (let i = 0; i < 16; i++) benthicCrabs.push(new OrganicBenthicCrab(Math.random() * width));
    for (let i = 0; i < 4; i++) apexPredators.push(new OrganicApex(Math.random() * width, Math.random() * height));
  }

  // --- Fluid PDE Diffusion Step ---
  function stepSubstrates(climate) {
    const total = SUB_COLS * SUB_ROWS;
    const nextA = new Float32Array(total);

    for (let x = 0; x < SUB_COLS; x++) {
      for (let y = 0; y < SUB_ROWS; y++) {
        const idx = subIdx(x, y);

        // Mineralization
        const dVal = D_field[idx];
        const deltaD = -0.015 * dVal + climate.beta_climate;
        D_field[idx] = Math.max(0.0, dVal + deltaD);
        S_field[idx] = Math.min(10.0, S_field[idx] + 1.3 * Math.abs(deltaD));

        // Isotropic Pheromone Diffusion (Moore N8)
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

  // --- Telemetry Sync ---
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
    if (mEnv) mEnv.textContent = `Water Temp: ${climate.temp.toFixed(1)}°C | Solar: ${climate.lux}% | pH: ${climate.ph.toFixed(2)}`;
  }

  // --- Main Simulation Loop ---
  let isPaused = false;
  let showSubstrate = true;
  let lastTick = performance.now();

  function loop(now) {
    requestAnimationFrame(loop);

    ctx.clearRect(0, 0, width, height);
    const climate = CLIMATES[currentClimateIdx];

    if (!isPaused) {
      climateTick++;
      if (climateTick > 450) {
        climateTick = 0;
        currentClimateIdx = (currentClimateIdx + 1) % CLIMATES.length;
      }

      // Relax global Kuramoto coupling toward baseline
      globalKuramotoCoupling = Math.max(0.04, globalKuramotoCoupling - 0.001);

      stepSubstrates(climate);

      // Step autotrophs (Kuramoto Coupled Oscillators)
      for (let i = plants.length - 1; i >= 0; i--) {
        const p = plants[i];
        p.update(climate, plants, globalKuramotoCoupling);
        if (p.energy <= 0 || p.age > p.maxAge) {
          const gx = Math.floor(p.x / SUB_SCALE);
          const gy = Math.floor(p.y / SUB_SCALE);
          const sIndex = subIdx(gx, gy);
          D_field[sIndex] = Math.min(8.0, D_field[sIndex] + 1.2);
          spawnDecayPuff(p.x, p.y, 'flora');

          if (p.parent) {
            const idx = p.parent.children.indexOf(p);
            if (idx !== -1) p.parent.children.splice(idx, 1);
          }
          plants.splice(i, 1);
        }
      }

      // Step Flocking Grazers (Reynolds Boids + Lotka-Volterra)
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

      // Update Marine Snow with Incompressible Curl Field
      for (let i = 0; i < marineSnow.length; i++) {
        const s = marineSnow[i];
        const vel = getCurlVelocity(s.x, s.y, now);
        s.x = (s.x + vel.u * s.depth * 0.4 + width) % width;
        s.y = (s.y + vel.v * s.depth * 0.4 + height) % height;
      }

      if (now - lastTick > 350) {
        updateTelemetryUI(climate);
        lastTick = now;
      }
    }

    // --- DRAWING STAGE ---

    // 1. Ambient Seabed Substrate Map
    if (showSubstrate) {
      const imgData = subCtx.createImageData(SUB_COLS, SUB_ROWS);
      const data = imgData.data;

      for (let y = 0; y < SUB_ROWS; y++) {
        for (let x = 0; x < SUB_COLS; x++) {
          const i = subIdx(x, y);
          const pIdx = (x + y * SUB_COLS) * 4;
          const sVal = S_field[i] / 10.0;
          const dVal = D_field[i] / 8.0;
          const aVal = A_field[i] / 6.0;

          data[pIdx] = Math.min(255, Math.floor(aVal * 220 + 8));
          data[pIdx + 1] = Math.min(255, Math.floor(sVal * 160 + 25));
          data[pIdx + 2] = Math.min(255, Math.floor(dVal * 120 + 18));
          data[pIdx + 3] = Math.min(255, Math.floor((0.15 + sVal * 0.22 + dVal * 0.15 + aVal * 0.35) * 255));
        }
      }

      subCtx.putImageData(imgData, 0, 0);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = 0.95;
      ctx.drawImage(subCanvas, 0, 0, width, height);
      ctx.restore();
    }

    // 2. Marine Snow Drift Eddies
    ctx.save();
    for (let i = 0; i < marineSnow.length; i++) {
      const s = marineSnow[i];
      ctx.fillStyle = `rgba(180, 235, 210, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Dendritic Tendrils with Kuramoto Harmonic Glow
    for (let i = 0; i < plants.length; i++) {
      const p = plants[i];
      if (p.parent && plants.includes(p.parent)) {
        const dist = Math.hypot(p.parent.x - p.x, p.parent.y - p.y);
        if (dist < 45) {
          const firing = p.phi > 0.05 || p.parent.phi > 0.05;
          const w = p.parent.synapseWeights.get(p) || 1.0;
          const phaseSyncBrightness = (Math.sin(p.theta) + 1.0) * 0.5; // Harmonic breathing pulse
          const alpha = firing ? Math.min(0.85, 0.35 * w) : Math.min(0.35, (0.10 + phaseSyncBrightness * 0.15) * w);

          ctx.strokeStyle = firing ? `rgba(46, 230, 160, ${alpha})` : `rgba(34, 165, 100, ${alpha})`;
          ctx.lineWidth = firing ? 1.8 : 1.0 + phaseSyncBrightness * 0.4;

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

    // 4. Autotroph Polyps with Kuramoto Synchronous Bioluminescence
    for (let i = 0; i < plants.length; i++) {
      const p = plants[i];
      const breath = (Math.sin(p.theta) + 1.0) * 0.5; // [0, 1] synchronous breathing
      const r = Math.min(6.5, 2.4 + (p.energy / 15.0) + p.phi * 2.2 + breath * 0.8);

      ctx.beginPath();
      ctx.fillStyle = p.phi > 0.1 ? '#a3e4d7' : `rgba(46, ${Math.floor(180 + breath * 60)}, ${Math.floor(110 + breath * 40)}, 0.95)`;
      ctx.shadowColor = p.phi > 0.1 ? '#48c9b0' : 'rgba(46, 204, 113, 0.45)';
      ctx.shadowBlur = p.phi > 0.1 ? 10 : 3 + breath * 4;
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 5. Bioluminescent Traveling Sparks
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
        ctx.shadowColor = '#58d68d';
        ctx.shadowBlur = 7;
        ctx.arc(sx, sy, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;

    // 6. Benthic Crabs
    for (let i = 0; i < benthicCrabs.length; i++) {
      const b = benthicCrabs[i];
      ctx.beginPath();
      ctx.fillStyle = '#e67e22';
      ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Flocking Grazers (Oriented Shoal Fish Heading)
    for (let i = 0; i < grazers.length; i++) {
      const g = grazers[i];
      const heading = Math.atan2(g.vy, g.vx);
      const glow = Math.sin(g.pulse) * 1.2;

      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(heading);

      // Organic fish tear-drop/fin morphology
      ctx.beginPath();
      ctx.fillStyle = g.genome.isArmored ? '#f39c12' : '#2ecc71';
      ctx.shadowColor = g.genome.isArmored ? '#f39c12' : '#2ecc71';
      ctx.shadowBlur = 5;
      ctx.ellipse(0, 0, 4.0 + glow * 0.3, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // 8. Apex Predators (Stalking Leviathan Halos)
    for (let i = 0; i < apexPredators.length; i++) {
      const a = apexPredators[i];
      const heading = Math.atan2(a.vy, a.vx);

      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(heading);

      ctx.beginPath();
      ctx.fillStyle = '#e74c3c';
      ctx.shadowColor = '#e74c3c';
      ctx.shadowBlur = 12;
      ctx.ellipse(0, 0, 6.5 + Math.sin(a.pulse) * 0.8, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // 9. Soft Atmospheric Decay Puffs
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
      const climate = CLIMATES[currentClimateIdx];
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
      globalKuramotoCoupling = 0.35; // Global synchronization cascade on pulse!
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

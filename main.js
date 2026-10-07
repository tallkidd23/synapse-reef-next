// Synapse Reef v2.2 - Organic Emergence Engine
// Non-grid continuous plant positioning, proximity-based organic mycelial axons,
// smooth fluid-diffusion substrate background, and inertial steering dynamics.

(function () {
  'use strict';

  // --- Canvas Setup & High-DPI Scaling ---
  const canvas = document.getElementById('reefCanvas');
  const ctx = canvas.getContext('2d');
  const drawer = document.getElementById('telemetryDrawer');
  const drawerToggle = document.getElementById('drawerToggle');
  const drawerIndicator = document.getElementById('drawerIndicator');

  // Offscreen buffer for smooth fluid PDE substrate rendering
  const subCanvas = document.createElement('canvas');
  const subCtx = subCanvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;

  // Discrete Torus substrate resolution (downscaled for fluid blur interpolation)
  const SUB_SCALE = 8;
  let SUB_COLS = 40;
  let SUB_ROWS = 30;

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

  // --- Continuous Substrate Fields on Torus T^2 ---
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

    for (let i = 0; i < total; i++) {
      S_field[i] = 3.5 + Math.random() * 3.5;
      D_field[i] = 0.5 + Math.random() * 1.5;
      A_field[i] = 0.0;
    }
  }

  // --- Non-Grid Autotrophs (Organic Polyp Morphology) ---
  const plants = [];
  const sparks = [];
  const decayPuffs = [];
  const MAX_PLANTS = 110;
  const AXON_CONNECT_RADIUS = 34; // Max distance for proximity axon binding

  class OrganicAutotroph {
    constructor(x, y, energy, generation, genome) {
      this.x = x;
      this.y = y;
      this.energy = energy || 14.0;
      this.age = 0;
      this.maxAge = 450 + Math.floor(Math.random() * 250);
      this.phi = 0.0; // Neural membrane voltage
      this.defCalc = 0;
      this.generation = generation || 1;
      this.breathingPhase = Math.random() * Math.PI * 2;
      this.breathingSpeed = 0.03 + Math.random() * 0.02;
      this.synapses = new Map(); // Map<targetPlant, weight>

      this.genome = genome || {
        gamma: 0.45,      // Photosynthetic efficiency
        mu_p: 0.12,       // Maintenance cost
        nu: 0.40,         // Mineral uptake
        theta_rep: 32.0,  // Budding threshold
        c_rep: 15.0,      // Budding cost
        maxNeighbors: 5   // Crowding limit
      };
    }

    update(climate) {
      this.age++;
      this.phi = Math.max(0.0, this.phi - 0.035);
      if (this.defCalc > 0) this.defCalc--;

      // Relax and prune dead synapses
      for (const [target, w] of this.synapses.entries()) {
        if (!plants.includes(target) || Math.hypot(target.x - this.x, target.y - this.y) > AXON_CONNECT_RADIUS * 1.2) {
          this.synapses.delete(target);
        } else {
          this.synapses.set(target, Math.max(1.0, w - 0.002));
        }
      }

      // Sample substrate loam at continuous location
      const gx = Math.floor(this.x / SUB_SCALE);
      const gy = Math.floor(this.y / SUB_SCALE);
      const sIndex = subIdx(gx, gy);

      const u = Math.min(S_field[sIndex], this.genome.nu);
      S_field[sIndex] -= u;

      // Count local crowding within radius
      let neighborCount = 0;
      for (let i = 0; i < plants.length; i++) {
        const other = plants[i];
        if (other === this) continue;
        const d = Math.hypot(other.x - this.x, other.y - this.y);
        if (d < 24) neighborCount++;
      }

      // Net energy delta
      if (neighborCount >= this.genome.maxNeighbors) {
        this.energy -= 1.6 * this.genome.mu_p;
      } else {
        this.energy += (this.genome.gamma * climate.alpha_sun + u) - this.genome.mu_p;
      }

      // Clonal budding into organic radial branch
      if (this.energy >= this.genome.theta_rep && neighborCount < 4 && plants.length < MAX_PLANTS && Math.random() < 0.2) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 16 + Math.random() * 14;
        const childX = (this.x + Math.cos(angle) * dist + width) % width;
        const childY = (this.y + Math.sin(angle) * dist + height) % height;

        this.energy -= this.genome.c_rep;
        const child = new OrganicAutotroph(childX, childY, 10.0, this.generation + 1);
        plants.push(child);

        // Bind immediate parent-child synapse
        this.synapses.set(child, 1.4);
      }
    }
  }

  // --- Heterotrophs with Smooth Inertial Steering ---
  const grazers = [];
  const apexPredators = [];
  const benthicCrabs = [];

  class OrganicGrazer {
    constructor(x, y, genome) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 1.2;
      this.vy = (Math.random() - 0.5) * 1.2;
      this.energy = 50.0;
      this.age = 0;
      this.genome = genome || {
        b_eff: 3.6,
        r_sense: 75,
        isArmored: Math.random() < 0.25,
        maxSpeed: 1.4
      };
      this.pulse = Math.random() * Math.PI * 2;
    }

    update(climate) {
      this.age++;
      this.energy -= 0.11;
      this.pulse += 0.08;

      const gx = Math.floor(this.x / SUB_SCALE);
      const gy = Math.floor(this.y / SUB_SCALE);

      // 1. Alarm Pheromone Avoidance Steering
      let fleeX = 0;
      let fleeY = 0;
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const aVal = A_field[subIdx(gx + dx, gy + dy)];
          if (aVal > 0.1) {
            fleeX -= dx * aVal;
            fleeY -= dy * aVal;
          }
        }
      }

      let desiredVx = 0;
      let desiredVy = 0;
      const fleeMag = Math.hypot(fleeX, fleeY);

      if (fleeMag > 0.3) {
        desiredVx = (fleeX / fleeMag) * (this.genome.maxSpeed * 1.4);
        desiredVy = (fleeY / fleeMag) * (this.genome.maxSpeed * 1.4);
      } else {
        // 2. Foraging Steering toward closest autotroph within sense radius
        let closestDist = Infinity;
        let targetPlant = null;

        for (let i = 0; i < plants.length; i++) {
          const p = plants[i];
          if (p.energy <= 1.0) continue;
          const d = Math.hypot(p.x - this.x, p.y - this.y);
          if (d < this.genome.r_sense && d < closestDist) {
            closestDist = d;
            targetPlant = p;
          }
        }

        if (targetPlant) {
          const dx = targetPlant.x - this.x;
          const dy = targetPlant.y - this.y;
          desiredVx = (dx / closestDist) * this.genome.maxSpeed;
          desiredVy = (dy / closestDist) * this.genome.maxSpeed;

          // Grazing contact
          if (closestDist < 10 && targetPlant.energy > 0) {
            const defFactor = targetPlant.defCalc > 0 ? 0.5 : 1.0;
            const bite = Math.min(targetPlant.energy, this.genome.b_eff * defFactor);
            targetPlant.energy -= bite;
            this.energy += bite * 0.9;
            targetPlant.phi = 1.0;
            propagateWave(targetPlant);
          }
        } else {
          desiredVx = this.vx + (Math.random() - 0.5) * 0.4;
          desiredVy = this.vy + (Math.random() - 0.5) * 0.4;
        }
      }

      // Smooth inertia steering (prevents robotic twitching)
      this.vx += (desiredVx - this.vx) * 0.08;
      this.vy += (desiredVy - this.vy) * 0.08;

      const spd = Math.hypot(this.vx, this.vy);
      if (spd > this.genome.maxSpeed * 1.4) {
        this.vx = (this.vx / spd) * (this.genome.maxSpeed * 1.4);
        this.vy = (this.vy / spd) * (this.genome.maxSpeed * 1.4);
      }

      this.x = (this.x + this.vx + width) % width;
      this.y = (this.y + this.vy + height) % height;

      if (this.energy > 85.0 && grazers.length < 60) {
        this.energy -= 40.0;
        grazers.push(new OrganicGrazer((this.x + 6) % width, (this.y + 6) % height, mutateGenome(this.genome)));
      }
    }
  }

  class OrganicApex {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = (Math.random() - 0.5) * 1.5;
      this.energy = 90.0;
      this.maxSpeed = 1.6;
      this.r_hunt = 140;
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
      this.y = y || height * 0.78 + Math.random() * (height * 0.18);
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
      this.y = Math.min(height - 8, Math.max(height * 0.65, this.y + (Math.random() - 0.5) * 0.3));

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

  // --- Organic Action Potential Propagation ---
  function propagateWave(startPlant) {
    const queue = [{ plant: startPlant, phi: 1.0, depth: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
      const { plant, phi, depth } = queue.shift();
      if (depth > 6 || phi < 0.08) continue;
      if (visited.has(plant)) continue;
      visited.add(plant);

      plant.phi = Math.max(plant.phi, phi);

      // Connect or reinforce proximity synapses on the fly
      for (let i = 0; i < plants.length; i++) {
        const other = plants[i];
        if (other === plant) continue;
        const dist = Math.hypot(other.x - plant.x, other.y - plant.y);

        if (dist <= AXON_CONNECT_RADIUS) {
          let w = plant.synapses.get(other) || 1.0;
          const nextPhi = phi * 0.70 * Math.min(1.2, w);

          // Hebbian weight reinforcement
          plant.synapses.set(other, Math.min(3.0, w + 0.10 * phi * nextPhi));

          // Spawn traveling bioluminescent spark
          sparks.push({
            x1: plant.x,
            y1: plant.y,
            x2: other.x,
            y2: other.y,
            sigma: 0,
            v: 0.12 + Math.random() * 0.05
          });

          queue.push({ plant: other, phi: nextPhi, depth: depth + 1 });
        }
      }
    }
  }

  // --- Ecosystem Seeding ---
  function initEcosystem() {
    plants.length = 0;
    grazers.length = 0;
    apexPredators.length = 0;
    benthicCrabs.length = 0;
    sparks.length = 0;
    decayPuffs.length = 0;

    // Seed 4-6 natural coral reef clusters
    const clusterCount = 5;
    for (let k = 0; k < clusterCount; k++) {
      const cx = 40 + Math.random() * (width - 80);
      const cy = 40 + Math.random() * (height - 80);
      const count = 6 + Math.floor(Math.random() * 6);
      for (let j = 0; j < count; j++) {
        const rAngle = Math.random() * Math.PI * 2;
        const rDist = Math.random() * 32;
        plants.push(new OrganicAutotroph(
          (cx + Math.cos(rAngle) * rDist + width) % width,
          (cy + Math.sin(rAngle) * rDist + height) % height,
          12 + Math.random() * 8
        ));
      }
    }

    for (let i = 0; i < 35; i++) grazers.push(new OrganicGrazer(Math.random() * width, Math.random() * height));
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

  // --- Render Loop ---
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

      stepSubstrates(climate);

      // Step plants
      for (let i = plants.length - 1; i >= 0; i--) {
        const p = plants[i];
        p.update(climate);
        if (p.energy <= 0 || p.age > p.maxAge) {
          const gx = Math.floor(p.x / SUB_SCALE);
          const gy = Math.floor(p.y / SUB_SCALE);
          const sIndex = subIdx(gx, gy);
          D_field[sIndex] = Math.min(8.0, D_field[sIndex] + 1.2);
          spawnDecayPuff(p.x, p.y, 'flora');
          plants.splice(i, 1);
        }
      }

      // Step heterotrophs
      for (let i = grazers.length - 1; i >= 0; i--) {
        grazers[i].update(climate);
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

      if (now - lastTick > 350) {
        updateTelemetryUI(climate);
        lastTick = now;
      }
    }

    // --- DRAWING STAGE ---

    // 1. Smooth Fluid PDE Substrate Map (Rendered via bilinear upscaled buffer)
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

          data[pIdx] = Math.min(255, Math.floor(aVal * 220 + 6));       // R (Alarm)
          data[pIdx + 1] = Math.min(255, Math.floor(sVal * 150 + 20));  // G (Minerals)
          data[pIdx + 2] = Math.min(255, Math.floor(dVal * 110 + 12));  // B (Detritus)
          data[pIdx + 3] = Math.min(255, Math.floor((sVal * 0.18 + dVal * 0.12 + aVal * 0.3) * 255)); // Alpha
        }
      }

      subCtx.putImageData(imgData, 0, 0);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = 0.9;
      ctx.drawImage(subCanvas, 0, 0, width, height);
      ctx.restore();
    }

    // 2. Organic Mycelial Axons (Smooth proximity connections)
    for (let i = 0; i < plants.length; i++) {
      const p1 = plants[i];
      for (const [p2, w] of p1.synapses.entries()) {
        const firing = p1.phi > 0.05 || p2.phi > 0.05;
        const alpha = firing ? Math.min(0.75, 0.28 * w) : Math.min(0.18, 0.05 * w);
        ctx.strokeStyle = firing ? `rgba(46, 230, 150, ${alpha})` : `rgba(30, 140, 85, ${alpha})`;
        ctx.lineWidth = firing ? 1.6 : 0.8;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        const midX = (p1.x + p2.x) * 0.5 + Math.sin(p1.breathingPhase) * 2;
        const midY = (p1.y + p2.y) * 0.5 + Math.cos(p1.breathingPhase) * 2;
        ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
        ctx.stroke();
      }
    }

    // 3. Autotroph Polyps (Continuous non-grid nodes)
    for (let i = 0; i < plants.length; i++) {
      const p = plants[i];
      p.breathingPhase += p.breathingSpeed;
      const breath = Math.sin(p.breathingPhase) * 0.6;
      const r = Math.min(6.0, 2.2 + (p.energy / 16.0) + p.phi * 2.2 + breath);

      ctx.beginPath();
      ctx.fillStyle = p.phi > 0.1 ? '#a3e4d7' : '#2ecc71';
      ctx.shadowColor = p.phi > 0.1 ? '#48c9b0' : 'rgba(46, 204, 113, 0.4)';
      ctx.shadowBlur = p.phi > 0.1 ? 8 : 2;
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 4. Bioluminescent Traveling Sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.sigma += sp.v;
      if (sp.sigma >= 1.0) {
        sparks.splice(i, 1);
      } else {
        const sx = (1 - sp.sigma) * sp.x1 + sp.sigma * sp.x2;
        const sy = (1 - sp.sigma) * sp.y1 + sp.sigma * sp.y2;
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#58d68d';
        ctx.shadowBlur = 6;
        ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;

    // 5. Benthic Crabs
    for (let i = 0; i < benthicCrabs.length; i++) {
      const b = benthicCrabs[i];
      ctx.beginPath();
      ctx.fillStyle = '#e67e22';
      ctx.arc(b.x, b.y, 3.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Grazers
    for (let i = 0; i < grazers.length; i++) {
      const g = grazers[i];
      const glow = Math.sin(g.pulse) * 1.2;
      ctx.beginPath();
      ctx.fillStyle = g.genome.isArmored ? '#f39c12' : '#2ecc71';
      ctx.shadowColor = g.genome.isArmored ? '#f39c12' : '#2ecc71';
      ctx.shadowBlur = 5;
      ctx.arc(g.x, g.y, Math.max(1.8, 2.6 + glow * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 7. Apex Predators
    for (let i = 0; i < apexPredators.length; i++) {
      const a = apexPredators[i];
      ctx.beginPath();
      ctx.fillStyle = '#e74c3c';
      ctx.shadowColor = '#e74c3c';
      ctx.shadowBlur = 10;
      ctx.arc(a.x, a.y, 5.0 + Math.sin(a.pulse) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 8. Soft Atmospheric Decay Puffs
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

  // Initial boot
  resize();
  initFields();
  initEcosystem();
  requestAnimationFrame(loop);
})();

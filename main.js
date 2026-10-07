// Synapse Reef v2.1 - Organic Neural-Coral Simulation Engine
// Refined Autotroph Crowding Dynamics, Organic Bezier Axon Filaments, and Soft Atmospheric Decay Puffs

(function () {
  'use strict';

  // --- Canvas Setup & High-DPI Scaling ---
  const canvas = document.getElementById('reefCanvas');
  const ctx = canvas.getContext('2d');
  const drawer = document.getElementById('telemetryDrawer');
  const drawerToggle = document.getElementById('drawerToggle');
  const drawerIndicator = document.getElementById('drawerIndicator');

  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;

  // Grid dimensions for discrete torus T^2
  const CELL_SIZE = 18;
  let COLS = 36;
  let ROWS = 28;

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

    const oldCols = COLS;
    const oldRows = ROWS;
    COLS = Math.max(18, Math.floor(width / CELL_SIZE));
    ROWS = Math.max(14, Math.floor(height / CELL_SIZE));

    if (COLS !== oldCols || ROWS !== oldRows) {
      initFields();
      initEcosystem();
    }
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

  // --- Substrate Fields (Continuous Scalar Fields on Torus T^2) ---
  let S_field, D_field, A_field, plantGrid;
  let W_right, W_down;

  function idx(x, y) {
    const wx = (x % COLS + COLS) % COLS;
    const wy = (y % ROWS + ROWS) % ROWS;
    return wx + wy * COLS;
  }

  function initFields() {
    const totalCells = COLS * ROWS;
    S_field = new Float32Array(totalCells);
    D_field = new Float32Array(totalCells);
    A_field = new Float32Array(totalCells);
    plantGrid = new Array(totalCells);
    W_right = new Float32Array(totalCells);
    W_down = new Float32Array(totalCells);

    for (let i = 0; i < totalCells; i++) {
      S_field[i] = 4.0 + Math.random() * 3.5;
      D_field[i] = 0.5 + Math.random() * 1.5;
      A_field[i] = 0.0;
      plantGrid[i] = null;
      W_right[i] = 1.0;
      W_down[i] = 1.0;
    }
  }

  // --- Autotroph Entity (Polyp Morphology with Controlled Growth) ---
  class Autotroph {
    constructor(x, y, energy, generation, genome) {
      this.x = x;
      this.y = y;
      this.energy = energy || 10.0;
      this.age = 0;
      this.maxAge = 400 + Math.floor(Math.random() * 200);
      this.phi = 0.0;
      this.defCalc = 0;
      this.generation = generation || 1;
      this.breathingOffset = Math.random() * Math.PI * 2;
      this.genome = genome || {
        gamma: 0.42,      // Moderate photosynthesis rate
        mu_p: 0.14,       // Higher baseline metabolic maintenance cost
        nu: 0.35,         // Mineral uptake rate
        theta_rep: 34.0,  // Higher threshold required for mitotic budding
        c_rep: 16.0,      // Higher energy cost to divide
        kappa: 4          // Strict crowding limit (max 4 neighbors before growth halts)
      };
    }
  }

  // --- Heterotrophs (Grazers, Apex, Benthic Crabs) ---
  const grazers = [];
  const apexPredators = [];
  const benthicCrabs = [];
  const sparks = [];
  const decayPuffs = [];

  class Grazer {
    constructor(x, y, genome) {
      this.x = x;
      this.y = y;
      this.energy = 50.0;
      this.age = 0;
      this.genome = genome || {
        b_eff: 3.8,
        r_sense: 8,
        isArmored: Math.random() < 0.25,
        speed: 1.15
      };
      this.pulse = Math.random() * Math.PI * 2;
    }

    update(climate) {
      this.age++;
      this.energy -= 0.11;
      this.pulse += 0.07;

      const gx = Math.floor(this.x / CELL_SIZE);
      const gy = Math.floor(this.y / CELL_SIZE);

      // Alarm Avoidance Gradient
      let fleeX = 0;
      let fleeY = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const aVal = A_field[idx(gx + dx, gy + dy)];
          if (aVal > 0.1) {
            fleeX -= dx * aVal;
            fleeY -= dy * aVal;
          }
        }
      }

      let targetVx = 0;
      let targetVy = 0;
      const fleeMag = Math.hypot(fleeX, fleeY);

      if (fleeMag > 0.4) {
        targetVx = (fleeX / fleeMag) * (this.genome.speed * 1.3);
        targetVy = (fleeY / fleeMag) * (this.genome.speed * 1.3);
      } else {
        // Foraging Attraction
        let nearestDist = Infinity;
        let targetPlant = null;
        const R = this.genome.r_sense;

        for (let dx = -R; dx <= R; dx++) {
          for (let dy = -R; dy <= R; dy++) {
            const p = plantGrid[idx(gx + dx, gy + dy)];
            if (p && p.energy > 1.5) {
              const d = Math.max(Math.abs(dx), Math.abs(dy));
              if (d < nearestDist) {
                nearestDist = d;
                targetPlant = { x: (gx + dx) * CELL_SIZE + 9, y: (gy + dy) * CELL_SIZE + 9, p };
              }
            }
          }
        }

        if (targetPlant) {
          const dx = targetPlant.x - this.x;
          const dy = targetPlant.y - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 2) {
            targetVx = (dx / dist) * this.genome.speed;
            targetVy = (dy / dist) * this.genome.speed;
          }

          if (dist < 10 && targetPlant.p.energy > 0) {
            const defFactor = targetPlant.p.defCalc > 0 ? 0.5 : 1.0;
            const bite = Math.min(targetPlant.p.energy, this.genome.b_eff * defFactor);
            targetPlant.p.energy -= bite;
            this.energy += bite * 0.9;
            targetPlant.p.phi = 1.0;
            propagateWave(targetPlant.p.x, targetPlant.p.y);
          }
        } else {
          targetVx = (Math.random() - 0.5) * this.genome.speed;
          targetVy = (Math.random() - 0.5) * this.genome.speed;
        }
      }

      this.x = (this.x + targetVx + width) % width;
      this.y = (this.y + targetVy + height) % height;

      if (this.energy > 85.0 && grazers.length < 65) {
        this.energy -= 40.0;
        grazers.push(new Grazer((this.x + 8) % width, (this.y + 8) % height, mutateGenome(this.genome)));
      }
    }
  }

  class ApexPredator {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.energy = 85.0;
      this.speed = 1.45;
      this.r_hunt = 14;
      this.pulse = Math.random() * Math.PI;
    }

    update() {
      this.energy -= 0.15;
      this.pulse += 0.05;

      let nearestGrazer = null;
      let minDist = Infinity;
      for (let i = 0; i < grazers.length; i++) {
        const g = grazers[i];
        const dist = Math.hypot(g.x - this.x, g.y - this.y);
        if (dist < minDist) {
          minDist = dist;
          nearestGrazer = { g, idx: i, dist };
        }
      }

      if (nearestGrazer && nearestGrazer.dist < this.r_hunt * CELL_SIZE) {
        const dx = nearestGrazer.g.x - this.x;
        const dy = nearestGrazer.g.y - this.y;
        const dist = nearestGrazer.dist;

        this.x = (this.x + (dx / dist) * this.speed + width) % width;
        this.y = (this.y + (dy / dist) * this.speed + height) % height;

        if (dist < 12) {
          const gx = Math.floor(this.x / CELL_SIZE);
          const gy = Math.floor(this.y / CELL_SIZE);
          const cIdx = idx(gx, gy);

          if (nearestGrazer.g.genome.isArmored && Math.random() < 0.65) {
            A_field[cIdx] = Math.min(8.0, A_field[cIdx] + 2.0);
            this.energy -= 4.0;
            this.x = (this.x - (dx / dist) * 12 + width) % width;
          } else {
            this.energy = Math.min(120.0, this.energy + 32.0);
            A_field[cIdx] = Math.min(8.0, A_field[cIdx] + 4.0);
            spawnDecayPuff(nearestGrazer.g.x, nearestGrazer.g.y, 'grazer');
            grazers.splice(nearestGrazer.idx, 1);
          }
        }
      } else {
        this.x = (this.x + (Math.random() - 0.5) * this.speed + width) % width;
        this.y = (this.y + (Math.random() - 0.5) * this.speed + height) % height;
      }

      if (this.energy > 145.0 && apexPredators.length < 8) {
        this.energy -= 65.0;
        apexPredators.push(new ApexPredator(this.x, this.y));
      }
    }
  }

  class BenthicCrab {
    constructor(x, y) {
      this.x = x;
      this.y = y || height * 0.78 + Math.random() * (height * 0.18);
      this.energy = 55.0;
      this.speed = 0.55;
      this.p_recycle = 1.3;
    }

    update() {
      this.energy -= 0.07;
      const gx = Math.floor(this.x / CELL_SIZE);
      const gy = Math.floor(this.y / CELL_SIZE);
      const cIdx = idx(gx, gy);

      if (D_field[cIdx] > 0.2) {
        const dScav = Math.min(D_field[cIdx], this.p_recycle);
        D_field[cIdx] -= dScav;
        S_field[cIdx] = Math.min(10.0, S_field[cIdx] + 1.6 * dScav);
        this.energy = Math.min(95.0, this.energy + 1.2 * dScav);
      }

      this.x = (this.x + (Math.random() - 0.48) * this.speed + width) % width;
      this.y = Math.min(height - 8, Math.max(height * 0.65, this.y + (Math.random() - 0.5) * 0.4));

      if (this.energy > 85.0 && benthicCrabs.length < 28) {
        this.energy -= 45.0;
        benthicCrabs.push(new BenthicCrab(this.x, this.y));
      }
    }
  }

  function mutateGenome(g) {
    const mut = () => (1 + (Math.random() * 0.2 - 0.10));
    return {
      b_eff: Math.max(1.0, g.b_eff * mut()),
      r_sense: Math.min(12, Math.max(3, Math.round(g.r_sense * mut()))),
      isArmored: Math.random() < 0.15 ? !g.isArmored : g.isArmored,
      speed: Math.max(0.6, Math.min(2.0, g.speed * mut()))
    };
  }

  function spawnDecayPuff(x, y, type) {
    const color = type === 'apex' ? '231, 76, 60' : type === 'crab' ? '230, 126, 34' : '46, 204, 113';
    for (let i = 0; i < 4; i++) {
      decayPuffs.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6 - 0.2,
        r: 3 + Math.random() * 4,
        alpha: 0.65,
        color
      });
    }
  }

  // --- Neural Axon Potentials & Wave Propagation ---
  function propagateWave(originX, originY) {
    const queue = [{ x: originX, y: originY, phi: 1.0, depth: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
      const { x, y, phi, depth } = queue.shift();
      if (depth > 5 || phi < 0.08) continue;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const pCurr = plantGrid[idx(x, y)];
      if (pCurr) pCurr.phi = Math.max(pCurr.phi, phi);

      const neighbors = [
        { nx: (x + 1 + COLS) % COLS, ny: y, edge: 'right', ex: x, ey: y },
        { nx: (x - 1 + COLS) % COLS, ny: y, edge: 'right', ex: (x - 1 + COLS) % COLS, ey: y },
        { nx: x, ny: (y + 1 + ROWS) % ROWS, edge: 'down', ex: x, ey: y },
        { nx: x, ny: (y - 1 + ROWS) % ROWS, edge: 'down', ex: x, ey: (y - 1 + ROWS) % ROWS }
      ];

      for (let i = 0; i < neighbors.length; i++) {
        const { nx, ny, edge, ex, ey } = neighbors[i];
        const nextPlant = plantGrid[idx(nx, ny)];
        if (nextPlant) {
          const edgeIdx = idx(ex, ey);
          let w = edge === 'right' ? W_right[edgeIdx] : W_down[edgeIdx];
          const nextPhi = phi * 0.68 * Math.min(1.2, w);

          if (edge === 'right') {
            W_right[edgeIdx] = Math.min(3.0, W_right[edgeIdx] + 0.08 * phi * nextPhi);
          } else {
            W_down[edgeIdx] = Math.min(3.0, W_down[edgeIdx] + 0.08 * phi * nextPhi);
          }

          sparks.push({
            x1: x * CELL_SIZE + 9,
            y1: y * CELL_SIZE + 9,
            x2: nx * CELL_SIZE + 9,
            y2: ny * CELL_SIZE + 9,
            sigma: 0,
            v: 0.14 + Math.random() * 0.05,
            phi: nextPhi
          });

          queue.push({ x: nx, y: ny, phi: nextPhi, depth: depth + 1 });
        }
      }
    }
  }

  // --- Initial Ecosystem Seeding ---
  function initEcosystem() {
    grazers.length = 0;
    apexPredators.length = 0;
    benthicCrabs.length = 0;
    sparks.length = 0;
    decayPuffs.length = 0;

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (Math.random() < 0.11) {
          plantGrid[idx(c, r)] = new Autotroph(c, r, 12 + Math.random() * 8);
        } else {
          plantGrid[idx(c, r)] = null;
        }
      }
    }

    for (let i = 0; i < 35; i++) {
      grazers.push(new Grazer(Math.random() * width, Math.random() * height));
    }
    for (let i = 0; i < 16; i++) {
      benthicCrabs.push(new BenthicCrab(Math.random() * width));
    }
    for (let i = 0; i < 4; i++) {
      apexPredators.push(new ApexPredator(Math.random() * width, Math.random() * height));
    }
  }

  // --- Continuous Substrate PDE & Controlled Autotroph Reaction Step ---
  function stepSimulationFields(climate) {
    const totalCells = COLS * ROWS;
    const nextA = new Float32Array(totalCells);

    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        const cIdx = idx(x, y);

        // 1. Detritus mineralization
        const dVal = D_field[cIdx];
        const deltaD = -0.015 * dVal + climate.beta_climate;
        D_field[cIdx] = Math.max(0.0, dVal + deltaD);
        S_field[cIdx] = Math.min(10.0, S_field[cIdx] + 1.3 * Math.abs(deltaD));

        // 2. Alarm Pheromone Diffusion (Moore N8) & Decay
        let sumA = 0;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            sumA += A_field[idx(x + dx, y + dy)];
          }
        }
        nextA[cIdx] = 0.40 * A_field[cIdx] + (0.15 / 8.0) * sumA;

        // 3. Synaptic Plasticity Decay
        W_right[cIdx] = Math.max(1.0, W_right[cIdx] - 0.003);
        W_down[cIdx] = Math.max(1.0, W_down[cIdx] - 0.003);

        // 4. Autotroph Update with Strict Crowding Limits
        const plant = plantGrid[cIdx];
        if (plant) {
          plant.age++;
          plant.phi = Math.max(0.0, plant.phi - 0.04);
          if (plant.defCalc > 0) plant.defCalc--;

          // Canopy crowding kernel K(p) (Moore N8)
          let kCount = 0;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              if (plantGrid[idx(x + dx, y + dy)]) kCount++;
            }
          }

          // Soil mineral uptake
          const u = Math.min(S_field[cIdx], plant.genome.nu);
          S_field[cIdx] -= u;

          // Energy balance
          if (kCount >= plant.genome.kappa) {
            plant.energy -= 1.6 * plant.genome.mu_p;
          } else {
            plant.energy += (plant.genome.gamma * climate.alpha_sun + u) - plant.genome.mu_p;
          }

          // Mitotic Budding
          if (plant.energy >= plant.genome.theta_rep && kCount < 3 && Math.random() < 0.25) {
            const emptySpots = [];
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const nIdx = idx(x + dx, y + dy);
                if (!plantGrid[nIdx]) emptySpots.push({ x: (x + dx + COLS) % COLS, y: (y + dy + ROWS) % ROWS, nIdx });
              }
            }
            if (emptySpots.length > 0) {
              const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
              plant.energy -= plant.genome.c_rep;
              plantGrid[spot.nIdx] = new Autotroph(spot.x, spot.y, 10.0, plant.generation + 1);
            }
          }

          // Senescence & Biomass Fall
          if (plant.energy <= 0 || plant.age > plant.maxAge) {
            plantGrid[cIdx] = null;
            D_field[cIdx] = Math.min(8.0, D_field[cIdx] + 1.2);
            spawnDecayPuff(x * CELL_SIZE + 9, y * CELL_SIZE + 9, 'flora');
          }
        }
      }
    }

    A_field.set(nextA);
  }

  // --- Telemetry Sync ---
  function updateTelemetryUI(climate) {
    let totalPlantMass = 0;
    let plantCount = 0;
    let totalSoilMass = 0;
    let totalPhi = 0;

    for (let i = 0; i < plantGrid.length; i++) {
      totalSoilMass += S_field[i];
      if (plantGrid[i]) {
        plantCount++;
        totalPlantMass += plantGrid[i].energy * 10;
        totalPhi += plantGrid[i].phi;
      }
    }

    const totalBiomass = totalPlantMass + grazers.length * 15 + benthicCrabs.length * 10 + apexPredators.length * 40;
    const meanVoltage = plantCount > 0 ? (totalPhi / plantCount).toFixed(2) : '0.00';
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
    if (hudEntities) hudEntities.textContent = plantCount + grazers.length + benthicCrabs.length + apexPredators.length;

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
      if (climateTick > 400) {
        climateTick = 0;
        currentClimateIdx = (currentClimateIdx + 1) % CLIMATES.length;
      }

      stepSimulationFields(climate);

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

    // --- ORGANIC DRAWING STAGE ---

    // 1. Substrate Heat & Nutrient Map
    if (showSubstrate) {
      for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
          const cIdx = idx(x, y);
          const sVal = S_field[cIdx] / 10.0;
          const dVal = D_field[cIdx] / 8.0;
          const aVal = A_field[cIdx] / 6.0;

          if (sVal > 0.05 || dVal > 0.05 || aVal > 0.05) {
            ctx.fillStyle = `rgba(${Math.floor(aVal * 200 + 12)}, ${Math.floor(sVal * 140 + 20)}, ${Math.floor(dVal * 100 + 15)}, ${0.08 + sVal * 0.14})`;
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }

    // 2. Soft Organic Axon Filaments
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        const p = plantGrid[idx(x, y)];
        if (p) {
          const px = x * CELL_SIZE + 9;
          const py = y * CELL_SIZE + 9;

          // Right Axon Curve
          const pr = plantGrid[idx(x + 1, y)];
          if (pr && x + 1 < COLS) {
            const w = W_right[idx(x, y)];
            const firing = p.phi > 0.05 || pr.phi > 0.05;
            const alpha = firing ? Math.min(0.7, 0.25 * w) : Math.min(0.18, 0.05 * w);
            ctx.strokeStyle = firing ? `rgba(46, 230, 150, ${alpha})` : `rgba(30, 140, 85, ${alpha})`;
            ctx.lineWidth = firing ? 1.5 : 0.8;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.quadraticCurveTo(px + CELL_SIZE * 0.5, py + (Math.sin(p.breathingOffset) * 2), px + CELL_SIZE, py);
            ctx.stroke();
          }

          // Down Axon Curve
          const pd = plantGrid[idx(x, y + 1)];
          if (pd && y + 1 < ROWS) {
            const w = W_down[idx(x, y)];
            const firing = p.phi > 0.05 || pd.phi > 0.05;
            const alpha = firing ? Math.min(0.7, 0.25 * w) : Math.min(0.18, 0.05 * w);
            ctx.strokeStyle = firing ? `rgba(46, 230, 150, ${alpha})` : `rgba(30, 140, 85, ${alpha})`;
            ctx.lineWidth = firing ? 1.5 : 0.8;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.quadraticCurveTo(px + (Math.cos(p.breathingOffset) * 2), py + CELL_SIZE * 0.5, px, py + CELL_SIZE);
            ctx.stroke();
          }

          // Autotroph Polyp
          const breath = Math.sin(p.breathingOffset + now * 0.003) * 0.6;
          const radius = Math.min(5.5, 2.2 + (p.energy / 16.0) + p.phi * 2.2 + breath);
          ctx.beginPath();
          ctx.fillStyle = p.phi > 0.1 ? '#a3e4d7' : '#2ecc71';
          ctx.shadowColor = p.phi > 0.1 ? '#48c9b0' : 'rgba(46, 204, 113, 0.4)';
          ctx.shadowBlur = p.phi > 0.1 ? 8 : 2;
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.shadowBlur = 0;

    // 3. Bioluminescent Traveling Sparks
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

    // 4. Benthic Crabs
    for (let i = 0; i < benthicCrabs.length; i++) {
      const b = benthicCrabs[i];
      ctx.beginPath();
      ctx.fillStyle = '#e67e22';
      ctx.arc(b.x, b.y, 3.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Grazers
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

    // 6. Apex Predators
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

    // 7. Soft Atmospheric Decay Puffs
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
      stepSimulationFields(climate);
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
      for (let i = 0; i < plantGrid.length; i++) {
        if (plantGrid[i] && Math.random() < 0.15) {
          plantGrid[i].energy -= 8.0;
        }
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

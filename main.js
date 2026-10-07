// Synapse Reef v2.0 - Core Simulation Engine
// Full Implementation of Continuous Substrates, Reaction-Diffusion Autotrophs,
// Hebbian Axon Graph Potentials, Lotka-Volterra Heterotrophs, and Telemetry Phase Space.

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
  const CELL_SIZE = 16;
  let COLS = 40;
  let ROWS = 30;

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
    COLS = Math.max(20, Math.floor(width / CELL_SIZE));
    ROWS = Math.max(15, Math.floor(height / CELL_SIZE));

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
  // Synaptic weights for von Neumann 4-connected edges: W_right, W_down
  let W_right, W_down;

  function idx(x, y) {
    const wx = (x % COLS + COLS) % COLS;
    const wy = (y % ROWS + ROWS) % ROWS;
    return wx + wy * COLS;
  }

  function initFields() {
    const totalCells = COLS * ROWS;
    S_field = new Float32Array(totalCells); // Soil Bio-Minerals [0, 10]
    D_field = new Float32Array(totalCells); // Detritus [0, 10]
    A_field = new Float32Array(totalCells); // Stress Alarm Pheromone [0, 8]
    plantGrid = new Array(totalCells);     // Autotroph Objects or null
    W_right = new Float32Array(totalCells); // Axon weights right
    W_down = new Float32Array(totalCells);  // Axon weights down

    for (let i = 0; i < totalCells; i++) {
      S_field[i] = 3.5 + Math.random() * 3.0;
      D_field[i] = 0.5 + Math.random() * 1.5;
      A_field[i] = 0.0;
      plantGrid[i] = null;
      W_right[i] = 1.0;
      W_down[i] = 1.0;
    }
  }

  // --- Autotroph Entity (Canopy Reaction-Diffusion) ---
  class Autotroph {
    constructor(x, y, energy, generation, genome) {
      this.x = x;
      this.y = y;
      this.energy = energy || 12.0;
      this.age = 0;
      this.maxAge = 350 + Math.floor(Math.random() * 150);
      this.phi = 0.0; // Neural membrane voltage
      this.defCalc = 0; // Defensive calcification timer
      this.generation = generation || 1;
      this.genome = genome || {
        gamma: 0.85,      // Growth rate
        mu_p: 0.08,       // Maintenance cost
        nu: 0.45,         // Mineral uptake efficiency
        theta_rep: 24.0,  // Budding threshold
        c_rep: 10.0,      // Reproduction cost
        kappa: 6          // Crowding tolerance
      };
    }
  }

  // --- Heterotrophs (Grazers, Apex, Benthic Crabs) ---
  const grazers = [];
  const apexPredators = [];
  const benthicCrabs = [];
  const sparks = [];
  const decayRings = [];

  class Grazer {
    constructor(x, y, genome) {
      this.x = x;
      this.y = y;
      this.energy = 45.0;
      this.age = 0;
      this.genome = genome || {
        b_eff: 3.2,
        r_sense: 7,
        isArmored: Math.random() < 0.25,
        speed: 1.1
      };
      this.pulse = 0;
    }

    update(climate) {
      this.age++;
      this.energy -= 0.12;
      this.pulse += 0.08;

      const gx = Math.floor(this.x / CELL_SIZE);
      const gy = Math.floor(this.y / CELL_SIZE);

      // 1. Alarm Pheromone Avoidance Gradient (Moore N8)
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

      if (fleeMag > 0.5) {
        targetVx = (fleeX / fleeMag) * (this.genome.speed * 1.4);
        targetVy = (fleeY / fleeMag) * (this.genome.speed * 1.4);
      } else {
        // 2. Foraging Attraction toward nearest Plant in Chebyshev sense disk
        let nearestDist = Infinity;
        let targetPlant = null;
        const R = this.genome.r_sense;

        for (let dx = -R; dx <= R; dx++) {
          for (let dy = -R; dy <= R; dy++) {
            const p = plantGrid[idx(gx + dx, gy + dy)];
            if (p && p.energy > 2.0) {
              const d = Math.max(Math.abs(dx), Math.abs(dy));
              if (d < nearestDist) {
                nearestDist = d;
                targetPlant = { x: (gx + dx) * CELL_SIZE + 8, y: (gy + dy) * CELL_SIZE + 8, p, cellIdx: idx(gx + dx, gy + dy) };
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

          // Grazing contact
          if (dist < 10 && targetPlant.p.energy > 0) {
            const defFactor = targetPlant.p.defCalc > 0 ? 0.5 : 1.0;
            const bite = Math.min(targetPlant.p.energy, this.genome.b_eff * defFactor);
            targetPlant.p.energy -= bite;
            this.energy += bite * 0.85;
            targetPlant.p.phi = 1.0; // Trigger action potential wave!
            propagateWave(targetPlant.p.x, targetPlant.p.y);
          }
        } else {
          targetVx = (Math.random() - 0.5) * this.genome.speed;
          targetVy = (Math.random() - 0.5) * this.genome.speed;
        }
      }

      this.x = (this.x + targetVx + width) % width;
      this.y = (this.y + targetVy + height) % height;

      // Mitotic reproduction or death
      if (this.energy > 75.0 && grazers.length < 80) {
        this.energy -= 35.0;
        const childGenome = mutateGenome(this.genome);
        grazers.push(new Grazer((this.x + 8) % width, (this.y + 8) % height, childGenome));
      }
    }
  }

  class ApexPredator {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.energy = 80.0;
      this.speed = 1.5;
      this.r_hunt = 12;
      this.pulse = Math.random() * Math.PI;
    }

    update() {
      this.energy -= 0.16;
      this.pulse += 0.05;

      // Locate nearest grazer within hunting disk
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

        // Adjacent predation contact
        if (dist < 12) {
          const gx = Math.floor(this.x / CELL_SIZE);
          const gy = Math.floor(this.y / CELL_SIZE);
          const cIdx = idx(gx, gy);

          if (nearestGrazer.g.genome.isArmored && Math.random() < 0.65) {
            // Armor Deflection: deposit alarm and deflect
            A_field[cIdx] = Math.min(8.0, A_field[cIdx] + 2.0);
            this.energy -= 4.0;
            this.x = (this.x - (dx / dist) * 15 + width) % width;
          } else {
            // Predation succeeds
            this.energy = Math.min(120.0, this.energy + 28.0);
            A_field[cIdx] = Math.min(8.0, A_field[cIdx] + 4.0);
            spawnDecayRing(nearestGrazer.g.x, nearestGrazer.g.y, 'grazer');
            grazers.splice(nearestGrazer.idx, 1);
          }
        }
      } else {
        this.x = (this.x + (Math.random() - 0.5) * this.speed + width) % width;
        this.y = (this.y + (Math.random() - 0.5) * this.speed + height) % height;
      }

      if (this.energy > 140.0 && apexPredators.length < 8) {
        this.energy -= 60.0;
        apexPredators.push(new ApexPredator(this.x, this.y));
      }
    }
  }

  class BenthicCrab {
    constructor(x, y) {
      this.x = x;
      this.y = y || height * 0.78 + Math.random() * (height * 0.18);
      this.energy = 50.0;
      this.speed = 0.55;
      this.p_recycle = 1.2;
    }

    update() {
      this.energy -= 0.08;
      const gx = Math.floor(this.x / CELL_SIZE);
      const gy = Math.floor(this.y / CELL_SIZE);
      const cIdx = idx(gx, gy);

      // Scavenge detritus into loam
      if (D_field[cIdx] > 0.2) {
        const dScav = Math.min(D_field[cIdx], this.p_recycle);
        D_field[cIdx] -= dScav;
        S_field[cIdx] = Math.min(10.0, S_field[cIdx] + 1.5 * dScav);
        this.energy = Math.min(90.0, this.energy + 1.2 * dScav);
      }

      // Crawl along benthic seafloor
      this.x = (this.x + (Math.random() - 0.48) * this.speed + width) % width;
      this.y = Math.min(height - 8, Math.max(height * 0.65, this.y + (Math.random() - 0.5) * 0.4));

      if (this.energy > 80.0 && benthicCrabs.length < 30) {
        this.energy -= 40.0;
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
      speed: Math.max(0.6, Math.min(2.2, g.speed * mut()))
    };
  }

  function spawnDecayRing(x, y, type) {
    decayRings.push({
      x, y,
      r: 4,
      alpha: 1.0,
      color: type === 'apex' ? '231, 76, 60' : type === 'crab' ? '230, 126, 34' : '46, 204, 113'
    });
  }

  // --- Neural Axon Potentials & Hebbian Plasticity ---
  function propagateWave(originX, originY) {
    const queue = [{ x: originX, y: originY, phi: 1.0, depth: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
      const { x, y, phi, depth } = queue.shift();
      if (depth > 6 || phi < 0.05) continue;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const pCurr = plantGrid[idx(x, y)];
      if (pCurr) pCurr.phi = Math.max(pCurr.phi, phi);

      // Propagate across 4 von Neumann neighbors
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
          const nextPhi = phi * 0.72 * Math.min(1.2, w);

          // Hebbian learning: reinforce synaptic weight
          if (edge === 'right') {
            W_right[edgeIdx] = Math.min(3.0, W_right[edgeIdx] + 0.06 * phi * nextPhi);
          } else {
            W_down[edgeIdx] = Math.min(3.0, W_down[edgeIdx] + 0.06 * phi * nextPhi);
          }

          // Spawn bioluminescent spark traveling along edge
          sparks.push({
            x1: x * CELL_SIZE + 8,
            y1: y * CELL_SIZE + 8,
            x2: nx * CELL_SIZE + 8,
            y2: ny * CELL_SIZE + 8,
            sigma: 0,
            v: 0.12 + Math.random() * 0.06,
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
    decayRings.length = 0;

    // Seed autotrophs
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (Math.random() < 0.22) {
          plantGrid[idx(c, r)] = new Autotroph(c, r, 10 + Math.random() * 10);
        } else {
          plantGrid[idx(c, r)] = null;
        }
      }
    }

    // Seed heterotrophs
    for (let i = 0; i < 42; i++) {
      grazers.push(new Grazer(Math.random() * width, Math.random() * height));
    }
    for (let i = 0; i < 18; i++) {
      benthicCrabs.push(new BenthicCrab(Math.random() * width));
    }
    for (let i = 0; i < 5; i++) {
      apexPredators.push(new ApexPredator(Math.random() * width, Math.random() * height));
    }
  }

  // --- Continuous Substrate PDE & Autotroph Reaction Step ---
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

        // 3. Passive Synaptic Plasticity Relaxation & Voltage Decay
        W_right[cIdx] = Math.max(1.0, W_right[cIdx] - 0.002);
        W_down[cIdx] = Math.max(1.0, W_down[cIdx] - 0.002);

        // 4. Autotroph Update
        const plant = plantGrid[cIdx];
        if (plant) {
          plant.age++;
          plant.phi = Math.max(0.0, plant.phi - 0.035);
          if (plant.defCalc > 0) plant.defCalc--;

          // Canopy crowding kernel K(p) (Moore N8)
          let kCount = 0;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              if (plantGrid[idx(x + dx, y + dy)]) kCount++;
            }
          }

          // Mineral uptake
          const u = Math.min(S_field[cIdx], plant.genome.nu);
          S_field[cIdx] -= u;

          // Net energy delta
          if (kCount >= plant.genome.kappa) {
            plant.energy -= 1.4 * plant.genome.mu_p;
          } else {
            plant.energy += (plant.genome.gamma * climate.alpha_sun + u) - plant.genome.mu_p;
          }

          // Mitotic vegetative budding
          if (plant.energy >= plant.genome.theta_rep && kCount < plant.genome.kappa) {
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
              plantGrid[spot.nIdx] = new Autotroph(spot.x, spot.y, 8.0, plant.generation + 1);
            }
          }

          // Senescence & Biomass Fall
          if (plant.energy <= 0 || plant.age > plant.maxAge) {
            plantGrid[cIdx] = null;
            D_field[cIdx] = Math.min(8.0, D_field[cIdx] + 1.2);
            spawnDecayRing(x * CELL_SIZE + 8, y * CELL_SIZE + 8, 'flora');
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

      // Step physical & chemical fields
      stepSimulationFields(climate);

      // Step heterotrophs
      for (let i = grazers.length - 1; i >= 0; i--) {
        grazers[i].update(climate);
        if (grazers[i].energy <= 0) {
          spawnDecayRing(grazers[i].x, grazers[i].y, 'grazer');
          grazers.splice(i, 1);
        }
      }

      for (let i = benthicCrabs.length - 1; i >= 0; i--) {
        benthicCrabs[i].update();
        if (benthicCrabs[i].energy <= 0) {
          spawnDecayRing(benthicCrabs[i].x, benthicCrabs[i].y, 'crab');
          benthicCrabs.splice(i, 1);
        }
      }

      for (let i = apexPredators.length - 1; i >= 0; i--) {
        apexPredators[i].update();
        if (apexPredators[i].energy <= 0) {
          spawnDecayRing(apexPredators[i].x, apexPredators[i].y, 'apex');
          apexPredators.splice(i, 1);
        }
      }

      // Update telemetry UI at interval
      if (now - lastTick > 350) {
        updateTelemetryUI(climate);
        lastTick = now;
      }
    }

    // --- DRAWING STAGE ---

    // 1. Substrate Soil & Detritus Fields
    if (showSubstrate) {
      for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
          const cIdx = idx(x, y);
          const sVal = S_field[cIdx] / 10.0;
          const dVal = D_field[cIdx] / 8.0;
          const aVal = A_field[cIdx] / 6.0;

          if (sVal > 0.05 || dVal > 0.05 || aVal > 0.05) {
            ctx.fillStyle = `rgba(${Math.floor(aVal * 220 + 20)}, ${Math.floor(sVal * 160 + 30)}, ${Math.floor(dVal * 120 + 20)}, ${0.12 + sVal * 0.18})`;
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }

    // 2. Neural Axon Graph Edges & Plants
    ctx.lineWidth = 1.0;
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        const p = plantGrid[idx(x, y)];
        if (p) {
          const px = x * CELL_SIZE + 8;
          const py = y * CELL_SIZE + 8;

          // Right Axon Edge
          const pr = plantGrid[idx(x + 1, y)];
          if (pr && x + 1 < COLS) {
            const w = W_right[idx(x, y)];
            ctx.strokeStyle = `rgba(46, 204, 113, ${Math.min(0.8, 0.15 * w)})`;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + CELL_SIZE, py);
            ctx.stroke();
          }

          // Down Axon Edge
          const pd = plantGrid[idx(x, y + 1)];
          if (pd && y + 1 < ROWS) {
            const w = W_down[idx(x, y)];
            ctx.strokeStyle = `rgba(46, 204, 113, ${Math.min(0.8, 0.15 * w)})`;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px, py + CELL_SIZE);
            ctx.stroke();
          }

          // Autotroph Node
          ctx.beginPath();
          ctx.fillStyle = p.phi > 0.1 ? '#82e0aa' : '#27ae60';
          ctx.shadowColor = '#2ecc71';
          ctx.shadowBlur = p.phi > 0.1 ? 10 : 3;
          ctx.arc(px, py, Math.min(6, 2.0 + (p.energy / 12.0) + p.phi * 2.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.shadowBlur = 0;

    // 3. Bioluminescent Axon Sparks
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
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 8;
        ctx.arc(sx, sy, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;

    // 4. Benthic Crabs
    for (let i = 0; i < benthicCrabs.length; i++) {
      const b = benthicCrabs[i];
      ctx.beginPath();
      ctx.fillStyle = '#e67e22';
      ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Grazers
    for (let i = 0; i < grazers.length; i++) {
      const g = grazers[i];
      const glow = Math.sin(g.pulse) * 1.5;
      ctx.beginPath();
      ctx.fillStyle = g.genome.isArmored ? '#f39c12' : '#2ecc71';
      ctx.shadowColor = g.genome.isArmored ? '#f39c12' : '#2ecc71';
      ctx.shadowBlur = 6;
      ctx.arc(g.x, g.y, Math.max(2.0, 2.8 + glow * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 6. Apex Predators
    for (let i = 0; i < apexPredators.length; i++) {
      const a = apexPredators[i];
      ctx.beginPath();
      ctx.fillStyle = '#e74c3c';
      ctx.shadowColor = '#e74c3c';
      ctx.shadowBlur = 12;
      ctx.arc(a.x, a.y, 5.5 + Math.sin(a.pulse) * 1.0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 7. Decay Expansion Rings
    for (let i = decayRings.length - 1; i >= 0; i--) {
      const d = decayRings[i];
      d.r += 0.4;
      d.alpha -= 0.02;
      if (d.alpha <= 0) {
        decayRings.splice(i, 1);
      } else {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${d.color}, ${d.alpha})`;
        ctx.lineWidth = 1.4;
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.stroke();
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
      // Heat pulse shock: inject alarm pheromones and trigger cellular senescence
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

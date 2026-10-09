// Synapse Cosmos Multiverse Engine - Multi-Simulation Parallel Stack + Inter-Universal Wormholes
// Real-time simultaneous universes with 2x2 Quadrant Matrix, 1x3 Vertical Stack, and 1x1 Focused View.
// Full IBM-PC CP437 ASCII / CGA terminal rendering with Einstein-Rosen bridges for cross-universe gene/spore transfer.

(function () {
  'use strict';

  const canvas = document.getElementById('reefCanvas');
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;

  const CHAR_W = 10;
  const CHAR_H = 14;

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

  const SEASONS = [
    { name: 'VERDANT SOLSTICE', F: 0.038, k: 0.061, temp: 26.5, lux: 1.2, ph: 8.18, bgChar: '.', color: CGA.GREEN },
    { name: 'NUTRIENT MONSOON', F: 0.046, k: 0.063, temp: 23.0, lux: 0.9, ph: 8.08, bgChar: ':', color: CGA.CYAN },
    { name: 'ARID ECLIPSE', F: 0.028, k: 0.058, temp: 28.5, lux: 0.6, ph: 8.30, bgChar: '.', color: CGA.BROWN },
    { name: 'BIOLUMINESCENT BLOOM', F: 0.054, k: 0.062, temp: 25.8, lux: 1.4, ph: 8.24, bgChar: ':', color: CGA.LIGHT_CYAN }
  ];

  const SPECIES_DOS = [
    { name: 'Indigo Porites', char: '♠', stemChar: '|', color: CGA.LIGHT_BLUE, flash: CGA.WHITE },
    { name: 'Magenta Stylophora', char: '♣', stemChar: '+', color: CGA.LIGHT_MAGENTA, flash: CGA.WHITE },
    { name: 'Mustard Montipora', char: '▲', stemChar: ':', color: CGA.YELLOW, flash: CGA.WHITE },
    { name: 'Olive Brain Coral', char: '♦', stemChar: '#', color: CGA.LIGHT_GREEN, flash: CGA.WHITE }
  ];

  // Mulberry32 deterministic PRNG
  function createRNG(seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0;
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // --- Multiverse Layout Engine ---
  let layoutMode = '2x2';
  let focusedSectorIdx = 0;
  let isPaused = false;
  let showDiagnosticHUD = false;
  let lastFpsUpdate = performance.now();
  let frameCount = 0;
  let currentFps = 60;

  // Inter-Universal Wormhole Portal Manager
  const wormholeNodes = [
    { fromSector: 0, toSector: 1, x: 0.85, y: 0.35, spin: 0, active: true },
    { fromSector: 1, toSector: 2, x: 0.15, y: 0.80, spin: 0, active: true },
    { fromSector: 2, toSector: 3, x: 0.85, y: 0.70, spin: 0, active: true },
    { fromSector: 3, toSector: 0, x: 0.15, y: 0.30, spin: 0, active: true }
  ];

  const transitSparks = [];

  class UniverseSector {
    constructor(idx, id, name, seed) {
      this.sectorIdx = idx;
      this.id = id;
      this.name = name;
      this.seed = seed;
      this.rng = createRNG(seed);

      this.cols = 40;
      this.rows = 24;
      this.headerRows = 2;
      this.footerRows = 1;

      this.S_field = null;
      this.D_field = null;
      this.A_field = null;
      this.TuringU = null;
      this.TuringV = null;
      this.nextU = null;
      this.nextV = null;
      this.morphCycleTime = 0;
      this.seasonalTime = idx * 1.57;
      this.globalKuramotoCoupling = 0.04;

      this.plants = [];
      this.grazers = [];
      this.apexPredators = [];
      this.benthicCrabs = [];
      this.sparks = [];
      this.decayPuffs = [];
      this.cosmosParticles = [];

      this.maxPlants = 75;
      this.initFields();
      this.reseed();
    }

    cellIdx(x, y) {
      const cx = ((x % this.cols) + this.cols) % this.cols;
      const cy = ((y % this.rows) + this.rows) % this.rows;
      return cx + cy * this.cols;
    }

    initFields() {
      const total = this.cols * this.rows;
      this.S_field = new Float32Array(total);
      this.D_field = new Float32Array(total);
      this.A_field = new Float32Array(total);
      this.TuringU = new Float32Array(total);
      this.TuringV = new Float32Array(total);
      this.nextU = new Float32Array(total);
      this.nextV = new Float32Array(total);

      for (let y = 0; y < this.rows; y++) {
        const depthBias = 1.0 + (y / this.rows) * 1.5;
        for (let x = 0; x < this.cols; x++) {
          const i = x + y * this.cols;
          this.S_field[i] = 3.5 + this.rng() * 3.0 * depthBias;
          this.D_field[i] = 0.5 * depthBias;
          this.A_field[i] = 0.0;
          this.TuringU[i] = 1.0;
          this.TuringV[i] = 0.0;

          if (y > this.headerRows + 3 && Math.hypot(x - this.cols * 0.5, y - this.rows * 0.7) < 4 && this.rng() < 0.035) {
            this.TuringV[i] = 0.8;
          }
        }
      }

      this.cosmosParticles = [];
      const glyphs = ['.', '·', '°', '*'];
      for (let i = 0; i < 20; i++) {
        this.cosmosParticles.push({
          x: this.rng() * this.cols,
          y: this.headerRows + this.rng() * (this.rows - this.headerRows - this.footerRows),
          char: glyphs[Math.floor(this.rng() * glyphs.length)],
          twinkle: this.rng() * Math.PI * 2
        });
      }
    }

    resize(cols, rows) {
      this.cols = Math.max(20, cols);
      this.rows = Math.max(14, rows);
      this.initFields();
      this.reseed();
    }

    getCurlVelocity(x, y, t) {
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

    injectMorphogen(cx, cy, r, amtV) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (dx * dx + dy * dy <= r * r) {
            const i = this.cellIdx(cx + dx, cy + dy);
            this.TuringV[i] = Math.min(1.0, Math.max(0.0, this.TuringV[i] + amtV));
          }
        }
      }
    }

    mutateGrazerGenome(parentGenome) {
      const drift = () => 1.0 + (this.rng() * 0.20 - 0.10);
      return {
        b_eff: Math.max(1.2, Math.min(5.0, (parentGenome ? parentGenome.b_eff : 2.8) * drift())),
        r_sense: Math.max(4, Math.min(12, Math.round((parentGenome ? parentGenome.r_sense : 8) * drift()))),
        maxSpeed: Math.max(0.40, Math.min(0.90, (parentGenome ? parentGenome.maxSpeed : 0.60) * drift())),
        isArmored: parentGenome ? (this.rng() < 0.12 ? !parentGenome.isArmored : parentGenome.isArmored) : this.rng() < 0.20
      };
    }

    reseed() {
      this.plants = [];
      this.grazers = [];
      this.apexPredators = [];
      this.benthicCrabs = [];
      this.sparks = [];
      this.decayPuffs = [];

      const rootCount = 5;
      for (let k = 0; k < rootCount; k++) {
        const rootX = Math.floor(3 + (k / (rootCount - 1)) * (this.cols - 6) + (this.rng() - 0.5) * 2);
        const rootY = Math.floor(this.rows - this.footerRows - 2 + this.rng() * 1.5);
        const spIdx = k % SPECIES_DOS.length;
        const root = {
          x: rootX, y: rootY, parent: null, children: [], synapseWeights: new Map(),
          speciesIdx: spIdx, energy: 16.0, age: 0, maxAge: 1400 + Math.floor(this.rng() * 600),
          phi: 0.0, theta: this.rng() * Math.PI * 2, naturalFreq: 0.03 + (this.rng() - 0.5) * 0.01
        };
        this.plants.push(root);

        for (let b = 0; b < 2; b++) {
          const bX = Math.max(1, Math.min(this.cols - 2, rootX + (b === 0 ? -1 : 1)));
          const bY = Math.max(this.headerRows + 1, Math.min(this.rows - this.footerRows - 1, rootY - 1));
          const child = {
            x: bX, y: bY, parent: root, children: [], synapseWeights: new Map(),
            speciesIdx: spIdx, energy: 16.0, age: 0, maxAge: 1400 + Math.floor(this.rng() * 600),
            phi: 0.0, theta: this.rng() * Math.PI * 2, naturalFreq: 0.03 + (this.rng() - 0.5) * 0.01
          };
          root.children.push(child);
          root.synapseWeights.set(child, 1.2);
          this.plants.push(child);
        }
      }

      for (let i = 0; i < 18; i++) {
        this.grazers.push({
          x: this.rng() * this.cols,
          y: this.headerRows + this.rng() * (this.rows - this.headerRows - this.footerRows),
          vx: (this.rng() - 0.5) * 0.6,
          vy: (this.rng() - 0.5) * 0.6,
          energy: 45.0,
          age: 0,
          genome: this.mutateGrazerGenome(null),
          maxSpeed: 0.60
        });
      }

      for (let i = 0; i < 6; i++) {
        this.benthicCrabs.push({
          x: this.rng() * this.cols,
          y: this.rows - this.footerRows - 2 + this.rng(),
          vx: (this.rng() - 0.5) * 0.3,
          energy: 55.0
        });
      }

      for (let i = 0; i < 2; i++) {
        this.apexPredators.push({
          x: this.rng() * this.cols,
          y: this.headerRows + this.rng() * (this.rows - this.headerRows - this.footerRows),
          vx: (this.rng() - 0.5) * 0.8,
          vy: (this.rng() - 0.5) * 0.8,
          energy: 65.0,
          cruiseSpeed: 0.65,
          burstSpeed: 1.10,
          isSprinting: false,
          sprintCooldown: 0
        });
      }
    }

    stepSubstrates(climate) {
      this.morphCycleTime += 0.005;
      const breathing = Math.sin(this.morphCycleTime) * 0.003;
      const F = climate.F + breathing;
      const k = climate.k + breathing * 0.5;
      const Du = 0.16;
      const Dv = 0.08;

      for (let x = 0; x < this.cols; x++) {
        for (let y = this.headerRows; y < this.rows - this.footerRows; y++) {
          const i = this.cellIdx(x, y);
          const u = this.TuringU[i];
          const v = this.TuringV[i];
          const lapU = (this.TuringU[this.cellIdx(x + 1, y)] + this.TuringU[this.cellIdx(x - 1, y)] +
            this.TuringU[this.cellIdx(x, y + 1)] + this.TuringU[this.cellIdx(x, y - 1)]) * 0.25 - u;
          const lapV = (this.TuringV[this.cellIdx(x + 1, y)] + this.TuringV[this.cellIdx(x - 1, y)] +
            this.TuringV[this.cellIdx(x, y + 1)] + this.TuringV[this.cellIdx(x, y - 1)]) * 0.25 - v;

          const localF = F + (this.S_field[i] / 10.0) * 0.006;
          const localK = k + (this.A_field[i] / 8.0) * 0.005;
          const uvv = u * v * v;

          let nU = u + (Du * lapU - uvv + localF * (1.0 - u));
          let nV = v + (Dv * lapV + uvv - (localF + localK) * v);

          if (y < this.headerRows + 5) {
            const fade = (y - this.headerRows) / 5.0;
            nV *= fade;
          }

          this.nextU[i] = Math.max(0.0, Math.min(1.0, nU));
          this.nextV[i] = Math.max(0.0, Math.min(1.0, nV));

          const dVal = this.D_field[i];
          const deltaD = -0.015 * dVal + 0.02;
          this.D_field[i] = Math.max(0.0, dVal + deltaD);
          this.S_field[i] = Math.min(10.0, this.S_field[i] + 1.2 * Math.abs(deltaD));

          this.A_field[i] *= 0.94;
        }
      }

      this.TuringU.set(this.nextU);
      this.TuringV.set(this.nextV);
    }

    update(now, allSectors) {
      this.seasonalTime += 0.0015;
      const seasonIdx = Math.floor((this.seasonalTime / (Math.PI * 2)) * SEASONS.length) % SEASONS.length;
      const climate = SEASONS[seasonIdx];

      this.globalKuramotoCoupling = Math.max(0.04, this.globalKuramotoCoupling - 0.001);
      this.stepSubstrates(climate);

      // Local Wormhole Exit/Entrance
      const myWormhole = wormholeNodes[this.sectorIdx];
      const whX = Math.floor(myWormhole.x * this.cols);
      const whY = Math.floor(this.headerRows + myWormhole.y * (this.rows - this.headerRows - this.footerRows));

      // Continuous Wormhole Morphogen Emission
      this.injectMorphogen(whX, whY, 2, 0.15);

      // 1. Flora Update + Cross-Sector Spore Emission
      for (let i = this.plants.length - 1; i >= 0; i--) {
        const p = this.plants[i];
        p.age++;
        p.phi = Math.max(0.0, p.phi - 0.04);

        let phaseCouplingSum = 0;
        let connectedCount = 0;
        if (p.parent && this.plants.includes(p.parent)) {
          phaseCouplingSum += Math.sin(p.parent.theta - p.theta);
          connectedCount++;
        }
        for (let j = 0; j < p.children.length; j++) {
          const ch = p.children[j];
          if (this.plants.includes(ch)) {
            phaseCouplingSum += Math.sin(ch.theta - p.theta);
            connectedCount++;
          }
        }
        p.theta += p.naturalFreq + (connectedCount > 0 ? (this.globalKuramotoCoupling / connectedCount) * phaseCouplingSum : 0);
        p.theta %= (Math.PI * 2);

        const sIndex = this.cellIdx(p.x, p.y);
        const turingBoost = 1.0 + this.TuringV[sIndex] * 0.6;
        const u = Math.min(this.S_field[sIndex], 0.35) * turingBoost;
        this.S_field[sIndex] -= u * 0.5;

        const solarRate = 0.65 * climate.lux * 1.0 * turingBoost;
        p.energy += solarRate * u - 0.09;

        // Wormhole Spore Ingestion -> Target Sector Colonization
        if (Math.hypot(p.x - whX, p.y - whY) < 3.0 && p.energy > 15.0 && this.rng() < 0.015) {
          const targetSector = allSectors[myWormhole.toSector];
          if (targetSector && targetSector.plants.length < targetSector.maxPlants) {
            const tWh = wormholeNodes[targetSector.sectorIdx];
            const tX = Math.floor(tWh.x * targetSector.cols) + (this.rng() < 0.5 ? 1 : -1);
            const tY = Math.floor(targetSector.headerRows + tWh.y * (targetSector.rows - targetSector.headerRows - targetSector.footerRows));
            targetSector.plants.push({
              x: Math.max(1, Math.min(targetSector.cols - 2, tX)),
              y: Math.max(targetSector.headerRows + 1, Math.min(targetSector.rows - targetSector.footerRows - 1, tY)),
              parent: null,
              children: [],
              synapseWeights: new Map(),
              speciesIdx: p.speciesIdx,
              energy: 18.0,
              age: 0,
              maxAge: 1400 + Math.floor(this.rng() * 600),
              phi: 1.0,
              theta: p.theta,
              naturalFreq: p.naturalFreq
            });
            targetSector.injectMorphogen(tX, tY, 2, 0.5);
            transitSparks.push({ from: this.sectorIdx, to: targetSector.sectorIdx, progress: 0, color: CGA.LIGHT_MAGENTA });
          }
        }

        // Upward Branch Growth
        if (p.energy > 14.0 && p.children.length < 2 && this.plants.length < this.maxPlants && this.rng() < 0.25) {
          const dx = this.rng() < 0.5 ? -1 : 1;
          const dy = -1 - (this.rng() < 0.25 ? 1 : 0);
          const childX = Math.max(1, Math.min(this.cols - 2, p.x + dx));
          const childY = Math.max(this.headerRows + 1, Math.min(this.rows - this.footerRows - 1, p.y + dy));

          let occupied = this.plants.some(pl => pl.x === childX && pl.y === childY);
          if (!occupied) {
            p.energy -= 6.5;
            const child = {
              x: childX, y: childY, parent: p, children: [], synapseWeights: new Map(),
              speciesIdx: p.speciesIdx, energy: 16.0, age: 0, maxAge: 1400 + Math.floor(this.rng() * 600),
              phi: 0.0, theta: this.rng() * Math.PI * 2, naturalFreq: 0.03 + (this.rng() - 0.5) * 0.01
            };
            p.children.push(child);
            p.synapseWeights.set(child, 1.2);
            this.plants.push(child);
            this.injectMorphogen(childX, childY, 1, 0.4);
          }
        }

        if (p.energy <= 0 || p.age > p.maxAge) {
          this.D_field[sIndex] = Math.min(8.0, this.D_field[sIndex] + 1.2);
          if (p.parent) {
            const idx = p.parent.children.indexOf(p);
            if (idx !== -1) p.parent.children.splice(idx, 1);
          }
          this.plants.splice(i, 1);
        }
      }

      // 2. Grazer Harvesters Update + Wormhole Transit
      for (let i = this.grazers.length - 1; i >= 0; i--) {
        const g = this.grazers[i];
        g.age++;
        g.energy -= 0.06;

        const curl = this.getCurlVelocity(g.x, g.y, now);
        let sepX = 0, sepY = 0, alignX = 0, alignY = 0, cohX = 0, cohY = 0, flockNeighbors = 0;

        for (let j = 0; j < this.grazers.length; j++) {
          const other = this.grazers[j];
          if (other === g) continue;
          const dist = Math.hypot(other.x - g.x, other.y - g.y);
          if (dist > 0 && dist < 5) {
            if (dist < 2) {
              sepX += (g.x - other.x) / dist;
              sepY += (g.y - other.y) / dist;
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
          cohX = cohX / flockNeighbors - g.x;
          cohY = cohY / flockNeighbors - g.y;
          flockVx = sepX * 0.25 + alignX * 0.2 + cohX * 0.02;
          flockVy = sepY * 0.25 + alignY * 0.2 + cohY * 0.02;
        }

        let evadeX = 0, evadeY = 0, inDanger = false;
        for (let j = 0; j < this.apexPredators.length; j++) {
          const pred = this.apexPredators[j];
          const pDist = Math.hypot(pred.x - g.x, pred.y - g.y);
          if (pDist < 8) {
            const safeDist = Math.max(pDist, 0.001);
            evadeX += (g.x - pred.x) / (safeDist * 0.3);
            evadeY += (g.y - pred.y) / (safeDist * 0.3);
            inDanger = true;
          }
        }

        let forageVx = 0, forageVy = 0, closestPlant = null, closestDist = Infinity;
        const senseR = g.genome.r_sense || 8;
        for (let j = 0; j < this.plants.length; j++) {
          const p = this.plants[j];
          if (p.energy <= 4.0) continue;
          const d = Math.hypot(p.x - g.x, p.y - g.y);
          if (d < senseR && d < closestDist) {
            closestDist = d;
            closestPlant = p;
          }
        }

        if (closestPlant) {
          const safeDist = Math.max(closestDist, 0.001);
          forageVx = ((closestPlant.x - g.x) / safeDist) * g.genome.maxSpeed;
          forageVy = ((closestPlant.y - g.y) / safeDist) * g.genome.maxSpeed;

          if (closestDist < 1.2 && closestPlant.energy > 4.0) {
            const bite = Math.min(closestPlant.energy - 2.0, g.genome.b_eff);
            closestPlant.energy -= bite;
            g.energy = Math.min(80.0, g.energy + bite * 1.2);
            closestPlant.phi = 1.0;
            this.injectMorphogen(closestPlant.x, closestPlant.y, 1, 0.3);
          }
        }

        // Wormhole Gravity Pull & Transit
        const distToWh = Math.hypot(g.x - whX, g.y - whY);
        if (distToWh < 6.0) {
          const pull = (6.0 - distToWh) / 6.0;
          evadeX += ((whX - g.x) / Math.max(distToWh, 0.1)) * pull * 0.8;
          evadeY += ((whY - g.y) / Math.max(distToWh, 0.1)) * pull * 0.8;

          // Event Horizon Crossed -> Teleport to destination universe!
          if (distToWh < 1.4) {
            const targetSector = allSectors[myWormhole.toSector];
            if (targetSector) {
              const tWh = wormholeNodes[targetSector.sectorIdx];
              const tX = tWh.x * targetSector.cols;
              const tY = targetSector.headerRows + tWh.y * (targetSector.rows - targetSector.headerRows - targetSector.footerRows);

              this.grazers.splice(i, 1);
              targetSector.grazers.push({
                x: tX + (this.rng() - 0.5) * 2.0,
                y: tY + (this.rng() - 0.5) * 2.0,
                vx: g.vx * 1.2,
                vy: g.vy * 1.2,
                energy: g.energy,
                age: g.age,
                genome: g.genome,
                maxSpeed: g.maxSpeed
              });

              transitSparks.push({ from: this.sectorIdx, to: targetSector.sectorIdx, progress: 0, color: CGA.YELLOW });
              continue;
            }
          }
        }

        let desiredX = curl.u * 0.1 + flockVx * 0.8 + forageVx * 0.9;
        let desiredY = curl.v * 0.1 + flockVy * 0.8 + forageVy * 0.9;
        if (inDanger) {
          desiredX = evadeX * 3.0;
          desiredY = evadeY * 3.0;
        }

        g.vx += (desiredX - g.vx) * 0.12;
        g.vy += (desiredY - g.vy) * 0.12;
        const spd = Math.hypot(g.vx, g.vy);
        const maxSpd = inDanger ? g.genome.maxSpeed * 1.5 : g.genome.maxSpeed;
        if (spd > maxSpd) {
          g.vx = (g.vx / spd) * maxSpd;
          g.vy = (g.vy / spd) * maxSpd;
        }

        g.x = (g.x + g.vx + this.cols) % this.cols;
        g.y += g.vy;
        if (g.y < this.headerRows + 1) g.y = this.headerRows + 1;
        if (g.y > this.rows - this.footerRows - 1) g.y = this.rows - this.footerRows - 1;

        if (g.energy > 55.0 && this.grazers.length < 35) {
          g.energy -= 28.0;
          this.grazers.push({
            x: (g.x + 1) % this.cols,
            y: (g.y + 1) % this.rows,
            vx: (this.rng() - 0.5) * 0.6,
            vy: (this.rng() - 0.5) * 0.6,
            energy: 45.0,
            age: 0,
            genome: this.mutateGrazerGenome(g.genome),
            maxSpeed: g.genome.maxSpeed
          });
        }

        if (g.energy <= 0) {
          this.grazers.splice(i, 1);
        }
      }

      // 3. Apex Hunters Update
      for (let i = this.apexPredators.length - 1; i >= 0; i--) {
        const a = this.apexPredators[i];
        a.energy -= 0.28;
        if (a.sprintCooldown > 0) a.sprintCooldown--;
        a.isSprinting = false;

        let nearest = null, minDist = Infinity;
        for (let j = 0; j < this.grazers.length; j++) {
          const g = this.grazers[j];
          const dist = Math.hypot(g.x - a.x, g.y - a.y);
          if (dist < minDist && dist < 14) {
            minDist = dist;
            nearest = { g, idx: j, dist };
          }
        }

        let desiredVx = a.vx, desiredVy = a.vy;
        if (nearest) {
          const dx = nearest.g.x - a.x;
          const dy = nearest.g.y - a.y;
          const safeDist = Math.max(nearest.dist, 0.001);

          if (nearest.dist < 7 && a.energy > 20.0 && a.sprintCooldown === 0) {
            a.isSprinting = true;
            a.energy -= 0.45;
            desiredVx = (dx / safeDist) * a.burstSpeed;
            desiredVy = (dy / safeDist) * a.burstSpeed;
          } else {
            desiredVx = (dx / safeDist) * a.cruiseSpeed;
            desiredVy = (dy / safeDist) * a.cruiseSpeed;
          }

          if (nearest.dist < 1.3) {
            const victim = nearest.g;
            const strikeIdx = this.cellIdx(Math.floor(victim.x), Math.floor(victim.y));
            if (victim.genome && victim.genome.isArmored && this.rng() < 0.65) {
              this.A_field[strikeIdx] = Math.min(8.0, this.A_field[strikeIdx] + 2.0);
              a.energy -= 5.0;
              victim.energy -= 6.0;
              victim.vx -= (dx / safeDist) * 1.5;
              victim.vy -= (dy / safeDist) * 1.5;
              a.sprintCooldown = 30;
            } else {
              a.energy = Math.min(100.0, a.energy + 35.0);
              this.injectMorphogen(Math.floor(victim.x), Math.floor(victim.y), 2, 0.4);
              this.A_field[strikeIdx] = Math.min(8.0, this.A_field[strikeIdx] + 4.0);
              this.grazers.splice(nearest.idx, 1);
              a.sprintCooldown = 25;
            }
          }
        }

        a.vx += (desiredVx - a.vx) * 0.1;
        a.vy += (desiredVy - a.vy) * 0.1;
        a.x = (a.x + a.vx + this.cols) % this.cols;
        a.y += a.vy;
        if (a.y < this.headerRows + 1) a.y = this.headerRows + 1;
        if (a.y > this.rows - this.footerRows - 1) a.y = this.rows - this.footerRows - 1;

        if (a.energy <= 0) {
          this.apexPredators.splice(i, 1);
        }
      }

      // 4. Crabs
      for (let i = this.benthicCrabs.length - 1; i >= 0; i--) {
        const b = this.benthicCrabs[i];
        b.energy -= 0.05;
        const sIndex = this.cellIdx(Math.floor(b.x), Math.floor(b.y));
        if (this.D_field[sIndex] > 0.2) {
          this.D_field[sIndex] -= 0.3;
          this.S_field[sIndex] = Math.min(10.0, this.S_field[sIndex] + 0.55);
          b.energy = Math.min(90.0, b.energy + 0.6);
        }
        b.vx += (this.rng() - 0.5) * 0.08;
        b.vx = Math.max(-0.35, Math.min(0.35, b.vx));
        b.x = (b.x + b.vx + this.cols) % this.cols;
        b.y = Math.min(this.rows - this.footerRows - 1, Math.max(this.rows - this.footerRows - 4, b.y + (this.rng() - 0.5) * 0.2));

        if (b.energy <= 0) {
          this.benthicCrabs.splice(i, 1);
        }
      }
    }

    render(ctx, originX, originY, cellW, cellH) {
      const seasonIdx = Math.floor((this.seasonalTime / (Math.PI * 2)) * SEASONS.length) % SEASONS.length;
      const climate = SEASONS[seasonIdx];

      ctx.strokeStyle = CGA.DARK_GRAY;
      ctx.strokeRect(originX, originY, this.cols * cellW, this.rows * cellH);

      ctx.fillStyle = CGA.BLACK;
      ctx.fillRect(originX, originY, this.cols * cellW, this.headerRows * cellH);

      ctx.font = '11px Courier New, monospace';
      ctx.fillStyle = CGA.LIGHT_CYAN;
      const title = `[${this.id}] ${this.name.toUpperCase()} :: ${climate.name.slice(0, 10)} FL:${this.plants.length} GZ:${this.grazers.length} AP:${this.apexPredators.length}`;
      ctx.fillText(title.slice(0, this.cols), originX + 4, originY + 2);

      const headerLine = '═'.repeat(Math.max(0, this.cols));
      ctx.fillStyle = CGA.DARK_GRAY;
      ctx.fillText(headerLine, originX, originY + cellH);

      // Morphogen Field Render
      for (let x = 0; x < this.cols; x++) {
        for (let y = this.headerRows; y < this.rows - this.footerRows; y++) {
          const i = this.cellIdx(x, y);
          const v = this.TuringV[i];
          const s = this.S_field[i] / 10.0;
          const a = this.A_field[i] / 8.0;

          let ch = ' ';
          let col = CGA.BLACK;

          if (a > 0.15) {
            ch = '!';
            col = CGA.RED;
          } else if (v > 0.4) {
            ch = v > 0.7 ? '#' : '%';
            col = climate.color;
          } else if (s > 0.35) {
            ch = '.';
            col = CGA.DARK_GRAY;
          }

          if (ch !== ' ') {
            ctx.fillStyle = col;
            ctx.fillText(ch, originX + x * cellW, originY + y * cellH);
          }
        }
      }

      // Wormhole Event Horizon Portal Rendering
      const myWormhole = wormholeNodes[this.sectorIdx];
      const whX = Math.floor(myWormhole.x * this.cols);
      const whY = Math.floor(this.headerRows + myWormhole.y * (this.rows - this.headerRows - this.footerRows));
      myWormhole.spin = (myWormhole.spin + 0.15) % (Math.PI * 2);

      const portalGlyphs = ['☼', '◎', '⦿', '○', '•'];
      const pIdx = Math.floor((Math.sin(myWormhole.spin) * 0.5 + 0.5) * portalGlyphs.length) % portalGlyphs.length;
      ctx.fillStyle = CGA.LIGHT_MAGENTA;
      ctx.fillText(portalGlyphs[pIdx], originX + whX * cellW, originY + whY * cellH);
      ctx.fillStyle = CGA.LIGHT_CYAN;
      ctx.fillText(`⮞SEC-0${myWormhole.toSector + 1}`, originX + (whX - 2) * cellW, originY + (whY + 1) * cellH);

      // Flora
      for (let i = 0; i < this.plants.length; i++) {
        const p = this.plants[i];
        const sp = SPECIES_DOS[p.speciesIdx] || SPECIES_DOS[0];
        ctx.fillStyle = p.phi > 0.08 ? sp.flash : sp.color;
        ctx.fillText(sp.char, originX + p.x * cellW, originY + p.y * cellH);
      }

      // Grazers
      for (let i = 0; i < this.grazers.length; i++) {
        const g = this.grazers[i];
        let fChar = '>';
        if (g.genome && g.genome.isArmored) {
          fChar = '▲';
          ctx.fillStyle = CGA.YELLOW;
        } else if (g.genome && g.genome.maxSpeed > 0.68) {
          fChar = '»';
          ctx.fillStyle = CGA.LIGHT_GREEN;
        } else {
          const heading = Math.atan2(g.vy, g.vx);
          if (Math.abs(heading) > Math.PI * 0.75) fChar = '<';
          else if (heading > Math.PI * 0.25) fChar = 'v';
          else if (heading < -Math.PI * 0.25) fChar = '^';
          ctx.fillStyle = CGA.LIGHT_CYAN;
        }
        ctx.fillText(fChar, originX + Math.floor(g.x) * cellW, originY + Math.floor(g.y) * cellH);
      }

      // Apex Hunters
      for (let i = 0; i < this.apexPredators.length; i++) {
        const a = this.apexPredators[i];
        const heading = Math.atan2(a.vy, a.vx);
        let aChar = 'X';
        if (Math.abs(heading) > Math.PI * 0.75) aChar = '◄';
        else if (heading > Math.PI * 0.25) aChar = '▼';
        else if (heading < -Math.PI * 0.25) aChar = '▲';
        else aChar = '►';
        ctx.fillStyle = a.isSprinting ? CGA.LIGHT_RED : CGA.RED;
        ctx.fillText(aChar, originX + Math.floor(a.x) * cellW, originY + Math.floor(a.y) * cellH);
      }

      // Crabs
      ctx.fillStyle = CGA.BROWN;
      for (let i = 0; i < this.benthicCrabs.length; i++) {
        const b = this.benthicCrabs[i];
        ctx.fillText('¥', originX + Math.floor(b.x) * cellW, originY + Math.floor(b.y) * cellH);
      }
    }
  }

  const sectors = [
    new UniverseSector(0, 'SEC-01', 'Abyssal Trench', 0x7A49B2),
    new UniverseSector(1, 'SEC-02', 'Biolume Shelf', 0xC914E3),
    new UniverseSector(2, 'SEC-03', 'Solstice Spire', 0x11DF08),
    new UniverseSector(3, 'SEC-04', 'Resonance Basin', 0x88FA20)
  ];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const totalCols = Math.max(30, Math.floor(width / CHAR_W));
    const totalRows = Math.max(20, Math.floor(height / CHAR_H));

    if (layoutMode === '2x2') {
      const qCols = Math.floor(totalCols / 2);
      const qRows = Math.floor((totalRows - 3) / 2);
      sectors.forEach(s => s.resize(qCols, qRows));
    } else if (layoutMode === '1x3') {
      const cCols = Math.floor(totalCols / 3);
      const cRows = totalRows - 3;
      sectors.slice(0, 3).forEach(s => s.resize(cCols, cRows));
    } else {
      sectors[focusedSectorIdx].resize(totalCols, totalRows - 3);
    }
  }

  function renderAsciiInterface() {
    ctx.font = '12px Courier New, monospace';
    ctx.textBaseline = 'top';

    const footerTop = height - CHAR_H * 2.5;
    ctx.fillStyle = CGA.BLACK;
    ctx.fillRect(0, footerTop, width, CHAR_H * 3);

    ctx.fillStyle = CGA.LIGHT_GREEN;
    const divider = '═'.repeat(Math.floor(width / CHAR_W));
    ctx.fillText(divider, 0, footerTop);

    const nav = ` [M] LAYOUT: ${layoutMode.toUpperCase()}  |  [W] WORMHOLES: ACTIVE  |  [P] ${isPaused ? 'RESUME' : 'PAUSE'}  |  [R] RESEED  |  FPS: ${currentFps}`;
    ctx.fillText(nav, 0, footerTop + CHAR_H);
  }

  function renderTransitBeams() {
    if (layoutMode !== '2x2') return;

    for (let i = transitSparks.length - 1; i >= 0; i--) {
      const spark = transitSparks[i];
      spark.progress += 0.04;

      if (spark.progress >= 1.0) {
        transitSparks.splice(i, 1);
        continue;
      }

      // Compute visual screen coords between source and dest portals
      const fromSector = sectors[spark.from];
      const toSector = sectors[spark.to];
      const qCols = fromSector.cols;
      const qRows = fromSector.rows;

      const fOffX = (spark.from % 2 === 1) ? qCols * CHAR_W : 0;
      const fOffY = (spark.from >= 2) ? qRows * CHAR_H : 0;
      const tOffX = (spark.to % 2 === 1) ? qCols * CHAR_W : 0;
      const tOffY = (spark.to >= 2) ? qRows * CHAR_H : 0;

      const fX = fOffX + wormholeNodes[spark.from].x * qCols * CHAR_W;
      const fY = fOffY + (fromSector.headerRows + wormholeNodes[spark.from].y * (qRows - 3)) * CHAR_H;
      const tX = tOffX + wormholeNodes[spark.to].x * qCols * CHAR_W;
      const tY = tOffY + (toSector.headerRows + wormholeNodes[spark.to].y * (qRows - 3)) * CHAR_H;

      const curX = fX + (tX - fX) * spark.progress;
      const curY = fY + (tY - fY) * spark.progress;

      ctx.fillStyle = spark.color;
      ctx.fillText('✦', curX, curY);
    }
  }

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

    if (!isPaused) {
      sectors.forEach(s => s.update(now, sectors));
    }

    if (layoutMode === '2x2') {
      const qCols = sectors[0].cols;
      const qRows = sectors[0].rows;
      sectors[0].render(ctx, 0, 0, CHAR_W, CHAR_H);
      sectors[1].render(ctx, qCols * CHAR_W, 0, CHAR_W, CHAR_H);
      sectors[2].render(ctx, 0, qRows * CHAR_H, CHAR_W, CHAR_H);
      sectors[3].render(ctx, qCols * CHAR_W, qRows * CHAR_H, CHAR_W, CHAR_H);
      renderTransitBeams();
    } else if (layoutMode === '1x3') {
      const cCols = sectors[0].cols;
      sectors[0].render(ctx, 0, 0, CHAR_W, CHAR_H);
      sectors[1].render(ctx, cCols * CHAR_W, 0, CHAR_W, CHAR_H);
      sectors[2].render(ctx, cCols * 2 * CHAR_W, 0, CHAR_W, CHAR_H);
    } else {
      sectors[focusedSectorIdx].render(ctx, 0, 0, CHAR_W, CHAR_H);
    }

    renderAsciiInterface();
  }

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'm') {
      if (layoutMode === '2x2') layoutMode = '1x3';
      else if (layoutMode === '1x3') layoutMode = '1x1';
      else layoutMode = '2x2';
      resize();
    } else if (key === 'p') {
      isPaused = !isPaused;
    } else if (key === 'r') {
      sectors.forEach(s => s.reseed());
    } else if (key >= '1' && key <= '4') {
      focusedSectorIdx = parseInt(key, 10) - 1;
      layoutMode = '1x1';
      resize();
    }
  });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  resize();
  requestAnimationFrame(loop);
})();

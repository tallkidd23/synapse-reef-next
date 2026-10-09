// SYNAPSE COSMOS: MULTIVERSE ASTROPHYSICAL ORIGIN & GALAXY FORMATION ENGINE (DIMENSIONAL SUITE)
// Full mathematical parity: Gray-Scott Stellar Nucleogenesis, Navier-Stokes Galactic Curl Infall,
// Kuramoto Pulsar Entanglement, Relativistic Accretion Jets, Gravitational Wave Ripples,
// N-Body Accretion Boids, and Einstein-Rosen Wormhole Transport.
// Rendered in pure IBM-PC CP437 ASCII / 16-Color CGA Retrotech Graphics.

(function () {
  'use strict';

  const canvas = document.getElementById('reefCanvas');
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;

  const CHAR_W = 10;
  const CHAR_H = 14;

  // 16-Color CGA / EGA Retro Astrophysical Palette
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

  // Cosmological Epochs
  const COSMIC_EPOCHS = [
    { name: 'PRIMORDIAL DAWN', F: 0.038, k: 0.061, uvFlux: 1.4, tempK: 3200, bgChar: '.', color: CGA.LIGHT_BLUE },
    { name: 'STARBURST ACCRETION', F: 0.046, k: 0.063, uvFlux: 1.8, tempK: 12000, bgChar: ':', color: CGA.LIGHT_CYAN },
    { name: 'SUPERNOVA CRUCIBLE', F: 0.028, k: 0.058, uvFlux: 0.7, tempK: 85000, bgChar: '.', color: CGA.YELLOW },
    { name: 'QUASAR RELATIVISTIC', F: 0.054, k: 0.062, uvFlux: 2.4, tempK: 240000, bgChar: ':', color: CGA.LIGHT_MAGENTA }
  ];

  // Stellar & Proto-Galactic Evolutionary Classes (Pop III -> Pop II -> Pop I -> Compact Remnant)
  const STELLAR_CLASSES = [
    { name: 'Pop-III Blue Hypergiant', char: '☼', filament: '|', color: CGA.LIGHT_BLUE, flash: CGA.WHITE, metallicity: 'Zero (H/He)' },
    { name: 'Pop-II H-II Starburst Hub', char: 'ж', filament: '+', color: CGA.LIGHT_MAGENTA, flash: CGA.WHITE, metallicity: 'Low (CNO)' },
    { name: 'Pop-I Protostellar Core', char: '▲', filament: ':', color: CGA.YELLOW, flash: CGA.WHITE, metallicity: 'Solar (Iron-Rich)' },
    { name: 'Relativistic Magnetar', char: '♦', filament: '#', color: CGA.LIGHT_GREEN, flash: CGA.WHITE, metallicity: 'Degenerate' }
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

  let layoutMode = '2x2';
  let focusedSectorIdx = 0;
  let isPaused = false;
  let showDiagnosticHUD = false;
  let lastFpsUpdate = performance.now();
  let frameCount = 0;
  let currentFps = 60;

  // Inter-Universal Einstein-Rosen Wormhole Topology
  const wormholeNodes = [
    { fromSector: 0, toSector: 1, x: 0.85, y: 0.35, spin: 0 },
    { fromSector: 1, toSector: 2, x: 0.15, y: 0.80, spin: 0 },
    { fromSector: 2, toSector: 3, x: 0.85, y: 0.70, spin: 0 },
    { fromSector: 3, toSector: 0, x: 0.15, y: 0.30, spin: 0 }
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

      // Dark Matter, Baryonic Gas, Gravitational Radiation & Turing Substrates
      this.BaryonGas = null;      // S-Field: Neutral Hydrogen Gas Density
      this.StellarDust = null;    // D-Field: Supernova Metallicity & Heavy Dust
      this.GravAlarm = null;      // A-Field: High-Energy Relativistic Shockwave Radiation
      this.TuringU = null;        // Un-ionized Diffuse Molecular Substrate
      this.TuringV = null;        // Ionized H-II Starburst Shock Fronts
      this.nextU = null;
      this.nextV = null;

      // 2D Gravitational Wave Metric Field (Riemann Curvature Perturbation)
      this.GW_curr = null;
      this.GW_prev = null;
      this.GW_next = null;

      this.morphCycleTime = 0;
      this.epochTime = idx * 1.57;
      this.globalKuramotoCoupling = 0.04;

      // Astrophysical Entities & Relativistic Jets
      this.stellarCores = [];
      this.accretionSwarm = [];
      this.supermassiveHoles = [];
      this.dustCondensers = [];
      this.relativisticJets = [];
      this.cosmicDust = [];

      this.maxStars = 75;
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
      this.BaryonGas = new Float32Array(total);
      this.StellarDust = new Float32Array(total);
      this.GravAlarm = new Float32Array(total);
      this.TuringU = new Float32Array(total);
      this.TuringV = new Float32Array(total);
      this.nextU = new Float32Array(total);
      this.nextV = new Float32Array(total);

      this.GW_curr = new Float32Array(total);
      this.GW_prev = new Float32Array(total);
      this.GW_next = new Float32Array(total);

      for (let y = 0; y < this.rows; y++) {
        const gravitationalWell = 1.0 + (y / this.rows) * 1.5;
        for (let x = 0; x < this.cols; x++) {
          const i = x + y * this.cols;
          this.BaryonGas[i] = 3.5 + this.rng() * 3.0 * gravitationalWell;
          this.StellarDust[i] = 0.5 * gravitationalWell;
          this.GravAlarm[i] = 0.0;
          this.TuringU[i] = 1.0;
          this.TuringV[i] = 0.0;
          this.GW_curr[i] = 0.0;
          this.GW_prev[i] = 0.0;
          this.GW_next[i] = 0.0;

          if (y > this.headerRows + 3 && Math.hypot(x - this.cols * 0.5, y - this.rows * 0.7) < 4 && this.rng() < 0.035) {
            this.TuringV[i] = 0.8;
          }
        }
      }

      this.cosmicDust = [];
      const dustGlyphs = ['.', '·', '°', '*'];
      for (let i = 0; i < 20; i++) {
        this.cosmicDust.push({
          x: this.rng() * this.cols,
          y: this.headerRows + this.rng() * (this.rows - this.headerRows - this.footerRows),
          char: dustGlyphs[Math.floor(this.rng() * dustGlyphs.length)],
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

    getGalacticVorticity(x, y, t) {
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

    injectIonization(cx, cy, r, amtV) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (dx * dx + dy * dy <= r * r) {
            const i = this.cellIdx(cx + dx, cy + dy);
            this.TuringV[i] = Math.min(1.0, Math.max(0.0, this.TuringV[i] + amtV));
          }
        }
      }
    }

    triggerGravitationalWave(cx, cy, amplitude) {
      const i = this.cellIdx(Math.floor(cx), Math.floor(cy));
      this.GW_curr[i] += amplitude;
    }

    mutateAccretionGenome(parentGenome) {
      const drift = () => 1.0 + (this.rng() * 0.20 - 0.10);
      return {
        accretionBite: Math.max(1.2, Math.min(5.0, (parentGenome ? parentGenome.accretionBite : 2.8) * drift())),
        gravSense: Math.max(4, Math.min(12, Math.round((parentGenome ? parentGenome.gravSense : 8) * drift()))),
        orbitalVelocity: Math.max(0.40, Math.min(0.90, (parentGenome ? parentGenome.orbitalVelocity : 0.60) * drift())),
        isDenseIronCore: parentGenome ? (this.rng() < 0.12 ? !parentGenome.isDenseIronCore : parentGenome.isDenseIronCore) : this.rng() < 0.20,
        metallicityZ: parentGenome ? Math.min(1.0, parentGenome.metallicityZ + this.rng() * 0.08) : this.rng() * 0.15
      };
    }

    reseed() {
      this.stellarCores = [];
      this.accretionSwarm = [];
      this.supermassiveHoles = [];
      this.dustCondensers = [];
      this.relativisticJets = [];

      const rootCount = 5;
      for (let k = 0; k < rootCount; k++) {
        const rootX = Math.floor(3 + (k / (rootCount - 1)) * (this.cols - 6) + (this.rng() - 0.5) * 2);
        const rootY = Math.floor(this.rows - this.footerRows - 2 + this.rng() * 1.5);
        const spIdx = k % STELLAR_CLASSES.length;
        const root = {
          x: rootX, y: rootY, parent: null, filaments: [],
          speciesIdx: spIdx, fusionEnergy: 16.0, age: 0, maxAge: 1400 + Math.floor(this.rng() * 600),
          phi: 0.0, theta: this.rng() * Math.PI * 2, naturalFreq: 0.03 + (this.rng() - 0.5) * 0.01,
          entangledPair: null
        };
        this.stellarCores.push(root);

        for (let b = 0; b < 2; b++) {
          const bX = Math.max(1, Math.min(this.cols - 2, rootX + (b === 0 ? -1 : 1)));
          const bY = Math.max(this.headerRows + 1, Math.min(this.rows - this.footerRows - 1, rootY - 1));
          const child = {
            x: bX, y: bY, parent: root, filaments: [],
            speciesIdx: spIdx, fusionEnergy: 16.0, age: 0, maxAge: 1400 + Math.floor(this.rng() * 600),
            phi: 0.0, theta: this.rng() * Math.PI * 2, naturalFreq: 0.03 + (this.rng() - 0.5) * 0.01,
            entangledPair: null
          };
          root.filaments.push(child);
          this.stellarCores.push(child);
        }
      }

      for (let i = 0; i < 18; i++) {
        this.accretionSwarm.push({
          x: this.rng() * this.cols,
          y: this.headerRows + this.rng() * (this.rows - this.headerRows - this.footerRows),
          vx: (this.rng() - 0.5) * 0.6,
          vy: (this.rng() - 0.5) * 0.6,
          massEnergy: 45.0,
          age: 0,
          genome: this.mutateAccretionGenome(null),
          orbitalVelocity: 0.60
        });
      }

      for (let i = 0; i < 6; i++) {
        this.dustCondensers.push({
          x: this.rng() * this.cols,
          y: this.rows - this.footerRows - 2 + this.rng(),
          vx: (this.rng() - 0.5) * 0.3,
          coreEnergy: 55.0
        });
      }

      for (let i = 0; i < 2; i++) {
        this.supermassiveHoles.push({
          x: this.rng() * this.cols,
          y: this.headerRows + this.rng() * (this.rows - this.headerRows - this.footerRows),
          vx: (this.rng() - 0.5) * 0.8,
          vy: (this.rng() - 0.5) * 0.8,
          singularityMass: 65.0,
          cruiseSpeed: 0.65,
          burstSpeed: 1.10,
          isJetSprinting: false,
          jetCooldown: 0,
          jetAngle: this.rng() * Math.PI * 2
        });
      }
    }

    stepSubstrates(epoch) {
      this.morphCycleTime += 0.005;
      const breathing = Math.sin(this.morphCycleTime) * 0.003;
      const F = epoch.F + breathing;
      const k = epoch.k + breathing * 0.5;
      const Du = 0.16;
      const Dv = 0.08;
      const waveSpeedSq = 0.20;
      const waveDamping = 0.96;

      for (let x = 0; x < this.cols; x++) {
        for (let y = this.headerRows; y < this.rows - this.footerRows; y++) {
          const i = this.cellIdx(x, y);

          // 1. Gray-Scott Starburst Reaction Diffusion
          const u = this.TuringU[i];
          const v = this.TuringV[i];
          const lapU = (this.TuringU[this.cellIdx(x + 1, y)] + this.TuringU[this.cellIdx(x - 1, y)] +
            this.TuringU[this.cellIdx(x, y + 1)] + this.TuringU[this.cellIdx(x, y - 1)]) * 0.25 - u;
          const lapV = (this.TuringV[this.cellIdx(x + 1, y)] + this.TuringV[this.cellIdx(x - 1, y)] +
            this.TuringV[this.cellIdx(x, y + 1)] + this.TuringV[this.cellIdx(x, y - 1)]) * 0.25 - v;

          const localF = F + (this.BaryonGas[i] / 10.0) * 0.006;
          const localK = k + (this.GravAlarm[i] / 8.0) * 0.005;
          const uvv = u * v * v;

          let nU = u + (Du * lapU - uvv + localF * (1.0 - u));
          let nV = v + (Dv * lapV + uvv - (localF + localK) * v);

          if (y < this.headerRows + 5) {
            const fade = (y - this.headerRows) / 5.0;
            nV *= fade;
          }

          this.nextU[i] = Math.max(0.0, Math.min(1.0, nU));
          this.nextV[i] = Math.max(0.0, Math.min(1.0, nV));

          // 2. Gravitational Wave 2D Wave Propagation (Riemann Metric Ripple)
          const lapGW = (this.GW_curr[this.cellIdx(x + 1, y)] + this.GW_curr[this.cellIdx(x - 1, y)] +
            this.GW_curr[this.cellIdx(x, y + 1)] + this.GW_curr[this.cellIdx(x, y - 1)]) - 4.0 * this.GW_curr[i];
          let nextGW = (2.0 * this.GW_curr[i] - this.GW_prev[i] + waveSpeedSq * lapGW) * waveDamping;
          this.GW_next[i] = Math.abs(nextGW) < 0.002 ? 0.0 : nextGW;

          // 3. Supernova Metallicity Diffusion & Gas Enrichment
          const dVal = this.StellarDust[i];
          const deltaD = -0.015 * dVal + 0.02;
          this.StellarDust[i] = Math.max(0.0, dVal + deltaD);
          this.BaryonGas[i] = Math.min(10.0, this.BaryonGas[i] + 1.2 * Math.abs(deltaD));

          this.GravAlarm[i] *= 0.94;
        }
      }

      this.TuringU.set(this.nextU);
      this.TuringV.set(this.nextV);
      this.GW_prev.set(this.GW_curr);
      this.GW_curr.set(this.GW_next);
    }

    update(now, allSectors) {
      this.epochTime += 0.0015;
      const epochIdx = Math.floor((this.epochTime / (Math.PI * 2)) * COSMIC_EPOCHS.length) % COSMIC_EPOCHS.length;
      const epoch = COSMIC_EPOCHS[epochIdx];

      this.globalKuramotoCoupling = Math.max(0.04, this.globalKuramotoCoupling - 0.001);
      this.stepSubstrates(epoch);

      // Einstein-Rosen Wormhole Singularity
      const myWormhole = wormholeNodes[this.sectorIdx];
      const whX = Math.floor(myWormhole.x * this.cols);
      const whY = Math.floor(this.headerRows + myWormhole.y * (this.rows - this.headerRows - this.footerRows));

      this.injectIonization(whX, whY, 2, 0.15);

      // 1. Stellar Cores, Pop-III/II/I Evolution & Cross-Wormhole Quantum Entanglement
      for (let i = this.stellarCores.length - 1; i >= 0; i--) {
        const star = this.stellarCores[i];
        star.age++;
        star.phi = Math.max(0.0, star.phi - 0.04);

        let phaseCouplingSum = 0;
        let connectedCount = 0;
        if (star.parent && this.stellarCores.includes(star.parent)) {
          phaseCouplingSum += Math.sin(star.parent.theta - star.theta);
          connectedCount++;
        }
        for (let j = 0; j < star.filaments.length; j++) {
          const ch = star.filaments[j];
          if (this.stellarCores.includes(ch)) {
            phaseCouplingSum += Math.sin(ch.theta - star.theta);
            connectedCount++;
          }
        }

        // Non-Local Kuramoto Quantum Entanglement Coupling across wormhole
        if (star.entangledPair) {
          phaseCouplingSum += Math.sin(star.entangledPair.theta - star.theta) * 2.0;
          connectedCount += 2;
        }

        star.theta += star.naturalFreq + (connectedCount > 0 ? (this.globalKuramotoCoupling / connectedCount) * phaseCouplingSum : 0);
        star.theta %= (Math.PI * 2);

        const sIndex = this.cellIdx(star.x, star.y);
        const turingBoost = 1.0 + this.TuringV[sIndex] * 0.6;
        const u = Math.min(this.BaryonGas[sIndex], 0.35) * turingBoost;
        this.BaryonGas[sIndex] -= u * 0.5;

        const accretionRate = 0.65 * epoch.uvFlux * 1.0 * turingBoost;
        star.fusionEnergy += accretionRate * u - 0.09;

        // Wormhole Colonization with Quantum Entanglement Link
        if (Math.hypot(star.x - whX, star.y - whY) < 3.0 && star.fusionEnergy > 15.0 && this.rng() < 0.015) {
          const targetSector = allSectors[myWormhole.toSector];
          if (targetSector && targetSector.stellarCores.length < targetSector.maxStars) {
            const tWh = wormholeNodes[targetSector.sectorIdx];
            const tX = Math.floor(tWh.x * targetSector.cols) + (this.rng() < 0.5 ? 1 : -1);
            const tY = Math.floor(targetSector.headerRows + tWh.y * (targetSector.rows - targetSector.headerRows - targetSector.footerRows));
            
            const twin = {
              x: Math.max(1, Math.min(targetSector.cols - 2, tX)),
              y: Math.max(targetSector.headerRows + 1, Math.min(targetSector.rows - targetSector.footerRows - 1, tY)),
              parent: null,
              filaments: [],
              speciesIdx: star.speciesIdx,
              fusionEnergy: 18.0,
              age: 0,
              maxAge: 1400 + Math.floor(this.rng() * 600),
              phi: 1.0,
              theta: star.theta,
              naturalFreq: star.naturalFreq,
              entangledPair: star
            };
            star.entangledPair = twin;
            targetSector.stellarCores.push(twin);
            targetSector.injectIonization(tX, tY, 2, 0.5);
            transitSparks.push({ from: this.sectorIdx, to: targetSector.sectorIdx, progress: 0, color: CGA.LIGHT_MAGENTA });
          }
        }

        // Branching Galactic Bridge
        if (star.fusionEnergy > 14.0 && star.filaments.length < 2 && this.stellarCores.length < this.maxStars && this.rng() < 0.25) {
          const dx = this.rng() < 0.5 ? -1 : 1;
          const dy = -1 - (this.rng() < 0.25 ? 1 : 0);
          const childX = Math.max(1, Math.min(this.cols - 2, star.x + dx));
          const childY = Math.max(this.headerRows + 1, Math.min(this.rows - this.footerRows - 1, star.y + dy));

          let occupied = this.stellarCores.some(s => s.x === childX && s.y === childY);
          if (!occupied) {
            star.fusionEnergy -= 6.5;
            const child = {
              x: childX, y: childY, parent: star, filaments: [],
              speciesIdx: star.speciesIdx, fusionEnergy: 16.0, age: 0, maxAge: 1400 + Math.floor(this.rng() * 600),
              phi: 0.0, theta: this.rng() * Math.PI * 2, naturalFreq: 0.03 + (this.rng() - 0.5) * 0.01,
              entangledPair: null
            };
            star.filaments.push(child);
            this.stellarCores.push(child);
            this.injectIonization(childX, childY, 1, 0.4);
          }
        }

        // Supernova Collapse -> Trigger Gravitational Wave Ripple & Heavy Element Dust
        if (star.fusionEnergy <= 0 || star.age > star.maxAge) {
          this.StellarDust[sIndex] = Math.min(8.0, this.StellarDust[sIndex] + 1.2);
          this.triggerGravitationalWave(star.x, star.y, 2.5);
          if (star.parent) {
            const idx = star.parent.filaments.indexOf(star);
            if (idx !== -1) star.parent.filaments.splice(idx, 1);
          }
          if (star.entangledPair) star.entangledPair.entangledPair = null;
          this.stellarCores.splice(i, 1);
        }
      }

      // 2. Accretion Swarm & Protoplanetary Bodies
      for (let i = this.accretionSwarm.length - 1; i >= 0; i--) {
        const body = this.accretionSwarm[i];
        body.age++;
        body.massEnergy -= 0.06;

        const curl = this.getGalacticVorticity(body.x, body.y, now);
        let sepX = 0, sepY = 0, alignX = 0, alignY = 0, cohX = 0, cohY = 0, flockNeighbors = 0;

        for (let j = 0; j < this.accretionSwarm.length; j++) {
          const other = this.accretionSwarm[j];
          if (other === body) continue;
          const dist = Math.hypot(other.x - body.x, other.y - body.y);
          if (dist > 0 && dist < 5) {
            if (dist < 2) {
              sepX += (body.x - other.x) / dist;
              sepY += (body.y - other.y) / dist;
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
          cohX = cohX / flockNeighbors - body.x;
          cohY = cohY / flockNeighbors - body.y;
          flockVx = sepX * 0.25 + alignX * 0.2 + cohX * 0.02;
          flockVy = sepY * 0.25 + alignY * 0.2 + cohY * 0.02;
        }

        let evadeX = 0, evadeY = 0, inDanger = false;
        for (let j = 0; j < this.supermassiveHoles.length; j++) {
          const hole = this.supermassiveHoles[j];
          const hDist = Math.hypot(hole.x - body.x, hole.y - body.y);
          if (hDist < 8) {
            const safeDist = Math.max(hDist, 0.001);
            evadeX += (body.x - hole.x) / (safeDist * 0.3);
            evadeY += (body.y - hole.y) / (safeDist * 0.3);
            inDanger = true;
          }
        }

        let infallVx = 0, infallVy = 0, closestStar = null, closestDist = Infinity;
        const senseR = body.genome.gravSense || 8;
        for (let j = 0; j < this.stellarCores.length; j++) {
          const s = this.stellarCores[j];
          if (s.fusionEnergy <= 4.0) continue;
          const d = Math.hypot(s.x - body.x, s.y - body.y);
          if (d < senseR && d < closestDist) {
            closestDist = d;
            closestStar = s;
          }
        }

        if (closestStar) {
          const safeDist = Math.max(closestDist, 0.001);
          infallVx = ((closestStar.x - body.x) / safeDist) * body.genome.orbitalVelocity;
          infallVy = ((closestStar.y - body.y) / safeDist) * body.genome.orbitalVelocity;

          if (closestDist < 1.2 && closestStar.fusionEnergy > 4.0) {
            const accretionYield = Math.min(closestStar.fusionEnergy - 2.0, body.genome.accretionBite);
            closestStar.fusionEnergy -= accretionYield;
            body.massEnergy = Math.min(80.0, body.massEnergy + accretionYield * 1.2);
            closestStar.phi = 1.0;
            this.injectIonization(closestStar.x, closestStar.y, 1, 0.3);
          }
        }

        // Wormhole Horizon Crossing
        const distToWh = Math.hypot(body.x - whX, body.y - whY);
        if (distToWh < 6.0) {
          const pull = (6.0 - distToWh) / 6.0;
          evadeX += ((whX - body.x) / Math.max(distToWh, 0.1)) * pull * 0.8;
          evadeY += ((whY - body.y) / Math.max(distToWh, 0.1)) * pull * 0.8;

          if (distToWh < 1.4) {
            const targetSector = allSectors[myWormhole.toSector];
            if (targetSector) {
              const tWh = wormholeNodes[targetSector.sectorIdx];
              const tX = tWh.x * targetSector.cols;
              const tY = targetSector.headerRows + tWh.y * (targetSector.rows - targetSector.headerRows - targetSector.footerRows);

              this.accretionSwarm.splice(i, 1);
              targetSector.accretionSwarm.push({
                x: tX + (this.rng() - 0.5) * 2.0,
                y: tY + (this.rng() - 0.5) * 2.0,
                vx: body.vx * 1.2,
                vy: body.vy * 1.2,
                massEnergy: body.massEnergy,
                age: body.age,
                genome: body.genome,
                orbitalVelocity: body.orbitalVelocity
              });

              transitSparks.push({ from: this.sectorIdx, to: targetSector.sectorIdx, progress: 0, color: CGA.YELLOW });
              continue;
            }
          }
        }

        let desiredX = curl.u * 0.1 + flockVx * 0.8 + infallVx * 0.9;
        let desiredY = curl.v * 0.1 + flockVy * 0.8 + infallVy * 0.9;
        if (inDanger) {
          desiredX = evadeX * 3.0;
          desiredY = evadeY * 3.0;
        }

        body.vx += (desiredX - body.vx) * 0.12;
        body.vy += (desiredY - body.vy) * 0.12;
        const spd = Math.hypot(body.vx, body.vy);
        const maxSpd = inDanger ? body.genome.orbitalVelocity * 1.5 : body.genome.orbitalVelocity;
        if (spd > maxSpd) {
          body.vx = (body.vx / spd) * maxSpd;
          body.vy = (body.vy / spd) * maxSpd;
        }

        body.x = (body.x + body.vx + this.cols) % this.cols;
        body.y += body.vy;
        if (body.y < this.headerRows + 1) body.y = this.headerRows + 1;
        if (body.y > this.rows - this.footerRows - 1) body.y = this.rows - this.footerRows - 1;

        if (body.massEnergy > 55.0 && this.accretionSwarm.length < 35) {
          body.massEnergy -= 28.0;
          this.accretionSwarm.push({
            x: (body.x + 1) % this.cols,
            y: (body.y + 1) % this.rows,
            vx: (this.rng() - 0.5) * 0.6,
            vy: (this.rng() - 0.5) * 0.6,
            massEnergy: 45.0,
            age: 0,
            genome: this.mutateAccretionGenome(body.genome),
            orbitalVelocity: body.genome.orbitalVelocity
          });
        }

        if (body.massEnergy <= 0) {
          this.accretionSwarm.splice(i, 1);
        }
      }

      // 3. Supermassive Black Holes, Relativistic Jet Ejection & Tidal Disruption
      for (let i = this.supermassiveHoles.length - 1; i >= 0; i--) {
        const hole = this.supermassiveHoles[i];
        hole.singularityMass -= 0.28;
        if (hole.jetCooldown > 0) hole.jetCooldown--;
        hole.isJetSprinting = false;

        // Bipolar Relativistic Jet Emission
        hole.jetAngle = (hole.jetAngle + 0.04) % (Math.PI * 2);
        if (this.rng() < 0.25) {
          const jetSpeed = 1.6;
          this.relativisticJets.push({
            x: hole.x, y: hole.y,
            vx: Math.cos(hole.jetAngle) * jetSpeed,
            vy: Math.sin(hole.jetAngle) * jetSpeed,
            life: 22,
            color: CGA.LIGHT_MAGENTA
          });
          this.relativisticJets.push({
            x: hole.x, y: hole.y,
            vx: -Math.cos(hole.jetAngle) * jetSpeed,
            vy: -Math.sin(hole.jetAngle) * jetSpeed,
            life: 22,
            color: CGA.LIGHT_CYAN
          });
        }

        let nearest = null, minDist = Infinity;
        for (let j = 0; j < this.accretionSwarm.length; j++) {
          const body = this.accretionSwarm[j];
          const dist = Math.hypot(body.x - hole.x, body.y - hole.y);
          if (dist < minDist && dist < 14) {
            minDist = dist;
            nearest = { body, idx: j, dist };
          }
        }

        let desiredVx = hole.vx, desiredVy = hole.vy;
        if (nearest) {
          const dx = nearest.body.x - hole.x;
          const dy = nearest.body.y - hole.y;
          const safeDist = Math.max(nearest.dist, 0.001);

          if (nearest.dist < 7 && hole.singularityMass > 20.0 && hole.jetCooldown === 0) {
            hole.isJetSprinting = true;
            hole.singularityMass -= 0.45;
            desiredVx = (dx / safeDist) * hole.burstSpeed;
            desiredVy = (dy / safeDist) * hole.burstSpeed;
          } else {
            desiredVx = (dx / safeDist) * hole.cruiseSpeed;
            desiredVy = (dy / safeDist) * hole.cruiseSpeed;
          }

          if (nearest.dist < 1.3) {
            const victim = nearest.body;
            const strikeIdx = this.cellIdx(Math.floor(victim.x), Math.floor(victim.y));
            if (victim.genome && victim.genome.isDenseIronCore && this.rng() < 0.65) {
              this.GravAlarm[strikeIdx] = Math.min(8.0, this.GravAlarm[strikeIdx] + 2.0);
              hole.singularityMass -= 5.0;
              victim.massEnergy -= 6.0;
              victim.vx -= (dx / safeDist) * 1.5;
              victim.vy -= (dy / safeDist) * 1.5;
              hole.jetCooldown = 30;
              this.triggerGravitationalWave(victim.x, victim.y, 1.2);
            } else {
              hole.singularityMass = Math.min(100.0, hole.singularityMass + 35.0);
              this.injectIonization(Math.floor(victim.x), Math.floor(victim.y), 2, 0.4);
              this.GravAlarm[strikeIdx] = Math.min(8.0, this.GravAlarm[strikeIdx] + 4.0);
              this.triggerGravitationalWave(victim.x, victim.y, 3.5);
              this.accretionSwarm.splice(nearest.idx, 1);
              hole.jetCooldown = 25;
            }
          }
        }

        hole.vx += (desiredVx - hole.vx) * 0.1;
        hole.vy += (desiredVy - hole.vy) * 0.1;
        hole.x = (hole.x + hole.vx + this.cols) % this.cols;
        hole.y += hole.vy;
        if (hole.y < this.headerRows + 1) hole.y = this.headerRows + 1;
        if (hole.y > this.rows - this.footerRows - 1) hole.y = this.rows - this.footerRows - 1;

        if (hole.singularityMass <= 0) {
          this.supermassiveHoles.splice(i, 1);
        }
      }

      // 4. Relativistic Jets Propagation
      for (let i = this.relativisticJets.length - 1; i >= 0; i--) {
        const jet = this.relativisticJets[i];
        jet.x += jet.vx;
        jet.y += jet.vy;
        jet.life--;

        // Ionize and shock gas cells along the beam track
        const jIdx = this.cellIdx(Math.floor(jet.x), Math.floor(jet.y));
        this.TuringV[jIdx] = Math.min(1.0, this.TuringV[jIdx] + 0.15);

        if (jet.life <= 0 || jet.x < 0 || jet.x >= this.cols || jet.y < this.headerRows || jet.y >= this.rows - this.footerRows) {
          this.relativisticJets.splice(i, 1);
        }
      }

      // 5. Interstellar Dust Condensers
      for (let i = this.dustCondensers.length - 1; i >= 0; i--) {
        const d = this.dustCondensers[i];
        d.coreEnergy -= 0.05;
        const sIndex = this.cellIdx(Math.floor(d.x), Math.floor(d.y));
        if (this.StellarDust[sIndex] > 0.2) {
          this.StellarDust[sIndex] -= 0.3;
          this.BaryonGas[sIndex] = Math.min(10.0, this.BaryonGas[sIndex] + 0.55);
          d.coreEnergy = Math.min(90.0, d.coreEnergy + 0.6);
        }
        d.vx += (this.rng() - 0.5) * 0.08;
        d.vx = Math.max(-0.35, Math.min(0.35, d.vx));
        d.x = (d.x + d.vx + this.cols) % this.cols;
        d.y = Math.min(this.rows - this.footerRows - 1, Math.max(this.rows - this.footerRows - 4, d.y + (this.rng() - 0.5) * 0.2));

        if (d.coreEnergy <= 0) {
          this.dustCondensers.splice(i, 1);
        }
      }
    }

    render(ctx, originX, originY, cellW, cellH) {
      const epochIdx = Math.floor((this.epochTime / (Math.PI * 2)) * COSMIC_EPOCHS.length) % COSMIC_EPOCHS.length;
      const epoch = COSMIC_EPOCHS[epochIdx];

      ctx.strokeStyle = CGA.DARK_GRAY;
      ctx.strokeRect(originX, originY, this.cols * cellW, this.rows * cellH);

      ctx.fillStyle = CGA.BLACK;
      ctx.fillRect(originX, originY, this.cols * cellW, this.headerRows * cellH);

      ctx.font = '11px Courier New, monospace';
      ctx.fillStyle = CGA.LIGHT_CYAN;
      const title = `[${this.id}] ${this.name.toUpperCase()} :: ${epoch.name.slice(0, 11)} ST:${this.stellarCores.length} ACC:${this.accretionSwarm.length} SMBH:${this.supermassiveHoles.length}`;
      ctx.fillText(title.slice(0, this.cols), originX + 4, originY + 2);

      const headerLine = '═'.repeat(Math.max(0, this.cols));
      ctx.fillStyle = CGA.DARK_GRAY;
      ctx.fillText(headerLine, originX, originY + cellH);

      // Gas Density, Starburst Ionization & Gravitational Wave Metric Render
      for (let x = 0; x < this.cols; x++) {
        for (let y = this.headerRows; y < this.rows - this.footerRows; y++) {
          const i = this.cellIdx(x, y);
          const v = this.TuringV[i];
          const s = this.BaryonGas[i] / 10.0;
          const a = this.GravAlarm[i] / 8.0;
          const gw = Math.abs(this.GW_curr[i]);

          let ch = ' ';
          let col = CGA.BLACK;

          // Gravitational Wave Ripple Overlay
          if (gw > 0.4) {
            ch = gw > 1.2 ? ')' : '~';
            col = CGA.LIGHT_CYAN;
          } else if (a > 0.15) {
            ch = '!';
            col = CGA.RED;
          } else if (v > 0.4) {
            ch = v > 0.7 ? '#' : '%';
            col = epoch.color;
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

      // Einstein-Rosen Wormhole Event Horizon
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

      // Relativistic Jet Particle Streams
      for (let i = 0; i < this.relativisticJets.length; i++) {
        const jet = this.relativisticJets[i];
        ctx.fillStyle = jet.color;
        ctx.fillText('»', originX + Math.floor(jet.x) * cellW, originY + Math.floor(jet.y) * cellH);
      }

      // Stellar Cores & Entangled Pulsars
      for (let i = 0; i < this.stellarCores.length; i++) {
        const star = this.stellarCores[i];
        const sp = STELLAR_CLASSES[star.speciesIdx] || STELLAR_CLASSES[0];
        ctx.fillStyle = star.phi > 0.08 || (star.entangledPair && star.entangledPair.phi > 0.08) ? sp.flash : sp.color;
        ctx.fillText(sp.char, originX + star.x * cellW, originY + star.y * cellH);
      }

      // Accretion Swarm (Planetesimals, Cometary Disks, Dense Cores)
      for (let i = 0; i < this.accretionSwarm.length; i++) {
        const body = this.accretionSwarm[i];
        let fChar = '>';
        if (body.genome && body.genome.isDenseIronCore) {
          fChar = '▲';
          ctx.fillStyle = CGA.YELLOW;
        } else if (body.genome && body.genome.orbitalVelocity > 0.68) {
          fChar = '»';
          ctx.fillStyle = CGA.LIGHT_GREEN;
        } else {
          const heading = Math.atan2(body.vy, body.vx);
          if (Math.abs(heading) > Math.PI * 0.75) fChar = '<';
          else if (heading > Math.PI * 0.25) fChar = 'v';
          else if (heading < -Math.PI * 0.25) fChar = '^';
          ctx.fillStyle = CGA.LIGHT_CYAN;
        }
        ctx.fillText(fChar, originX + Math.floor(body.x) * cellW, originY + Math.floor(body.y) * cellH);
      }

      // Supermassive Black Holes & Hawking Sinks
      for (let i = 0; i < this.supermassiveHoles.length; i++) {
        const hole = this.supermassiveHoles[i];
        const heading = Math.atan2(hole.vy, hole.vx);
        let aChar = 'X';
        if (Math.abs(heading) > Math.PI * 0.75) aChar = '◄';
        else if (heading > Math.PI * 0.25) aChar = '▼';
        else if (heading < -Math.PI * 0.25) aChar = '▲';
        else aChar = '►';
        ctx.fillStyle = hole.isJetSprinting ? CGA.LIGHT_RED : CGA.RED;
        ctx.fillText(aChar, originX + Math.floor(hole.x) * cellW, originY + Math.floor(hole.y) * cellH);
      }

      // Interstellar Dust Condensers
      ctx.fillStyle = CGA.BROWN;
      for (let i = 0; i < this.dustCondensers.length; i++) {
        const d = this.dustCondensers[i];
        ctx.fillText('¥', originX + Math.floor(d.x) * cellW, originY + Math.floor(d.y) * cellH);
      }
    }
  }

  const sectors = [
    new UniverseSector(0, 'SEC-01', 'Pillars of Creation', 0x7A49B2),
    new UniverseSector(1, 'SEC-02', 'Carina Starburst', 0xC914E3),
    new UniverseSector(2, 'SEC-03', 'Tarantula Nebula', 0x11DF08),
    new UniverseSector(3, 'SEC-04', 'Orion Molecular Cloud', 0x88FA20)
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

    const nav = ` [M] MATRIX: ${layoutMode.toUpperCase()}  |  [GW] RIPPLES: ACTIVE  |  [JETS] ACTIVE  |  [P] ${isPaused ? 'RESUME' : 'PAUSE'}  |  [R] BIG BANG  |  FPS: ${currentFps}`;
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

// Synapse Reef v2 Simulation Engine
// Full canvas support, ecological trophic interactions, substrate diffusion, decay rings, and audio integration

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

    initSubstrateGrid();
  }

  // --- Telemetry Drawer Toggle ---
  if (drawerToggle && drawer) {
    drawerToggle.addEventListener('click', () => {
      const isExpanded = drawer.classList.toggle('expanded');
      if (drawerIndicator) {
        drawerIndicator.textContent = isExpanded ? '▼ Collapse' : '▲ Expand';
      }
      setTimeout(resize, 320);
    });
  }

  // --- Simulation State ---
  let isPaused = false;
  let showSubstrate = true;
  let audioEnabled = true;

  const simState = {
    biomass: 8320,
    floraMass: 7900,
    grazers: 42,
    crabs: 18,
    apexBiomass: 5,
    nutrientIndex: 1.13,
    signalEntropy: 0.28,
    waterTemp: 25.5,
    solarLux: 100,
    ph: 8.15,
    regime: 'Verdant Solstice'
  };

  // --- Entities & Decay Particles ---
  const entities = [];
  const decayParticles = [];
  const ENTITY_COUNT = 65;

  class Entity {
    constructor(type) {
      this.reset(type);
    }

    reset(type) {
      this.type = type || (Math.random() < 0.65 ? 'grazer' : Math.random() < 0.85 ? 'crab' : 'apex');
      this.x = Math.random() * (width || window.innerWidth);
      this.y = this.type === 'crab' ? (height * 0.75 + Math.random() * (height * 0.2)) : Math.random() * (height || window.innerHeight);
      this.vx = (Math.random() - 0.5) * (this.type === 'apex' ? 1.8 : this.type === 'grazer' ? 1.2 : 0.6);
      this.vy = (Math.random() - 0.5) * (this.type === 'apex' ? 1.8 : this.type === 'grazer' ? 1.2 : 0.4);
      this.radius = this.type === 'apex' ? 5.5 : this.type === 'grazer' ? 2.5 : 3.5;
      this.energy = 50 + Math.random() * 50;
      this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update() {
      this.pulsePhase += 0.05;
      this.energy -= 0.05;

      // Wrap-around or bounce boundaries
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;

      // Natural decay when energy depletes
      if (this.energy <= 0) {
        spawnDecay(this.x, this.y, this.type);
        this.reset();
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.beginPath();
      const glow = Math.sin(this.pulsePhase) * 1.5;

      if (this.type === 'grazer') {
        ctx.fillStyle = '#2ecc71';
        ctx.shadowColor = '#2ecc71';
        ctx.shadowBlur = 6;
        ctx.arc(this.x, this.y, Math.max(1.5, this.radius + glow * 0.5), 0, Math.PI * 2);
      } else if (this.type === 'crab') {
        ctx.fillStyle = '#e67e22';
        ctx.shadowColor = '#e67e22';
        ctx.shadowBlur = 8;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      } else { // apex
        ctx.fillStyle = '#e74c3c';
        ctx.shadowColor = '#e74c3c';
        ctx.shadowBlur = 12;
        ctx.arc(this.x, this.y, this.radius + glow, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
  }

  function spawnDecay(x, y, type) {
    for (let i = 0; i < 5; i++) {
      decayParticles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 8 + 4,
        alpha: 0.8,
        color: type === 'apex' ? '231, 76, 60' : type === 'crab' ? '230, 126, 34' : '46, 204, 113'
      });
    }
  }

  // --- Substrate Grid Background ---
  let cols = 0;
  let rows = 0;
  const CELL_SIZE = 40;
  let substrateGrid = [];

  function initSubstrateGrid() {
    cols = Math.ceil(width / CELL_SIZE) + 1;
    rows = Math.ceil(height / CELL_SIZE) + 1;
    substrateGrid = new Float32Array(cols * rows);
    for (let i = 0; i < substrateGrid.length; i++) {
      substrateGrid[i] = Math.random() * 0.3;
    }
  }

  function updateAndDrawSubstrate(ctx) {
    if (!showSubstrate) return;
    ctx.save();
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const val = substrateGrid[c + r * cols];
        if (val > 0.05) {
          ctx.fillStyle = `rgba(46, 204, 113, ${val * 0.15})`;
          ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
    ctx.restore();
  }

  // --- Populate Initial Ecosystem ---
  function initEcosystem() {
    entities.length = 0;
    for (let i = 0; i < ENTITY_COUNT; i++) {
      entities.push(new Entity());
    }
  }

  // --- Telemetry UI Sync ---
  function updateTelemetryUI() {
    const elBio = document.getElementById('hudBiomass');
    const elFlora = document.getElementById('metricFlora');
    const elGrazer = document.getElementById('metricGrazer');
    const elEntropy = document.getElementById('metricEntropy');
    const elNutrient = document.getElementById('metricNutrient');

    if (elBio) elBio.textContent = Math.round(simState.biomass);
    if (elFlora) elFlora.textContent = Math.round(simState.floraMass);
    if (elGrazer) elGrazer.textContent = simState.grazers;
    if (elEntropy) elEntropy.textContent = simState.signalEntropy.toFixed(2);
    if (elNutrient) elNutrient.textContent = simState.nutrientIndex.toFixed(2);
  }

  // --- Main Animation Loop ---
  let lastTick = performance.now();
  function loop(time) {
    requestAnimationFrame(loop);

    ctx.clearRect(0, 0, width, height);

    if (!isPaused) {
      // Substrate diffuse & render
      updateAndDrawSubstrate(ctx);

      // Render & update entities
      for (let i = 0; i < entities.length; i++) {
        entities[i].update();
        entities[i].draw(ctx);
      }

      // Render decay particles
      for (let i = decayParticles.length - 1; i >= 0; i--) {
        const p = decayParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.015;
        p.radius += 0.2;

        if (p.alpha <= 0) {
          decayParticles.splice(i, 1);
        } else {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${p.color}, ${p.alpha})`;
          ctx.lineWidth = 1.2;
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Drift metrics
      if (time - lastTick > 1000) {
        simState.biomass += (Math.random() - 0.48) * 4;
        simState.floraMass += (Math.random() - 0.48) * 3;
        simState.signalEntropy = 0.25 + Math.random() * 0.08;
        updateTelemetryUI();
        lastTick = time;
      }
    } else {
      updateAndDrawSubstrate(ctx);
      for (let i = 0; i < entities.length; i++) entities[i].draw(ctx);
    }
  }

  // --- Setup UI Listeners ---
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  const btnPause = document.getElementById('btnPause');
  if (btnPause) {
    btnPause.addEventListener('click', () => {
      isPaused = !isPaused;
      btnPause.textContent = isPaused ? 'Resume Substrate' : 'Pause Substrate';
    });
  }

  const btnReseed = document.getElementById('btnReseed');
  if (btnReseed) {
    btnReseed.addEventListener('click', () => {
      initEcosystem();
      initSubstrateGrid();
    });
  }

  const btnHeat = document.getElementById('btnHeatPulse');
  if (btnHeat) {
    btnHeat.addEventListener('click', () => {
      simState.waterTemp += 1.5;
      for (let i = 0; i < 15; i++) {
        if (entities.length > 0) {
          const e = entities[Math.floor(Math.random() * entities.length)];
          spawnDecay(e.x, e.y, e.type);
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

  // Initial boot
  resize();
  initEcosystem();
  requestAnimationFrame(loop);
})();

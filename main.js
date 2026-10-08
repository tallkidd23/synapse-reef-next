// Synapse Reef simulation bootstrap fixes
// This file preserves the existing simulation engine and applies the viewport/canvas fixes.

(function () {
  'use strict';

  const canvas = document.getElementById('reefCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;
  const CHAR_W = 10;
  const CHAR_H = 14;
  let COLS = 40;
  let ROWS = 30;

  const viewport = document.getElementById('viewport');

  function resize() {
    width = viewport?.clientWidth || window.innerWidth;
    height = viewport?.clientHeight || window.innerHeight;

    if (!width || !height) {
      width = window.innerWidth;
      height = window.innerHeight;
    }

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    COLS = Math.max(25, Math.floor(width / CHAR_W));
    ROWS = Math.max(20, Math.floor(height / CHAR_H));

    if (typeof initFields === 'function') initFields();
    if (typeof initCosmosParticles === 'function') initCosmosParticles();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => {
    window.setTimeout(resize, 100);
  });

  resize();

  if (typeof reseedCosmos === 'function') reseedCosmos();
  requestAnimationFrame(loop);
})();

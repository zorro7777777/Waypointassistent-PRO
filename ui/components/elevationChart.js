/**
 * @fileoverview Elevation profile chart — canvas renderer.
 *
 * @module ui/components/elevationChart
 */

/**
 * Render the elevation profile onto a canvas element.
 *
 * @param {number[]} elevations    - Array of elevation values in meters
 * @param {string}   canvasId      - DOM id of the <canvas> element
 * @param {string}   sectionId     - DOM id of the containing section (shown/hidden)
 * @param {{ upId: string, downId: string, maxId: string, minId: string }} statIds
 */
export function drawElevationChart(elevations, canvasId, sectionId, statIds) {
  if (!elevations || elevations.length < 2) return;

  const section = document.getElementById(sectionId);
  if (section) section.style.display = 'block';

  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById(canvasId));
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const W = canvas.offsetWidth  || 400;
  const H = canvas.offsetHeight || 80;
  canvas.width  = W;
  canvas.height = H;

  const minE = Math.min(...elevations);
  const maxE = Math.max(...elevations);
  const range = maxE - minE || 1;

  // ── Accumulate climb & descent ──────────────────────────────────────────
  let up = 0, down = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) up   += diff;
    else          down += Math.abs(diff);
  }

  // ── Background ─────────────────────────────────────────────────────────
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, W, H);

  // ── Gradient fill ──────────────────────────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0,   'rgba(0,191,255,0.4)');
  grad.addColorStop(1,   'rgba(0,191,255,0.02)');

  const toXY = (i) => ({
    x: (i / (elevations.length - 1)) * W,
    y: H - ((elevations[i] - minE) / range) * (H - 10) - 2,
  });

  ctx.beginPath();
  ctx.moveTo(0, H);
  elevations.forEach((_, i) => {
    const { x, y } = toXY(i);
    ctx.lineTo(x, y);
  });
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // ── Line ───────────────────────────────────────────────────────────────
  ctx.beginPath();
  elevations.forEach((_, i) => {
    const { x, y } = toXY(i);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#00bfff';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // ── Stats ──────────────────────────────────────────────────────────────
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set(statIds.upId,   Math.round(up));
  set(statIds.downId, Math.round(down));
  set(statIds.maxId,  Math.round(maxE));
  set(statIds.minId,  Math.round(minE));
}

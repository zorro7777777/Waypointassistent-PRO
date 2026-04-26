/**
 * @fileoverview UI controller — orchestrates DOM updates and event bindings.
 * Acts as the bridge between the state store and the various UI components.
 *
 * @module ui/uiController
 */

import { dispatch, getUIState }        from '../core/state.js';
import { logAnnouncement }             from './components/announcements.js';
import { renderWaypointList }          from './components/waypointList.js';
import { updateStats }                 from './components/stats.js';
import { showTab }                     from './components/tabs.js';
import { drawElevationChart }          from './components/elevationChart.js';
import { invalidateSize }              from '../map/mapController.js';
import { setSpeechEnabled }            from '../services/speechService.js';
import { savePreferences }             from '../services/storageService.js';

// ── Tab navigation ────────────────────────────────────────────────────────────

/**
 * Switch the active tab.
 * @param {string} name
 */
export function switchTab(name) {
  showTab(name, (n) => {
    if (n === 'map') invalidateSize();
    dispatch('UI_PATCH', { activeTab: n });
  });
}

// ── Config panel ──────────────────────────────────────────────────────────────

/**
 * Toggle the config/settings panel visibility.
 */
export function toggleConfig() {
  const area = document.getElementById('configArea');
  if (!area) return;
  const isVisible = area.style.display === 'block';
  area.style.display = isVisible ? 'none' : 'block';
  dispatch('UI_PATCH', { configOpen: !isVisible });
}

// ── User settings ─────────────────────────────────────────────────────────────

/**
 * Read profile + weight + audio settings from DOM, persist them.
 */
export function syncSettings() {
  const profile      = /** @type {HTMLSelectElement}  */ (document.getElementById('profile'))?.value ?? 'wandelen';
  const userWeight   = parseFloat(/** @type {HTMLInputElement}   */ (document.getElementById('userWeight'))?.value ?? '92');
  const audioEnabled = /** @type {HTMLInputElement}   */ (document.getElementById('audioToggle'))?.checked ?? true;

  setSpeechEnabled(audioEnabled);
  dispatch('UI_PATCH', { profile, userWeight, audioEnabled });
  savePreferences({ profile, userWeight, audioEnabled });
}

/**
 * Get current profile from DOM.
 * @returns {string}
 */
export function getProfile() {
  return /** @type {HTMLSelectElement} */ (document.getElementById('profile'))?.value ?? 'wandelen';
}

/**
 * Get current user weight from DOM.
 * @returns {number}
 */
export function getUserWeight() {
  return parseFloat(/** @type {HTMLInputElement} */ (document.getElementById('userWeight'))?.value ?? '92');
}

// ── Session button state ──────────────────────────────────────────────────────

/**
 * Update start/pause/stop buttons for session running state.
 * @param {'idle'|'running'|'paused'|'stopped'} state
 */
export function setSessionButtonState(state) {
  const startBtn = document.getElementById('startBtn');
  const stopBtn  = document.getElementById('stopBtn');
  const resetBtn = document.getElementById('resetBtn');
  if (!startBtn) return;

  switch (state) {
    case 'running':
      startBtn.textContent        = '⏸ PAUZE';
      startBtn.style.background   = 'var(--warning)';
      if (stopBtn)  stopBtn.style.display  = 'inline-block';
      if (resetBtn) resetBtn.style.display = 'none';
      break;
    case 'paused':
      startBtn.textContent        = '▶ HERVAT';
      startBtn.style.background   = 'var(--success)';
      break;
    case 'stopped':
    case 'idle':
      startBtn.textContent        = '▶ START';
      startBtn.style.background   = 'var(--success)';
      if (stopBtn)  stopBtn.style.display  = 'none';
      if (resetBtn) resetBtn.style.display = 'inline-block';
      break;
  }
}

// ── GPX loaded ────────────────────────────────────────────────────────────────

/**
 * Update UI after a GPX file has been successfully loaded.
 */
export function onGPXLoaded() {
  const standby  = document.getElementById('standby-msg');
  const liveUI   = document.getElementById('live-ui');
  const gpxInput = document.getElementById('gpxInput');
  const resetBtn = document.getElementById('resetBtn');

  if (standby)  standby.style.display  = 'none';
  if (liveUI)   liveUI.style.display   = 'block';
  if (gpxInput) gpxInput.style.display = 'none';
  if (resetBtn) resetBtn.style.display = 'inline-block';
}

// ── Elevation chart ───────────────────────────────────────────────────────────

/**
 * Draw the elevation profile if elevation data is available.
 * @param {number[]} elevations
 */
export function renderElevation(elevations) {
  if (elevations.length < 2) return;
  drawElevationChart(elevations, 'elevation-canvas', 'elevation-section', {
    upId:   'elev-up',
    downId: 'elev-down',
    maxId:  'elev-max',
    minId:  'elev-min',
  });
}

// ── Live update ───────────────────────────────────────────────────────────────

/**
 * Update all live stat fields.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number} acc
 * @param {number} speedKmh
 * @param {number} offRouteDist
 * @param {number} routePos
 */
export function updateLiveStats(lat, lon, acc, speedKmh, offRouteDist, routePos) {
  updateStats(lat, lon, acc, speedKmh, offRouteDist, routePos);
}

// ── Waypoint list ─────────────────────────────────────────────────────────────

/**
 * Re-render the waypoint list table.
 * @param {import('../core/types.js').Waypoint[]} waypoints
 * @param {(i: number) => void} onReadWp
 */
export function renderWaypoints(waypoints, onReadWp) {
  renderWaypointList(waypoints, 'wpList', 'wp-empty', onReadWp);
}

// ── Announcements ─────────────────────────────────────────────────────────────

/**
 * Add an announcement to the log.
 * @param {string} text
 */
export function addAnnouncement(text) {
  logAnnouncement(text, 'announce-log');
}

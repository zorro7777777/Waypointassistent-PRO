/**
 * @fileoverview Application controller — top-level orchestration.
 * Wires together all services, logic, map, and UI modules.
 * Responds to state events and user actions.
 *
 * @module app/appController
 */

import { dispatch, getRoute, getSession, on, resetSession } from '../core/state.js';
import { parseGPX }              from '../logic/gpxParser.js';
import { processGPSUpdate }      from '../logic/routeEngine.js';
import { startGPS, stopGPS, isGPSActive } from '../services/gpsService.js';
import { speak, clearSpeech }    from '../services/speechService.js';
import { loadPreferences }       from '../services/storageService.js';
import { formatVoiceDistance }   from '../logic/geo.js';

import { initMap, isMapReady }   from '../map/mapController.js';
import { drawRoute, updatePosition, centerOnUser } from '../map/mapRenderer.js';
import { setRotateEnabled, resetNorth, updateHeading } from '../map/mapInteraction.js';

import {
  switchTab, toggleConfig, syncSettings, setSessionButtonState,
  onGPXLoaded, renderElevation, updateLiveStats, renderWaypoints, addAnnouncement,
  getProfile, getUserWeight,
} from '../ui/uiController.js';

// ── Initialise ────────────────────────────────────────────────────────────────

/**
 * Bootstrap the application.
 * Call once after DOM is ready.
 */
export function init() {
  _applyStoredPreferences();
  _bindDOMEvents();
  _bindStateEvents();

  console.info('[app] WaypointAssistent PRO V4.8 ready.');
}

// ── Stored preferences ────────────────────────────────────────────────────────

function _applyStoredPreferences() {
  const prefs = loadPreferences();
  const profile      = document.getElementById('profile');
  const userWeight   = document.getElementById('userWeight');
  const audioToggle  = document.getElementById('audioToggle');

  if (profile)     profile.value     = prefs.profile;
  if (userWeight)  userWeight.value  = String(prefs.userWeight);
  if (audioToggle) audioToggle.checked = prefs.audioEnabled;
}

// ── DOM event bindings ────────────────────────────────────────────────────────

function _bindDOMEvents() {
  // GPX file input
  const gpxInput = document.getElementById('gpxInput');
  if (gpxInput) gpxInput.addEventListener('change', _handleGPXFile);

  // Settings inputs — sync on change
  ['profile', 'userWeight', 'audioToggle'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', syncSettings);
  });

  // Tab bar buttons
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Map tab needs size invalidation
  document.getElementById('tbtn-map')?.addEventListener('click', () => {
    switchTab('map');
  });

  // Config gear
  document.getElementById('configGear')?.addEventListener('click', toggleConfig);

  // Map controls
  document.getElementById('btnCenterUser')?.addEventListener('click', centerOnUser);
  document.getElementById('btnFitRoute')?.addEventListener('click', _fitRoute);
  document.getElementById('rotateToggle')?.addEventListener('change', (e) => {
    setRotateEnabled(e.target.checked);
  });
  document.getElementById('compass')?.addEventListener('click', resetNorth);

  // Layer switcher
  document.querySelectorAll('input[name="baselayer"]').forEach(radio => {
    radio.addEventListener('change', () => {
      import('../map/mapController.js').then(m => m.setBaseLayer(radio.value));
    });
  });
  document.getElementById('trailsOverlay')?.addEventListener('change', (e) => {
    import('../map/mapController.js').then(m => m.toggleTrails(e.target.checked));
  });
}

// ── State event subscriptions ─────────────────────────────────────────────────

function _bindStateEvents() {
  on('GPS_UPDATED', ({ lat, lon, acc, speedKmh, offRouteDist, routePos, heading }) => {
    updateLiveStats(lat, lon, acc, speedKmh, offRouteDist, routePos);

    if (isMapReady() && lat !== 0) {
      const route   = getRoute();
      const session = getSession();
      updatePosition(lat, lon, acc, heading, session.lastTrackIdx, route.track, route.waypoints);
      updateHeading(heading, 'compass');
    }
  });

  on('OFF_ROUTE_DETECTED', () => {
    _speak('Opgelet, u bent van de route afgeweken.', 'high');
  });

  on('OFF_ROUTE_ANNOUNCE', ({ text }) => {
    _speak(text, 'high');
  });

  on('ON_ROUTE_RETURNED', () => {
    _speak('U bent terug op de route.', 'medium');
  });

  on('WAYPOINT_PASSED', ({ waypoint, index }) => {
    _speak(`Punt bereikt: ${waypoint.name}.`, 'medium');
    const route  = getRoute();
    const nextWp = route.waypoints.slice(index + 1).find(w => !w.passed && !w.missed);
    if (nextWp) {
      const session = getSession();
      const dist    = Math.max(0, nextWp.routePos - session.lastTrackIdx);
      _speak(`Volgend punt is ${nextWp.name} over ${formatVoiceDistance(nextWp.routePos - (route.cumDist[session.lastTrackIdx] ?? 0))}.`, 'low');
    }
    renderWaypoints(getRoute().waypoints, readWaypoint);
  });

  on('WAYPOINT_MISSED', () => {
    const route = getRoute();
    const missed = route.waypoints.find(w => w.missed);
    if (missed) _speak(`Waypoint ${missed.name} gemist.`, 'medium');
    renderWaypoints(route.waypoints, readWaypoint);
  });

  on('SESSION_STARTED',  () => { setSessionButtonState('running'); });
  on('SESSION_PAUSED',   () => { setSessionButtonState('paused');  });
  on('SESSION_RESUMED',  () => { setSessionButtonState('running'); });
  on('SESSION_STOPPED',  () => { setSessionButtonState('stopped'); });
}

// ── User actions ──────────────────────────────────────────────────────────────

/**
 * Handle the start / pause / resume button.
 */
export function handleStartPause() {
  const route = getRoute();
  if (route.track.length === 0) {
    alert('Laad een GPX bestand om te beginnen.');
    return;
  }

  if (!isGPSActive()) {
    // Start tracking
    startGPS(_onGPSPosition, _onGPSError);
    dispatch('SESSION_STARTED', null);

    // Mark START waypoint as passed immediately (loop route fix)
    const startIdx = route.waypoints.findIndex(w => w.name === 'START');
    if (startIdx !== -1) {
      dispatch('WAYPOINT_PASSED', { index: startIdx });
    }

    getSession().lastTick = Date.now();
    _speak('Tracker geactiveerd.', 'medium');

  } else {
    const session = getSession();
    if (!session.isPaused) {
      dispatch('SESSION_PAUSED', null);
      _speak('Pauze.', 'low');
    } else {
      dispatch('SESSION_RESUMED', null);
      getSession().lastTick = Date.now();
      _speak('Hervat.', 'low');
    }
  }
}

/**
 * Handle the stop button.
 */
export function handleStop() {
  if (!isGPSActive()) return;
  stopGPS();
  clearSpeech();
  dispatch('SESSION_STOPPED', null);
  _speak('Tracker gestopt. De tellers zijn gepauzeerd.', 'medium');
}

/**
 * Read out waypoint info for the given index.
 * @param {number} index
 */
export function readWaypoint(index) {
  const w = getRoute().waypoints[index];
  if (!w) return;
  const text = w.desc
    ? `Info ${w.name}: ${w.desc}`
    : `Geen info beschikbaar voor ${w.name}.`;
  _speak(text, 'low');
}

// ── GPS callbacks ─────────────────────────────────────────────────────────────

/**
 * @param {GeolocationPosition} pos
 */
function _onGPSPosition(pos) {
  const session = getSession();
  if (session.isPaused || session.finished) return;

  try {
    processGPSUpdate(pos, getProfile(), getUserWeight());
  } catch (err) {
    console.error('[app] GPS processing error:', err);
  }
}

/**
 * @param {Error} err
 */
function _onGPSError(err) {
  console.error('[app] GPS error:', err.message);
  _speak(`GPS fout: ${err.message}`, 'high');
}

// ── GPX loading ───────────────────────────────────────────────────────────────

/**
 * @param {Event} e
 */
async function _handleGPXFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const text = await file.text();

  try {
    const routeData = parseGPX(text);
    dispatch('ROUTE_LOADED', routeData);

    onGPXLoaded();
    renderWaypoints(routeData.waypoints, readWaypoint);
    renderElevation(routeData.elevations);

    // Initialise map
    if (!isMapReady()) initMap('map');
    document.getElementById('map-no-gpx')?.remove();
    drawRoute(routeData.track, routeData.waypoints);

  } catch (err) {
    console.error('[app] GPX load error:', err);
    alert(`Fout bij laden GPX: ${err.message}`);
  }
}

// ── Map helpers ───────────────────────────────────────────────────────────────

function _fitRoute() {
  const track = getRoute().track;
  if (track.length === 0) return;
  import('../map/mapController.js').then(m => {
    m.fitBounds(track.map(p => [p.lat, p.lon]));
  });
}

// ── Announcements ─────────────────────────────────────────────────────────────

/**
 * Speak and log an announcement.
 * @param {string} text
 * @param {'high'|'medium'|'low'} priority
 */
function _speak(text, priority) {
  addAnnouncement(text);
  speak(text, priority);
}

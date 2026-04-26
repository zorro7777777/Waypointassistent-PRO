/**
 * @fileoverview Map renderer — draws routes, waypoint markers, user position.
 * Uses layer groups and marker pooling for performance.
 *
 * @module map/mapRenderer
 */

import { getMap, isMapReady, fitBounds } from './mapController.js';

// ── Layer references ──────────────────────────────────────────────────────────

/** @type {L.Polyline|null} */
let _polyDone = null;

/** @type {L.Polyline|null} */
let _polyTodo = null;

/** @type {L.Marker|null} */
let _userMarker = null;

/** @type {L.Circle|null} */
let _accuracyCircle = null;

/** @type {L.Marker[]} */
let _wpMarkers = [];

/** @type {L.Marker[]} */
let _arrows = [];

// ── Throttle for position updates ────────────────────────────────────────────
let _lastRenderTs = 0;
const RENDER_INTERVAL_MS = 1000 / 10; // max 10 fps

/**
 * Draw the full GPX route on the map.
 * Clears any previously drawn route layers first.
 *
 * @param {import('../core/types.js').TrackPoint[]} track
 * @param {import('../core/types.js').Waypoint[]}   waypoints
 */
export function drawRoute(track, waypoints) {
  const map = getMap();
  if (!map || track.length === 0) return;

  _clearRouteLayers(map);

  const latlngs = track.map(p => [p.lat, p.lon]);

  // ── Polylines ──────────────────────────────────────────────────────────
  _polyDone = L.polyline([], {
    color: '#7f8c8d', weight: 5, opacity: 0.7,
  }).addTo(map);

  _polyTodo = L.polyline(latlngs, {
    color: '#00bfff', weight: 5, opacity: 0.9,
  }).addTo(map);

  // ── Direction arrows ───────────────────────────────────────────────────
  const interval = Math.max(5, Math.floor(track.length / 30));
  for (let i = interval; i < track.length - 1; i += interval) {
    const p1  = track[i - 1];
    const p2  = track[i];
    const ang = Math.atan2(p2.lon - p1.lon, p2.lat - p1.lat) * (180 / Math.PI);

    const icon = L.divIcon({
      html: `<div style="transform:rotate(${ang}deg);color:#00bfff;font-size:14px;line-height:1;text-shadow:0 0 3px white">▲</div>`,
      iconSize:   [14, 14],
      iconAnchor: [7, 7],
      className:  '',
    });
    const arrow = L.marker([p2.lat, p2.lon], { icon, interactive: false }).addTo(map);
    _arrows.push(arrow);
  }

  // ── Waypoint markers ───────────────────────────────────────────────────
  waypoints.forEach((w, i) => {
    const icon   = _waypointIcon(w, i);
    const marker = L.marker([w.lat, w.lon], { icon })
      .bindPopup(`<b>${w.name}</b>${w.desc ? '<br>' + w.desc : ''}<br><small>${(w.routePos / 1000).toFixed(2)} km</small>`)
      .addTo(map);
    _wpMarkers.push(marker);
  });

  // Fit map to route bounds
  fitBounds(latlngs);
}

/**
 * Update the user's position marker and split the route polyline.
 * Throttled to max 10 fps.
 *
 * @param {number}   lat
 * @param {number}   lon
 * @param {number}   acc       - GPS accuracy in meters
 * @param {number|null} heading - Heading in degrees (0–360) or null
 * @param {number}   trackIdx  - Current track index (for polyline split)
 * @param {import('../core/types.js').TrackPoint[]} track
 * @param {import('../core/types.js').Waypoint[]}   waypoints
 */
export function updatePosition(lat, lon, acc, heading, trackIdx, track, waypoints) {
  const now = Date.now();
  if (now - _lastRenderTs < RENDER_INTERVAL_MS) return;
  _lastRenderTs = now;

  const map = getMap();
  if (!map) return;

  // ── User marker ────────────────────────────────────────────────────────
  const icon    = _userIcon(heading);
  const latlng  = [lat, lon];

  if (!_userMarker) {
    _userMarker     = L.marker(latlng, { icon, zIndexOffset: 1000 }).addTo(map);
    _accuracyCircle = L.circle(latlng, {
      radius:      acc,
      color:       '#2980b9',
      fillOpacity: 0.08,
      weight:      1,
    }).addTo(map);
  } else {
    _userMarker.setLatLng(latlng).setIcon(icon);
    _accuracyCircle.setLatLng(latlng).setRadius(acc);
  }

  // ── Polyline split ─────────────────────────────────────────────────────
  if (_polyDone && _polyTodo) {
    const done = track.slice(0, trackIdx + 1).map(p => [p.lat, p.lon]);
    const todo = track.slice(trackIdx).map(p => [p.lat, p.lon]);
    _polyDone.setLatLngs(done);
    _polyTodo.setLatLngs(todo);
  }

  // ── Waypoint marker opacity based on status ────────────────────────────
  waypoints.forEach((w, i) => {
    const marker = _wpMarkers[i];
    if (!marker) return;
    if (w.passed)      marker.setOpacity(0.5);
    else if (w.missed) marker.setOpacity(0.3);
    else               marker.setOpacity(1.0);
  });
}

/**
 * Center the map on the user marker.
 */
export function centerOnUser() {
  const map = getMap();
  if (!map || !_userMarker) return;
  map.setView(_userMarker.getLatLng(), 16);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Build a user position DivIcon with heading arrow.
 * @param {number|null} heading
 * @returns {L.DivIcon}
 */
function _userIcon(heading) {
  return L.divIcon({
    html: `
      <div style="width:18px;height:18px;background:#2980b9;border:3px solid white;
                  border-radius:50%;box-shadow:0 0 0 2px #2980b9;position:relative;">
        <div style="position:absolute;top:-8px;left:50%;
                    transform:translateX(-50%) rotate(${heading ?? 0}deg);
                    width:0;height:0;
                    border-left:4px solid transparent;border-right:4px solid transparent;
                    border-bottom:8px solid #2980b9;transform-origin:bottom center;">
        </div>
      </div>`,
    iconSize:   [18, 18],
    iconAnchor: [9, 9],
    className:  '',
  });
}

/**
 * Build a waypoint DivIcon based on waypoint type.
 * @param {import('../core/types.js').Waypoint} w
 * @param {number} index
 * @returns {L.DivIcon}
 */
function _waypointIcon(w, index) {
  let html;
  if (w.name === 'START') {
    html = `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">🚩</div>`;
  } else if (w.name === 'FINISH') {
    html = `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">🏁</div>`;
  } else {
    html = `
      <div style="background:#00bfff;color:white;border-radius:50%;width:22px;height:22px;
                  display:flex;align-items:center;justify-content:center;
                  font-size:10px;font-weight:bold;
                  box-shadow:0 2px 4px rgba(0,0,0,.3);border:2px solid white;">
        ${index}
      </div>`;
  }
  return L.divIcon({ html, iconSize: [22, 22], iconAnchor: [11, 11], className: '' });
}

/**
 * Remove all drawn route layers from the map.
 * @param {L.Map} map
 */
function _clearRouteLayers(map) {
  [_polyDone, _polyTodo].forEach(l => { if (l) map.removeLayer(l); });
  _arrows.forEach(a => map.removeLayer(a));
  _wpMarkers.forEach(m => map.removeLayer(m));
  _polyDone = _polyTodo = null;
  _arrows   = [];
  _wpMarkers = [];
}

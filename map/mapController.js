/**
 * @fileoverview Leaflet map controller — initialisation and layer management.
 * Isolated from business logic; receives data via explicit method calls.
 *
 * @module map/mapController
 */

/** @type {L.Map|null} */
let _map = null;

/** @type {Record<string, L.TileLayer>} */
let _baseLayers = {};

/** @type {L.TileLayer|null} */
let _trailsLayer = null;

/** @type {boolean} */
let _initialized = false;

/**
 * Initialise the Leaflet map inside the given container element.
 * Safe to call multiple times — no-op after first call.
 *
 * @param {string} containerId - DOM id of the map container
 */
export function initMap(containerId) {
  if (_initialized) return;
  _initialized = true;

  _map = L.map(containerId, {
    zoomControl:      true,
    attributionControl: true,
  }).setView([50.85, 4.35], 13);

  // ── Base layers ────────────────────────────────────────────────────────
  _baseLayers.osm = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: '© OpenStreetMap', maxZoom: 19 }
  ).addTo(_map);

  _baseLayers.topo = L.tileLayer(
    'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    { attribution: '© OpenTopoMap', maxZoom: 17 }
  );

  // ── Waymarked Trails overlay ───────────────────────────────────────────
  _trailsLayer = L.tileLayer(
    'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png',
    { attribution: '© Waymarked Trails', maxZoom: 19, opacity: 0.7 }
  );
}

/**
 * Switch the active base tile layer.
 * @param {'osm'|'topo'} name
 */
export function setBaseLayer(name) {
  if (!_map) return;
  Object.values(_baseLayers).forEach(l => _map.removeLayer(l));
  _baseLayers[name]?.addTo(_map);
  if (_map.hasLayer(_trailsLayer)) _trailsLayer.bringToFront();
}

/**
 * Toggle the Waymarked Trails overlay.
 * @param {boolean} on
 */
export function toggleTrails(on) {
  if (!_map || !_trailsLayer) return;
  if (on) _trailsLayer.addTo(_map);
  else    _map.removeLayer(_trailsLayer);
}

/**
 * Force Leaflet to recalculate container dimensions.
 * Call after revealing the map tab.
 */
export function invalidateSize() {
  if (_map) setTimeout(() => _map.invalidateSize(), 50);
}

/**
 * Fit the map to given lat/lon bounds.
 * @param {[number, number][]} latlngs
 */
export function fitBounds(latlngs) {
  if (!_map || latlngs.length === 0) return;
  _map.fitBounds(L.latLngBounds(latlngs), { padding: [20, 20] });
}

/**
 * Set map view to given coordinates.
 * @param {number} lat
 * @param {number} lon
 * @param {number} [zoom=16]
 */
export function setView(lat, lon, zoom = 16) {
  _map?.setView([lat, lon], zoom);
}

/**
 * Get the underlying Leaflet map instance (for advanced operations).
 * @returns {L.Map|null}
 */
export function getMap() { return _map; }

/**
 * Whether the map has been initialised.
 * @returns {boolean}
 */
export function isMapReady() { return _initialized && _map !== null; }

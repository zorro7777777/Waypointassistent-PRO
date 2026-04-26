/**
 * @fileoverview Pure geographic calculation functions.
 * No side effects, no state dependencies.
 *
 * @module logic/geo
 */

const EARTH_RADIUS_M = 6_371_000;
const TO_RAD = Math.PI / 180;

/**
 * Haversine distance between two GPS coordinates.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in meters
 */
export function haversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * TO_RAD;
  const dLon = (lon2 - lon1) * TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * TO_RAD) * Math.cos(lat2 * TO_RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Bearing (heading) from point A to point B, in degrees (0–360).
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number}
 */
export function bearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * TO_RAD;
  const y = Math.sin(dLon) * Math.cos(lat2 * TO_RAD);
  const x =
    Math.cos(lat1 * TO_RAD) * Math.sin(lat2 * TO_RAD) -
    Math.sin(lat1 * TO_RAD) * Math.cos(lat2 * TO_RAD) * Math.cos(dLon);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

/**
 * Low-pass filter for heading to smooth GPS jitter.
 * @param {number|null} previous - Previous smoothed heading (null = first reading)
 * @param {number}      current  - New raw heading
 * @param {number}      alpha    - Smoothing factor (0–1, higher = less smoothing)
 * @returns {number} Smoothed heading
 */
export function smoothHeading(previous, current, alpha) {
  if (previous === null) return current;
  // Handle wrap-around (e.g. 350° → 10°)
  let delta = current - previous;
  if (delta > 180)  delta -= 360;
  if (delta < -180) delta += 360;
  return (previous + alpha * delta + 360) % 360;
}

/**
 * Project point P onto segment AB, return closest point and parameter t ∈ [0,1].
 * Uses flat-earth approximation (safe for segments < ~10 km).
 *
 * @param {number} pLat
 * @param {number} pLon
 * @param {number} aLat
 * @param {number} aLon
 * @param {number} bLat
 * @param {number} bLon
 * @returns {{ dist: number, t: number }} dist = meters from P to closest point on AB
 */
export function projectPointToSegment(pLat, pLon, aLat, aLon, bLat, bLon) {
  // Convert to local Cartesian (meters) relative to A
  const cosLat = Math.cos(aLat * TO_RAD);
  const ax = 0, ay = 0;
  const bx = (bLon - aLon) * TO_RAD * EARTH_RADIUS_M * cosLat;
  const by = (bLat - aLat) * TO_RAD * EARTH_RADIUS_M;
  const px = (pLon - aLon) * TO_RAD * EARTH_RADIUS_M * cosLat;
  const py = (pLat - aLat) * TO_RAD * EARTH_RADIUS_M;

  const segLenSq = bx * bx + by * by;
  if (segLenSq === 0) {
    const dist = Math.sqrt(px * px + py * py);
    return { dist, t: 0 };
  }

  const t = Math.max(0, Math.min(1, (px * bx + py * by) / segLenSq));
  const cx = t * bx;
  const cy = t * by;
  const dx = px - cx;
  const dy = py - cy;
  return { dist: Math.sqrt(dx * dx + dy * dy), t };
}

/**
 * Find the closest position on a track to a given GPS point.
 * Uses segment projection for accuracy (better than nearest-point-only).
 *
 * @param {number}   lat
 * @param {number}   lon
 * @param {import('../core/types.js').TrackPoint[]} track
 * @param {number[]} cumDist    - Cumulative distances per track point
 * @param {number}   startIdx   - Start searching from this track index
 * @param {number}   endIdx     - Stop searching at this track index
 * @returns {{ dist: number, routePos: number, trackIdx: number }}
 */
export function findClosestOnRoute(lat, lon, track, cumDist, startIdx, endIdx) {
  let bestDist     = Infinity;
  let bestRoutePos = cumDist[startIdx] ?? 0;
  let bestIdx      = startIdx;

  for (let i = Math.max(0, startIdx); i < Math.min(track.length - 1, endIdx); i++) {
    const a = track[i];
    const b = track[i + 1];
    const { dist, t } = projectPointToSegment(lat, lon, a.lat, a.lon, b.lat, b.lon);

    if (dist < bestDist) {
      bestDist     = dist;
      bestIdx      = i;
      const segLen = cumDist[i + 1] - cumDist[i];
      bestRoutePos = cumDist[i] + t * segLen;
    }
  }

  return { dist: bestDist, routePos: bestRoutePos, trackIdx: bestIdx };
}

/**
 * Format a distance in meters for voice output (Dutch).
 * @param {number} meters
 * @returns {string}
 */
export function formatVoiceDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} meter`;
  return `${(meters / 1000).toFixed(1)} kilometer`.replace('.', ',');
}

/**
 * Current time as HH:MM string.
 * @returns {string}
 */
export function timeNowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * @fileoverview GPX file parser.
 * Converts raw GPX XML into the internal RouteState data structure.
 *
 * @module logic/gpxParser
 */

import { haversine } from './geo.js';

/**
 * Parse a GPX XML string into route data.
 *
 * @param {string} gpxText - Raw GPX file contents
 * @returns {{
 *   track:      import('../core/types.js').TrackPoint[],
 *   waypoints:  import('../core/types.js').Waypoint[],
 *   cumDist:    number[],
 *   totalDist:  number,
 *   elevations: number[],
 * }}
 * @throws {Error} If the GPX is invalid or has fewer than 2 track points
 */
export function parseGPX(gpxText) {
  let xml;
  try {
    xml = new DOMParser().parseFromString(gpxText, 'text/xml');
  } catch (err) {
    throw new Error(`GPX XML parse failure: ${err.message}`);
  }

  const parseError = xml.querySelector('parsererror');
  if (parseError) throw new Error(`Invalid GPX XML: ${parseError.textContent.slice(0, 100)}`);

  const trackPoints = [...xml.getElementsByTagName('trkpt')];
  if (trackPoints.length < 2) throw new Error('GPX must contain at least 2 track points.');

  // ── Build track & elevation arrays ────────────────────────────────────
  /** @type {import('../core/types.js').TrackPoint[]} */
  const track = [];
  /** @type {number[]} */
  const elevations = [];
  let hasElevation = true;

  for (const pt of trackPoints) {
    const lat = Number(pt.getAttribute('lat'));
    const lon = Number(pt.getAttribute('lon'));
    if (!isFinite(lat) || !isFinite(lon)) continue;

    track.push({ lat, lon });

    const eleEl = pt.getElementsByTagName('ele')[0];
    if (eleEl && hasElevation) {
      elevations.push(parseFloat(eleEl.textContent));
    } else {
      hasElevation = false;
    }
  }

  if (track.length < 2) throw new Error('No valid track points found in GPX.');

  // ── Cumulative distances ───────────────────────────────────────────────
  const cumDist = [0];
  for (let i = 0; i < track.length - 1; i++) {
    const d = haversine(track[i].lat, track[i].lon, track[i + 1].lat, track[i + 1].lon);
    cumDist.push(cumDist[i] + d);
  }
  const totalDist = cumDist.at(-1);

  // ── Parse waypoints ────────────────────────────────────────────────────
  const wptElements = [...xml.getElementsByTagName('wpt')];

  /** @type {import('../core/types.js').Waypoint[]} */
  let waypoints = wptElements.map(wEl => {
    const lat = Number(wEl.getAttribute('lat'));
    const lon = Number(wEl.getAttribute('lon'));
    const name = wEl.getElementsByTagName('name')[0]?.textContent?.trim() || 'WP';
    const desc = wEl.getElementsByTagName('desc')[0]?.textContent?.trim() || '';

    // Snap waypoint to nearest track position via cumulative distance
    let bestDist = Infinity;
    let routePos = 0;
    for (let i = 0; i < track.length; i++) {
      const d = haversine(lat, lon, track[i].lat, track[i].lon);
      if (d < bestDist) { bestDist = d; routePos = cumDist[i]; }
    }

    return { name, desc, lat, lon, routePos, passed: false, missed: false };
  });

  // ── Add START & FINISH if not already present ──────────────────────────
  const hasStart = waypoints.some(w => w.name === 'START');
  if (!hasStart && track.length > 0) {
    waypoints.push({
      name: 'START', desc: 'Startpunt',
      lat: track[0].lat, lon: track[0].lon,
      routePos: 0, passed: false, missed: false,
    });
  }

  const hasFinish = waypoints.some(w => w.name === 'FINISH');
  const lastWpPos = waypoints.length > 0 ? Math.max(...waypoints.map(w => w.routePos)) : 0;
  if (!hasFinish && totalDist - lastWpPos > 10) {
    const last = track.at(-1);
    waypoints.push({
      name: 'FINISH', desc: 'Einde spoor',
      lat: last.lat, lon: last.lon,
      routePos: totalDist, passed: false, missed: false,
    });
  }

  waypoints.sort((a, b) => a.routePos - b.routePos);

  return {
    track,
    waypoints,
    cumDist,
    totalDist,
    elevations: hasElevation ? elevations : [],
  };
}

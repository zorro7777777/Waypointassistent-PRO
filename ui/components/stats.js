/**
 * @fileoverview Stats UI component — updates DOM stat fields.
 * Pure write-only: receives computed values, writes to DOM.
 *
 * @module ui/components/stats
 */

import { averageSpeed, formatDuration, calculateETA } from '../../logic/metrics.js';
import { getRoute, getSession, getUIState } from '../../core/state.js';
import { ACTIVITY_PROFILES } from '../../core/config.js';

/**
 * Update all live stats in the UI.
 *
 * @param {number}      lat
 * @param {number}      lon
 * @param {number}      acc
 * @param {number}      speedKmh
 * @param {number}      offRouteDist
 * @param {number}      routePos
 */
export function updateStats(lat, lon, acc, speedKmh, offRouteDist, routePos) {
  const session   = getSession();
  const route     = getRoute();
  const uiState   = getUIState();
  const config    = ACTIVITY_PROFILES[uiState.profile] ?? ACTIVITY_PROFILES.wandelen;

  const nextWp    = route.waypoints.find(w => !w.passed && !w.missed);
  const prevWp    = [...route.waypoints].reverse().find(w => w.passed);
  const avgSpd    = averageSpeed(session.tripDist, session.movingTime);
  const remaining = route.totalDist - routePos;
  const eta       = calculateETA(remaining, speedKmh);
  const distToWp  = nextWp ? Math.max(0, Math.round(nextWp.routePos - routePos)) : 0;

  // ── Header stats ───────────────────────────────────────────────────────
  _set('ui-off-big',    `${Math.round(offRouteDist)}m`);
  _set('ui-speed-big',  speedKmh.toFixed(1));
  _set('ui-acc-big',    `${Math.round(acc)}m`);
  _set('ui-total-len',  `Track: ${(route.totalDist / 1000).toFixed(2)} km`);

  _style('ui-off-big', 'color', offRouteDist > 50 ? 'var(--danger)' : 'var(--accent)');

  // ── Current segment label ──────────────────────────────────────────────
  let segmentText;
  if (prevWp && nextWp)  segmentText = `${prevWp.name} ➔ ${nextWp.name}`;
  else if (nextWp)       segmentText = `Naar ${nextWp.name}`;
  else                   segmentText = '🏁 Bestemming bereikt';
  _set('ui-segment', segmentText);

  // ── Console stats ──────────────────────────────────────────────────────
  _set('ui-next-wp',    nextWp ? nextWp.name : 'FINISH');
  _set('ui-dist',       nextWp ? `${distToWp}m` : '0m');
  _set('ui-trip',       `${(session.tripDist / 1000).toFixed(3)} km`);
  _set('ui-eta',        eta ?? '--:--');
  _set('ui-mov-time',   formatDuration(session.movingTime));
  _set('ui-pau-time',   formatDuration(session.pauseTime));
  _set('ui-kcal',       String(Math.round(session.kcal)));
  _set('ui-met',        session.currentMet.toFixed(1));
  _set('ui-avg-speed',  avgSpd.toFixed(1));
  _set('ui-steps',      String(Math.floor(session.steps)));
  _set('ui-count-label', config.countLabel);
}

/**
 * Set text content of a DOM element by id.
 * @param {string} id
 * @param {string} value
 */
function _set(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/**
 * Set a style property on a DOM element.
 * @param {string} id
 * @param {string} prop
 * @param {string} value
 */
function _style(id, prop, value) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = value;
}

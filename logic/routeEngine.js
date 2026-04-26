/**
 * @fileoverview Route engine — processes each GPS position update.
 * Handles route matching, waypoint triggers, off-route detection.
 * All state changes go through dispatch().
 *
 * @module logic/routeEngine
 */

import { ACTIVITY_PROFILES, APP_CONFIG } from '../core/config.js';
import { dispatch, getRoute, getSession, patchSession } from '../core/state.js';
import {
  findClosestOnRoute,
  haversine,
  smoothHeading,
  bearing,
  formatVoiceDistance,
} from './geo.js';
import { getMET, kcalPerInterval, stepsPerInterval } from './metrics.js';

/**
 * Process a raw GPS position update.
 * This is the hot path — called on every geolocation event.
 *
 * @param {GeolocationPosition} pos
 * @param {string}              profile  - 'wandelen' | 'fietsen'
 * @param {number}              weightKg - User weight in kg
 * @returns {{
 *   lat: number, lon: number, acc: number,
 *   speedKmh: number, offRouteDist: number,
 *   routePos: number, heading: number|null
 * }} Values for UI update
 */
export function processGPSUpdate(pos, profile, weightKg) {
  const now     = Date.now();
  const session = getSession(); // mutable reference for hot path
  const route   = getRoute();
  const config  = ACTIVITY_PROFILES[profile] ?? ACTIVITY_PROFILES.wandelen;

  // ── Time delta ────────────────────────────────────────────────────────
  const delta = session.lastTick != null ? (now - session.lastTick) / 1000 : 0;
  session.lastTick = now;

  const { latitude: lat, longitude: lon, accuracy: acc, speed: rawSpeed } = pos.coords;
  const speedMs  = rawSpeed ?? 0;
  const speedKmh = speedMs * 3.6;

  // ── Heading ────────────────────────────────────────────────────────────
  let rawHeading = pos.coords.heading;
  if ((rawHeading == null || rawHeading < 0) && session.lastLat != null) {
    rawHeading = bearing(session.lastLat, session.lastLon, lat, lon);
  }
  const heading = smoothHeading(session.lastHeading, rawHeading ?? 0, APP_CONFIG.HEADING_SMOOTH_ALPHA);
  session.lastLat     = lat;
  session.lastLon     = lon;
  session.lastHeading = heading;

  // ── Movement detection ─────────────────────────────────────────────────
  const isMovingSignal = speedKmh > config.speedThreshold && acc < config.minAccuracy;
  if (isMovingSignal) session.moveSeconds += delta;
  else                session.moveSeconds  = 0;

  const isMoving = session.moveSeconds > APP_CONFIG.MOVEMENT_GRACE_SECONDS;

  if (isMoving) {
    session.movingTime  += delta;
    session.tripDist    += speedMs * delta;
    session.steps       += stepsPerInterval(speedMs, config.metersPerStep, delta);
    session.currentMet   = getMET(speedKmh, profile);
    session.kcal        += kcalPerInterval(session.currentMet, weightKg, delta);
  } else {
    session.pauseTime   += delta;
    session.currentMet   = 1.0;
  }

  // ── Route matching ─────────────────────────────────────────────────────
  const startIdx = Math.max(0, session.lastTrackIdx - APP_CONFIG.ROUTE_LOOKBACK);
  const endIdx   = Math.min(route.track.length - 1, session.lastTrackIdx + config.lookahead);

  const { dist: offRouteDist, routePos, trackIdx } = findClosestOnRoute(
    lat, lon, route.track, route.cumDist, startIdx, endIdx
  );
  session.lastTrackIdx = trackIdx;

  // ── Off-route detection ────────────────────────────────────────────────
  const offThreshold = Math.max(50, acc * 1.5);

  if (offRouteDist > offThreshold && isMoving) {
    if (!session.isOffRoute) {
      session.isOffRoute              = true;
      session.lastOffRouteSpeakDist   = offThreshold;
      dispatch('OFF_ROUTE_DETECTED', { dist: offRouteDist });
    } else {
      const step = Math.floor(offRouteDist / APP_CONFIG.OFF_ROUTE_ANNOUNCE_STEP)
                   * APP_CONFIG.OFF_ROUTE_ANNOUNCE_STEP;
      if (step > session.lastOffRouteSpeakDist) {
        session.lastOffRouteSpeakDist = step;
        dispatch('OFF_ROUTE_ANNOUNCE', { dist: step, text: `Afwijking nu ${step} meter.` });
      }
    }
  } else if (session.isOffRoute && offRouteDist < APP_CONFIG.ON_ROUTE_SNAP_METERS) {
    session.isOffRoute              = false;
    session.lastOffRouteSpeakDist   = 0;
    dispatch('ON_ROUTE_RETURNED', null);
  }

  // ── Waypoint triggers ──────────────────────────────────────────────────
  route.waypoints.forEach((w, i) => {
    if (w.passed || w.missed) return;

    const distToWp = haversine(lat, lon, w.lat, w.lon);
    const withinRadius = distToWp < config.waypointRadius;
    const passedOnRoute = routePos > w.routePos && distToWp < 35;

    if (withinRadius || passedOnRoute) {
      // FINISH guard: ensure all other waypoints are done first (loop route fix)
      if (w.name === 'FINISH') {
        const allDone = route.waypoints
          .filter((wp, idx) => idx !== i && wp.name !== 'START')
          .every(wp => wp.passed || wp.missed);
        if (!allDone) return;
      }
      w.passed = true; // mutate directly for hot path
      dispatch('WAYPOINT_PASSED', { index: i, routePos, speedKmh });

    } else if (routePos > w.routePos + APP_CONFIG.WAYPOINT_MISS_OFFSET) {
      w.missed = true;
      dispatch('WAYPOINT_MISSED', { index: i });
    }
  });

  // ── Emit GPS update for UI/map ────────────────────────────────────────
  dispatch('GPS_UPDATED', { lat, lon, acc, speedKmh, offRouteDist, routePos, heading });

  return { lat, lon, acc, speedKmh, offRouteDist, routePos, heading };
}

/**
 * Find the next unpassed waypoint after a given route position.
 * @param {import('../core/types.js').Waypoint[]} waypoints
 * @param {number} afterIndex
 * @returns {import('../core/types.js').Waypoint|null}
 */
export function nextWaypoint(waypoints, afterIndex) {
  return waypoints.slice(afterIndex + 1).find(w => !w.passed && !w.missed) ?? null;
}

/**
 * Build announcement text for the next waypoint after reaching one.
 * @param {import('../core/types.js').Waypoint} next
 * @param {number} currentRoutePos
 * @returns {string}
 */
export function announceNextWaypoint(next, currentRoutePos) {
  const dist = Math.max(0, next.routePos - currentRoutePos);
  return `Volgend punt is ${next.name} over ${formatVoiceDistance(dist)}.`;
}

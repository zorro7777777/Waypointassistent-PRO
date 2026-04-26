/**
 * @fileoverview Application configuration: activity profiles, MET tables, constants.
 */

/**
 * @typedef {Object} ActivityProfile
 * @property {number} metersPerStep - Distance per step/revolution in meters
 * @property {number} speedThreshold - Min speed (km/h) to count as moving
 * @property {number} waypointRadius - Radius in meters to trigger waypoint
 * @property {string} countLabel - Label for step/revolution counter
 * @property {number} minAccuracy - Max GPS accuracy (m) to consider valid
 * @property {number} lookahead - Track points to look ahead during route matching
 */

/** @type {Record<string, ActivityProfile>} */
export const ACTIVITY_PROFILES = {
  wandelen: {
    metersPerStep:  0.36,
    speedThreshold: 2.5,
    waypointRadius: 20,
    countLabel:     'STAPPEN',
    minAccuracy:    20,
    lookahead:      150,
  },
  fietsen: {
    metersPerStep:  5.5,
    speedThreshold: 3.0,
    waypointRadius: 35,
    countLabel:     'OMWENTELINGEN',
    minAccuracy:    30,
    lookahead:      300,
  },
};

/**
 * @typedef {Object} MetEntry
 * @property {number} maxSpeed - Upper speed bound (km/h) for this MET value
 * @property {number} met - MET value for this speed range
 */

/** @type {Record<string, MetEntry[]>} */
export const MET_TABLE = {
  wandelen: [
    { maxSpeed: 1.5,      met: 1.0 },
    { maxSpeed: 4.0,      met: 3.0 },
    { maxSpeed: 5.5,      met: 3.5 },
    { maxSpeed: Infinity, met: 4.5 },
  ],
  fietsen: [
    { maxSpeed: 1.5,      met: 1.0 },
    { maxSpeed: 15,       met: 5.0 },
    { maxSpeed: 20,       met: 6.5 },
    { maxSpeed: Infinity, met: 8.0 },
  ],
};

/** General application constants */
export const APP_CONFIG = {
  /** Seconds of continuous movement before counters start */
  MOVEMENT_GRACE_SECONDS: 3,
  /** Seconds before off-route detection kicks in */
  OFF_ROUTE_GRACE_SECONDS: 3,
  /** Meters: snap back to route threshold */
  ON_ROUTE_SNAP_METERS: 20,
  /** GPS update throttle in milliseconds */
  GPS_THROTTLE_MS: 250,
  /** Max UI FPS (map/stats refresh) */
  UI_MAX_FPS: 10,
  /** Track points to look back during route matching */
  ROUTE_LOOKBACK: 50,
  /** Off-route announcement step in meters */
  OFF_ROUTE_ANNOUNCE_STEP: 50,
  /** Waypoint "missed" threshold: meters past routePos */
  WAYPOINT_MISS_OFFSET: 100,
  /** Low-pass filter alpha for heading smoothing (0–1, lower = smoother) */
  HEADING_SMOOTH_ALPHA: 0.3,
  /** Map rotate CSS transition duration */
  MAP_ROTATE_TRANSITION: '0.3s ease',
};

/**
 * @fileoverview Shared type definitions (JSDoc).
 * In a TypeScript project these would be .ts interfaces/types.
 */

/**
 * A single point on the GPX track.
 * @typedef {Object} TrackPoint
 * @property {number} lat
 * @property {number} lon
 */

/**
 * A waypoint parsed from the GPX file.
 * @typedef {Object} Waypoint
 * @property {string} name
 * @property {string} desc
 * @property {number} lat
 * @property {number} lon
 * @property {number} routePos - Cumulative distance along route (meters)
 * @property {boolean} passed
 * @property {boolean} missed
 */

/**
 * Parsed GPX route data.
 * @typedef {Object} RouteState
 * @property {TrackPoint[]} track
 * @property {Waypoint[]}   waypoints
 * @property {number[]}     cumDist    - Cumulative distances per track point (meters)
 * @property {number}       totalDist  - Total route length in meters
 * @property {number[]}     elevations - Elevation per track point (may be empty)
 */

/**
 * Active session tracking state.
 * @typedef {Object} SessionState
 * @property {boolean} isStarted
 * @property {boolean} isPaused
 * @property {boolean} isOffRoute
 * @property {boolean} finished
 * @property {number}  lastTrackIdx       - Last matched track index
 * @property {number}  tripDist           - Total distance traveled (meters)
 * @property {number}  movingTime         - Seconds actively moving
 * @property {number}  pauseTime          - Seconds paused/still
 * @property {number}  kcal               - Kilocalories burned
 * @property {number}  steps              - Steps or revolutions
 * @property {number|null} lastTick       - Timestamp of last GPS update
 * @property {number|null} watchId        - Geolocation watchPosition ID
 * @property {number}  currentMet         - Current MET value
 * @property {number}  lastOffRouteSpeakDist
 * @property {number}  moveSeconds        - Consecutive seconds moving
 * @property {number|null} lastLat
 * @property {number|null} lastLon
 * @property {number|null} lastHeading    - Smoothed heading in degrees
 */

/**
 * UI display state.
 * @typedef {Object} UIState
 * @property {string} activeTab
 * @property {boolean} configOpen
 * @property {string}  profile     - 'wandelen' | 'fietsen'
 * @property {number}  userWeight
 * @property {boolean} audioEnabled
 */

/**
 * Speech queue state.
 * @typedef {Object} SpeechState
 * @property {Array<{text: string, priority: 'high'|'medium'|'low'}>} queue
 * @property {boolean} isSpeaking
 * @property {string}  lastMsg
 */

/**
 * Complete application state.
 * @typedef {Object} AppState
 * @property {RouteState}   route
 * @property {SessionState} session
 * @property {UIState}      ui
 * @property {SpeechState}  speech
 */

export {}; // module marker — types are used via JSDoc imports elsewhere

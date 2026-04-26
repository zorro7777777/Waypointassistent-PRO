/**
 * @fileoverview Central application state store.
 * Single source of truth — all state changes go through dispatch().
 * UI modules subscribe to specific state slices via on().
 *
 * @module core/state
 */

/** @type {import('./types.js').RouteState} */
const defaultRoute = () => ({
  track:      [],
  waypoints:  [],
  cumDist:    [],
  totalDist:  0,
  elevations: [],
});

/** @type {import('./types.js').SessionState} */
const defaultSession = () => ({
  isStarted:              false,
  isPaused:               false,
  isOffRoute:             false,
  finished:               false,
  lastTrackIdx:           0,
  tripDist:               0,
  movingTime:             0,
  pauseTime:              0,
  kcal:                   0,
  steps:                  0,
  lastTick:               null,
  watchId:                null,
  currentMet:             1.0,
  lastOffRouteSpeakDist:  0,
  moveSeconds:            0,
  lastLat:                null,
  lastLon:                null,
  lastHeading:            null,
});

/** @type {import('./types.js').UIState} */
const defaultUI = () => ({
  activeTab:    'home',
  configOpen:   false,
  profile:      'wandelen',
  userWeight:   92,
  audioEnabled: true,
});

/** @type {import('./types.js').SpeechState} */
const defaultSpeech = () => ({
  queue:      [],
  isSpeaking: false,
  lastMsg:    '',
});

/** @type {import('./types.js').AppState} */
let _state = {
  route:   defaultRoute(),
  session: defaultSession(),
  ui:      defaultUI(),
  speech:  defaultSpeech(),
};

/** @type {Map<string, Set<Function>>} */
const _listeners = new Map();

/**
 * Subscribe to state-change events.
 * @param {string}   event    - Event name (e.g. 'route', 'session', '*')
 * @param {Function} callback - Called with (newState, prevState)
 * @returns {() => void} Unsubscribe function
 */
export function on(event, callback) {
  if (!_listeners.has(event)) _listeners.set(event, new Set());
  _listeners.get(event).add(callback);
  return () => _listeners.get(event)?.delete(callback);
}

/**
 * Notify subscribers of an event.
 * @param {string} event
 * @param {*}      payload
 */
function _emit(event, payload) {
  _listeners.get(event)?.forEach(cb => cb(payload));
  _listeners.get('*')?.forEach(cb => cb({ event, payload }));
}

/**
 * Read-only snapshot of current state.
 * @returns {Readonly<import('./types.js').AppState>}
 */
export function getState() {
  return Object.freeze({
    route:   { ..._state.route,   waypoints: [..._state.route.waypoints] },
    session: { ..._state.session },
    ui:      { ..._state.ui },
    speech:  { ..._state.speech, queue: [..._state.speech.queue] },
  });
}

/**
 * Dispatch a state action.
 * All mutations happen here — no direct state writes outside this function.
 *
 * @param {string} action  - Action identifier (e.g. 'ROUTE_LOADED')
 * @param {*}      payload - Action data
 */
export function dispatch(action, payload) {
  const prev = _state;

  switch (action) {

    // ── Route ─────────────────────────────────────────────────────────────
    case 'ROUTE_LOADED':
      _state = { ..._state, route: { ...defaultRoute(), ...payload } };
      _emit('route', _state.route);
      break;

    case 'WAYPOINT_PASSED':
    case 'WAYPOINT_MISSED': {
      const waypoints = _state.route.waypoints.map((w, i) =>
        i === payload.index
          ? { ...w, passed: action === 'WAYPOINT_PASSED', missed: action === 'WAYPOINT_MISSED' }
          : w
      );
      _state = { ..._state, route: { ..._state.route, waypoints } };
      _emit('waypoints', waypoints);
      _emit(action, { waypoint: waypoints[payload.index], index: payload.index });
      break;
    }

    // ── Session ───────────────────────────────────────────────────────────
    case 'SESSION_STARTED':
      _state = { ..._state, session: { ..._state.session, isStarted: true, isPaused: false } };
      _emit('SESSION_STARTED', _state.session);
      break;

    case 'SESSION_PAUSED':
      _state = { ..._state, session: { ..._state.session, isPaused: true } };
      _emit('SESSION_PAUSED', _state.session);
      break;

    case 'SESSION_RESUMED':
      _state = { ..._state, session: { ..._state.session, isPaused: false } };
      _emit('SESSION_RESUMED', _state.session);
      break;

    case 'SESSION_STOPPED':
      _state = { ..._state, session: { ...defaultSession() } };
      _emit('SESSION_STOPPED', null);
      break;

    case 'SESSION_PATCH':
      _state = { ..._state, session: { ..._state.session, ...payload } };
      _emit('session', _state.session);
      break;

    case 'GPS_UPDATED':
      _emit('GPS_UPDATED', payload);
      break;

    case 'OFF_ROUTE_DETECTED':
      _state = { ..._state, session: { ..._state.session, isOffRoute: true } };
      _emit('OFF_ROUTE_DETECTED', payload);
      break;

    case 'ON_ROUTE_RETURNED':
      _state = { ..._state, session: { ..._state.session, isOffRoute: false, lastOffRouteSpeakDist: 0 } };
      _emit('ON_ROUTE_RETURNED', null);
      break;

    // ── UI ────────────────────────────────────────────────────────────────
    case 'UI_PATCH':
      _state = { ..._state, ui: { ..._state.ui, ...payload } };
      _emit('ui', _state.ui);
      break;

    // ── Speech ────────────────────────────────────────────────────────────
    case 'SPEECH_ENQUEUE':
      _state = {
        ..._state,
        speech: { ..._state.speech, queue: [..._state.speech.queue, payload], lastMsg: payload.text },
      };
      _emit('speech', _state.speech);
      break;

    case 'SPEECH_DEQUEUE': {
      const [, ...rest] = _state.speech.queue;
      _state = { ..._state, speech: { ..._state.speech, queue: rest } };
      break;
    }

    case 'SPEECH_SPEAKING':
      _state = { ..._state, speech: { ..._state.speech, isSpeaking: payload } };
      break;

    default:
      console.warn(`[state] Unknown action: ${action}`);
  }
}

/**
 * Direct (mutable) session patch — for hot-path GPS updates to avoid object churn.
 * Only use from routeEngine / gpsService where performance is critical.
 * @param {Partial<import('./types.js').SessionState>} patch
 */
export function patchSession(patch) {
  Object.assign(_state.session, patch);
}

/**
 * Get mutable reference to session — HOT PATH ONLY (GPS handler).
 * @returns {import('./types.js').SessionState}
 */
export function getSession() { return _state.session; }

/**
 * Get mutable reference to route data.
 * @returns {import('./types.js').RouteState}
 */
export function getRoute() { return _state.route; }

/**
 * Get UI state.
 * @returns {import('./types.js').UIState}
 */
export function getUIState() { return _state.ui; }

/**
 * Get speech state.
 * @returns {import('./types.js').SpeechState}
 */
export function getSpeechState() { return _state.speech; }

/**
 * Reset session to defaults (used on stop/reload).
 */
export function resetSession() {
  Object.assign(_state.session, defaultSession());
}

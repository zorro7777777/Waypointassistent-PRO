/**
 * @fileoverview GPS service — wraps the Geolocation API.
 * Provides start/stop/watch with throttling and error handling.
 *
 * @module services/gpsService
 */

import { APP_CONFIG } from '../core/config.js';

/** @type {number|null} */
let _watchId = null;

/** @type {number} */
let _lastEmit = 0;

/** @type {((pos: GeolocationPosition) => void)|null} */
let _onPosition = null;

/** @type {((err: GeolocationPositionError) => void)|null} */
let _onError = null;

/**
 * Start watching GPS position.
 *
 * @param {(pos: GeolocationPosition) => void}              onPosition
 * @param {(err: GeolocationPositionError) => void}         onError
 */
export function startGPS(onPosition, onError) {
  if (_watchId !== null) return; // already running

  _onPosition = onPosition;
  _onError    = onError;

  if (!navigator.geolocation) {
    onError(new Error('Geolocation API niet beschikbaar op dit apparaat.'));
    return;
  }

  _watchId = navigator.geolocation.watchPosition(
    _handlePosition,
    _handleError,
    {
      enableHighAccuracy: true,
      maximumAge:         0,
      timeout:            10_000,
    }
  );
}

/**
 * Stop watching GPS position.
 */
export function stopGPS() {
  if (_watchId === null) return;
  navigator.geolocation.clearWatch(_watchId);
  _watchId    = null;
  _onPosition = null;
  _onError    = null;
}

/**
 * Whether GPS is currently active.
 * @returns {boolean}
 */
export function isGPSActive() {
  return _watchId !== null;
}

/**
 * Internal handler — applies throttle before forwarding to consumer.
 * @param {GeolocationPosition} pos
 */
function _handlePosition(pos) {
  const now = Date.now();
  if (now - _lastEmit < APP_CONFIG.GPS_THROTTLE_MS) return;
  _lastEmit = now;
  _onPosition?.(pos);
}

/**
 * Internal error handler — maps GeolocationPositionError to friendly messages.
 * @param {GeolocationPositionError} err
 */
function _handleError(err) {
  const messages = {
    [GeolocationPositionError.PERMISSION_DENIED]:  'GPS-toegang geweigerd. Controleer uw browserinstellingen.',
    [GeolocationPositionError.POSITION_UNAVAILABLE]: 'GPS-positie niet beschikbaar (tunnel / indoor?)',
    [GeolocationPositionError.TIMEOUT]:              'GPS time-out — probeer opnieuw.',
  };
  const message = messages[err.code] ?? `GPS fout (code ${err.code})`;
  _onError?.(new Error(message));
}

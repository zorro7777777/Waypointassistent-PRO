/**
 * @fileoverview Map interaction — compass, heading rotation, north reset.
 *
 * @module map/mapInteraction
 */

import { getMap } from './mapController.js';
import { APP_CONFIG } from '../core/config.js';

/** @type {boolean} */
let _rotateEnabled = false;

/** @type {number} */
let _currentHeading = 0;

/**
 * Enable or disable map rotation with device heading.
 * @param {boolean} on
 */
export function setRotateEnabled(on) {
  _rotateEnabled = on;
  if (!on) resetNorth();
}

/**
 * Reset map rotation to north (0°).
 */
export function resetNorth() {
  _currentHeading = 0;
  _applyRotation(0);
}

/**
 * Update map and compass rotation based on new heading.
 * Only applies when rotation is enabled.
 *
 * @param {number|null} heading - Degrees (0–360), null = unknown
 * @param {string}      compassId - DOM id of compass element
 */
export function updateHeading(heading, compassId) {
  if (!_rotateEnabled || heading == null) return;
  _currentHeading = heading;
  _applyRotation(heading);

  const compass = document.getElementById(compassId);
  if (compass) compass.style.transform = `rotate(${heading}deg)`;
}

/**
 * Apply CSS rotation to the Leaflet map container.
 * @param {number} degrees
 */
function _applyRotation(degrees) {
  const map = getMap();
  if (!map) return;
  const container = map.getContainer();
  container.style.transformOrigin = 'center center';
  container.style.transition      = `transform ${APP_CONFIG.MAP_ROTATE_TRANSITION}`;
  container.style.transform       = degrees === 0 ? '' : `rotate(${-degrees}deg)`;
}

/**
 * @returns {number} Current heading in degrees
 */
export function getCurrentHeading() { return _currentHeading; }

/**
 * @returns {boolean}
 */
export function isRotateEnabled() { return _rotateEnabled; }

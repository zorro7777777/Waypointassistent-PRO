/**
 * @fileoverview Storage service — localStorage wrapper, future-ready for IndexedDB.
 * All persistence goes through this module.
 *
 * @module services/storageService
 */

const PREFIX = 'wpa_';

/**
 * Persist a value under a namespaced key.
 * @param {string} key
 * @param {*}      value - Will be JSON-serialised
 */
export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn('[storage] save failed:', key, err);
  }
}

/**
 * Load and parse a persisted value.
 * @param {string} key
 * @param {*}      [defaultValue=null]
 * @returns {*}
 */
export function load(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw !== null ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.warn('[storage] load failed:', key, err);
    return defaultValue;
  }
}

/**
 * Remove a persisted value.
 * @param {string} key
 */
export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (err) {
    console.warn('[storage] remove failed:', key, err);
  }
}

/**
 * Save user preferences (weight, profile, audioEnabled).
 * @param {{ profile: string, userWeight: number, audioEnabled: boolean }} prefs
 */
export function savePreferences(prefs) {
  save('prefs', prefs);
}

/**
 * Load user preferences with sensible defaults.
 * @returns {{ profile: string, userWeight: number, audioEnabled: boolean }}
 */
export function loadPreferences() {
  return load('prefs', {
    profile:      'wandelen',
    userWeight:   92,
    audioEnabled: true,
  });
}

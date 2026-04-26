/**
 * @fileoverview Activity metric calculations: MET, kcal, ETA, steps.
 * Pure functions — no state, no side effects.
 *
 * @module logic/metrics
 */

import { MET_TABLE } from '../core/config.js';

/**
 * Lookup MET value for a given speed and activity profile.
 * @param {number} speedKmh
 * @param {string} profile - 'wandelen' | 'fietsen'
 * @returns {number} MET value
 */
export function getMET(speedKmh, profile) {
  const table = MET_TABLE[profile] ?? MET_TABLE.wandelen;
  for (const entry of table) {
    if (speedKmh <= entry.maxSpeed) return entry.met;
  }
  return 1.0;
}

/**
 * Kilocalories burned in one time interval.
 * Formula: MET × weight(kg) × 3.5 / 200 / 60 × seconds
 *
 * @param {number} met       - Current MET
 * @param {number} weightKg  - User weight in kg
 * @param {number} seconds   - Duration of interval
 * @returns {number} kcal burned
 */
export function kcalPerInterval(met, weightKg, seconds) {
  return (met * weightKg * 3.5) / (200 * 60) * seconds;
}

/**
 * Steps or revolutions accumulated in one interval.
 * @param {number} speedMs      - Speed in m/s
 * @param {number} stepLength   - Meters per step/revolution (from profile)
 * @param {number} seconds      - Duration of interval
 * @returns {number}
 */
export function stepsPerInterval(speedMs, stepLength, seconds) {
  if (stepLength <= 0) return 0;
  return (speedMs / stepLength) * seconds;
}

/**
 * Estimated arrival time for remaining distance at current speed.
 * @param {number} remainingMeters
 * @param {number} speedKmh
 * @returns {string|null} HH:MM string or null if speed too low
 */
export function calculateETA(remainingMeters, speedKmh) {
  if (speedKmh < 2.0 || remainingMeters <= 0) return null;
  const seconds = remainingMeters / (speedKmh / 3.6);
  if (!isFinite(seconds)) return null;
  const arrival = new Date(Date.now() + seconds * 1000);
  return `${String(arrival.getHours()).padStart(2, '0')}:${String(arrival.getMinutes()).padStart(2, '0')}`;
}

/**
 * Average speed in km/h from total distance and moving time.
 * @param {number} distMeters
 * @param {number} movingSeconds
 * @returns {number}
 */
export function averageSpeed(distMeters, movingSeconds) {
  if (movingSeconds < 2) return 0;
  return (distMeters / movingSeconds) * 3.6;
}

/**
 * Format seconds as HH:MM:SS.
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatDuration(totalSeconds) {
  return new Date(totalSeconds * 1000).toISOString().slice(11, 19);
}

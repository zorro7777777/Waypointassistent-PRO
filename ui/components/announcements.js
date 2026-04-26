/**
 * @fileoverview Announcements log UI component.
 *
 * @module ui/components/announcements
 */

import { timeNowHHMM } from '../../logic/geo.js';

/**
 * Prepend a new announcement entry to the log list.
 *
 * @param {string} text   - Announcement text
 * @param {string} listId - DOM id of the <ul> element
 */
export function logAnnouncement(text, listId) {
  const log   = document.getElementById(listId);
  if (!log) return;

  // Remove empty-state placeholder
  const empty = log.querySelector('.ann-empty');
  if (empty) empty.remove();

  const icon = _iconForText(text);

  const li = document.createElement('li');
  li.innerHTML = `
    <span class="ann-icon">${icon}</span>
    <span class="ann-text">${text}</span>
    <span class="ann-time">${timeNowHHMM()}</span>
  `;
  log.insertBefore(li, log.firstChild);
}

/**
 * Pick an appropriate icon based on announcement content.
 * @param {string} text
 * @returns {string}
 */
function _iconForText(text) {
  if (text.includes('bereikt'))                                  return '✅';
  if (text.includes('gemist'))                                   return '❌';
  if (text.includes('route'))                                    return '⚠️';
  if (text.includes('terug'))                                    return '✅';
  if (text.includes('geactiveerd') || text.includes('Hervat'))   return '▶️';
  if (text.includes('gestopt')     || text.includes('Pauze'))    return '⏸️';
  if (text.includes('FINISH')      || text.includes('Bestemming')) return '🏁';
  return '📻';
}

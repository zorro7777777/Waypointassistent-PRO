/**
 * @fileoverview Waypoint list UI component.
 * Pure rendering — no state mutations.
 *
 * @module ui/components/waypointList
 */

/**
 * Render the waypoint table.
 *
 * @param {import('../../core/types.js').Waypoint[]} waypoints
 * @param {string}   tableId   - DOM id of the <table> element
 * @param {string}   emptyId   - DOM id of the empty-state element
 * @param {(i: number) => void} onRowClick - Callback when a row is clicked
 */
export function renderWaypointList(waypoints, tableId, emptyId, onRowClick) {
  const table = document.getElementById(tableId);
  const empty = document.getElementById(emptyId);
  if (!table) return;

  if (waypoints.length === 0) {
    if (empty) empty.style.display = 'block';
    table.innerHTML = '';
    return;
  }

  if (empty) empty.style.display = 'none';

  table.innerHTML = waypoints.map((w, i) => {
    const statusIcon  = w.passed ? '✅' : (w.missed ? '❌' : '⏳');
    const rowClass    = w.missed ? 'strikethrough' : '';
    const rowColor    = w.passed ? 'var(--success)' : '#333';
    const infoBadge   = w.desc
      ? `<span class="info-badge" title="${_escHtml(w.desc)}">i</span>`
      : '';
    const distLabel   = `${(w.routePos / 1000).toFixed(2)}km`;

    return `<tr
      data-idx="${i}"
      class="${rowClass}"
      style="color:${rowColor};cursor:pointer;"
    >
      <td style="width:30px">${statusIcon}</td>
      <td><b>${_escHtml(w.name)}</b>${infoBadge}</td>
      <td align="right">${distLabel}</td>
    </tr>`;
  }).join('');

  // Attach click listeners
  table.querySelectorAll('tr[data-idx]').forEach(row => {
    row.addEventListener('click', () => onRowClick(Number(row.dataset.idx)));
  });
}

/**
 * Minimal HTML escape to prevent XSS from GPX content.
 * @param {string} str
 * @returns {string}
 */
function _escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

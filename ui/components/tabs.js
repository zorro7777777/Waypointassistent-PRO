/**
 * @fileoverview Tab navigation component.
 *
 * @module ui/components/tabs
 */

/**
 * Switch to the named tab.
 * @param {string}   name       - Tab name (e.g. 'home', 'map', 'waypoints')
 * @param {Function} [onSwitch] - Optional callback after switching
 */
export function showTab(name, onSwitch) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById(`tab-${name}`);
  const btn   = document.getElementById(`tbtn-${name}`);

  if (panel) panel.classList.add('active');
  if (btn)   btn.classList.add('active');

  onSwitch?.(name);
}

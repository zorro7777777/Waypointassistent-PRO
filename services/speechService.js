/**
 * @fileoverview Speech synthesis service.
 * Priority queue (high/medium/low), deduplication, interrupt for critical messages.
 *
 * @module services/speechService
 */

/** @typedef {'high'|'medium'|'low'} SpeechPriority */

/**
 * @typedef {Object} SpeechItem
 * @property {string}         text
 * @property {SpeechPriority} priority
 */

/** @type {SpeechItem[]} */
let _queue = [];

/** @type {boolean} */
let _isSpeaking = false;

/** @type {string} */
let _lastText = '';

/** @type {boolean} */
let _enabled = true;

/**
 * Enable or disable speech output.
 * @param {boolean} enabled
 */
export function setSpeechEnabled(enabled) {
  _enabled = enabled;
  if (!enabled) {
    window.speechSynthesis.cancel();
    _queue      = [];
    _isSpeaking = false;
  }
}

/**
 * Enqueue a speech message.
 *
 * @param {string}         text
 * @param {SpeechPriority} [priority='medium']
 */
export function speak(text, priority = 'medium') {
  if (!text || text.length < 2) return;

  // Deduplicate: skip identical consecutive messages unless queue is short
  if (text === _lastText && _queue.length > 2) return;
  _lastText = text;

  const item = { text, priority };

  if (priority === 'high') {
    // High-priority: cancel current speech, prepend to queue
    window.speechSynthesis.cancel();
    _queue.unshift(item);
    _isSpeaking = false;
  } else if (priority === 'medium') {
    // Medium: insert before any 'low' items
    const lowIdx = _queue.findIndex(q => q.priority === 'low');
    if (lowIdx === -1) _queue.push(item);
    else               _queue.splice(lowIdx, 0, item);
  } else {
    _queue.push(item);
  }

  if (!_isSpeaking) _playNext();
}

/**
 * Clear the speech queue and stop current utterance.
 */
export function clearSpeech() {
  window.speechSynthesis.cancel();
  _queue      = [];
  _isSpeaking = false;
}

/**
 * Play the next item in the queue.
 */
function _playNext() {
  if (!_enabled || _queue.length === 0) {
    _isSpeaking = false;
    return;
  }

  _isSpeaking    = true;
  const { text } = _queue.shift();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = 'nl-NL';
  utterance.rate  = 1.0;
  utterance.onend = () => setTimeout(_playNext, 400);
  utterance.onerror = (e) => {
    console.warn('[speech] utterance error:', e.error);
    setTimeout(_playNext, 200);
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('[speech] speak() failed:', err);
    _isSpeaking = false;
  }
}

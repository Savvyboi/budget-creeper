/**
 * The whole "framework".
 *
 * Views are functions that return HTML strings, mounted into stable containers
 * with `mount()`. Interaction goes through one delegated click handler on the
 * document, matching `data-act` attributes — so re-rendering a section never
 * leaves dangling listeners behind, and there is nothing to keep in sync.
 *
 * At this size that is genuinely enough: the largest render is a few hundred
 * nodes, and each section re-renders on its own so a click in the detail panel
 * does not disturb the explorer's scroll position.
 */

/**
 * Escape text for interpolation into HTML.
 *
 * Budget item names come from an external API. They are data, never markup, and
 * every one of them passes through here before it reaches innerHTML.
 */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Tagged template that escapes every interpolated value. */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    out += (Array.isArray(value) ? value.join('') : esc(value)) + strings[i + 1];
  }
  return out;
}

/** Mark a string as already-safe HTML, so `html` does not escape it again. */
export function raw(value) {
  const wrapper = [String(value)];
  return wrapper;
}

export const $ = (selector, root = document) => root.querySelector(selector);

export function mount(container, markup) {
  container.innerHTML = markup;
  return container;
}

export function show(element, visible = true) {
  element.hidden = !visible;
}

const actions = new Map();

/**
 * Register a handler for `data-act="name"`. The handler receives the element's
 * dataset and the original event.
 */
export function action(name, handler) {
  actions.set(name, handler);
}

let wired = false;

/** Start listening. Safe to call more than once. */
export function startDelegation() {
  if (wired) return;
  wired = true;
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-act]') : null;
    if (!target) return;
    const handler = actions.get(target.dataset.act);
    if (!handler) return;
    event.preventDefault();
    handler(target.dataset, event, target);
  });
}

/** Format a `data-*` attribute list from a plain object. */
export function attrs(map) {
  return Object.entries(map)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(' ');
}

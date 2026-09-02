/*
 * Helpers for parsing header child-block content.
 *
 * The adc-header-* blocks are authored as multi-value "container" fields.
 * Their content renders as a flat list of field elements (<p>, <a>, <img>,
 * <ul>) separated by <hr> rules — NOT as a table of rows/cells. Empty fields
 * are omitted entirely, so fields must be classified by content, not position.
 */

const DEFAULT_ACTIONS = ['_self', '_blank', '_parent', '_top', 'modal', 'selftag'];

/**
 * Find the deepest element that directly holds the authored field list.
 * @param {Element} block The block element
 * @returns {Element} the cell containing <hr>/<p> field elements
 */
function findFieldCell(block) {
  const candidates = [...block.querySelectorAll('div')].reverse();
  const cell = candidates.find(
    (div) => [...div.children].some((child) => child.tagName === 'HR' || child.tagName === 'P'),
  );
  return cell || block;
}

/**
 * Split a block's authored fields into groups delimited by <hr>.
 * @param {Element} block The block element
 * @returns {Element[][]} an array of groups; each group is an array of field elements
 */
export function parseFieldGroups(block) {
  const cell = findFieldCell(block);
  const groups = [];
  let current = [];
  [...cell.children].forEach((el) => {
    if (el.tagName === 'HR') {
      if (current.length) groups.push(current);
      current = [];
    } else if (['P', 'A', 'UL', 'OL', 'PICTURE'].includes(el.tagName)) {
      current.push(el);
    }
  });
  if (current.length) groups.push(current);
  return groups;
}

/**
 * Classify a group of field elements into typed values.
 * @param {Element[]} group Field elements between two <hr> rules
 * @param {string[]} [actions] Recognised link-action values
 * @returns {{link: (HTMLAnchorElement|null), href: string, image: (HTMLImageElement|null),
 *   list: (Element|null), action: string, flags: boolean[], texts: string[]}}
 */
export function classifyGroup(group, actions = DEFAULT_ACTIONS) {
  const out = {
    link: null, href: '', image: null, list: null, action: '', flags: [], texts: [],
  };
  group.forEach((el) => {
    const image = el.querySelector('img');
    const anchor = el.querySelector('a');
    const list = el.matches('ul, ol') ? el : el.querySelector('ul, ol');
    if (image) { out.image = image; return; }
    if (list) { out.list = list; return; }
    if (anchor) {
      out.link = anchor;
      out.href = anchor.getAttribute('href') || anchor.href || '';
      return;
    }
    const text = el.textContent.trim();
    if (!text) return;
    const low = text.toLowerCase();
    if (actions.includes(low)) { out.action = low; return; }
    if (low === 'true' || low === 'false') { out.flags.push(low === 'true'); return; }
    out.texts.push(text);
  });
  return out;
}

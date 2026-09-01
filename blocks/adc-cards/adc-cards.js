import { moveInstrumentation } from '../../scripts/scripts.js';

// adc-cards: container block.
// Parent config rows (1 cell): section title text or column count ("2"/"3"/"4").
// Card-item children use resourceType block/v1/block/item — fields render as cells in
// a single row (not a nested block element). Cell structure per card:
//   cells[0]: variant text  (classes field → text cell for block/item children)
//   cells[1]: card image    (image + imageAlt field-collapsed into <picture>)
//   cells[2]: logo image    (logo  + logoAlt  field-collapsed into <picture>)
//   cells[3]: content group (content_title, content_description, content_cta+ctaText)

const CLICKABLE_TYPES = new Set(['clickable-card', 'support']);

/**
 * Extract an image element from a cell, handling all AEM rendering variants:
 *  - <picture> (CDN-optimised, aem.page/live)
 *  - bare <img> (author canvas)
 *  - <a><img></a> (linked image)
 *  - <a href="/content/dam/..."> (Remote Asset, author canvas)
 *  - plain URL text (fallback)
 */
function extractImage(cell) {
  if (!cell) return null;
  const pic = cell.querySelector('picture');
  if (pic) return pic;
  let img = cell.querySelector('img');
  if (img) return img;
  const a = cell.querySelector('a');
  if (a) {
    img = a.querySelector('img');
    if (img) return img;
    const href = a.getAttribute('href') || '';
    if (href && (href.startsWith('/') || href.startsWith('http'))) {
      const el = document.createElement('img');
      el.src = href;
      el.alt = a.textContent.trim();
      el.loading = 'lazy';
      return el;
    }
  }
  const src = cell.textContent.trim();
  if (src && (src.startsWith('/') || src.startsWith('http'))) {
    const el = document.createElement('img');
    el.src = src;
    el.alt = '';
    el.loading = 'lazy';
    return el;
  }
  return null;
}

/**
 * Extract title, description, and CTA from the content cells.
 * In xwalk block/item, content_* fields may be grouped (cells[3]) or
 * rendered as separate cells (cells[3]=title, cells[4]=desc, cells[5]=cta).
 */
function getContentEls(cells) {
  if (cells.length > 4) {
    // Separate cells — each content_* field in its own cell
    const [,,, cell3, cell4] = cells;
    return {
      titleEl: cell3?.firstElementChild,
      descEl: cell4?.firstElementChild,
      ctaEl: cells.slice(5).reduce((found, c) => found || c?.querySelector('a'), null),
    };
  }
  // Grouped cell — all content_* fields inside cells[3].
  // xwalk may wrap each field in its own <div> sub-cell, so flatten one level:
  //   <div> → [<div><p>title</p></div>, <div><p>desc</p></div>, <div><a>cta</a></div>]
  const [,,, raw4] = cells;
  const flatEls = [];
  [...(raw4?.children || [])].forEach((child) => {
    if (child.tagName === 'DIV') flatEls.push(...child.children);
    else flatEls.push(child);
  });
  // Deep fallback for <a> in case link is nested deeper
  const ctaEl = flatEls.find((el) => el.tagName === 'A') || raw4?.querySelector('a');
  const textEls = flatEls.filter((el) => {
    if (el.tagName === 'A') return false;
    // Skip <p> that only wraps a single link
    if (el.children.length === 1 && el.firstElementChild?.tagName === 'A') return false;
    return true;
  });
  const [titleEl, descEl] = textEls;
  return { titleEl, descEl, ctaEl };
}

function buildCard(row, cells) {
  const variant = cells[0]?.textContent.trim() || '';
  const imageCell = cells[1];
  const logoCell = cells[2];

  const picture = extractImage(imageCell);
  const logoPicture = extractImage(logoCell);
  const { titleEl, descEl, ctaEl } = getContentEls(cells);

  const card = document.createElement('div');
  card.className = `adc-card-item${variant ? ` ${variant}` : ''}`;
  // Move UE instrumentation (data-aue-*) from the original row to the card element
  // so Universal Editor can still track and select this card item after decoration.
  moveInstrumentation(row, card);

  const inner = document.createElement('div');
  inner.className = 'adc-card-inner';

  const media = document.createElement('div');
  media.className = 'adc-card-media';

  if (picture) {
    const wrap = document.createElement('div');
    wrap.className = 'adc-card-img';
    wrap.append(picture);
    media.append(wrap);
  }

  if (logoPicture) {
    const wrap = document.createElement('div');
    wrap.className = 'adc-card-logo-img';
    wrap.append(logoPicture);
    media.append(wrap);
  }

  if (media.children.length) inner.append(media);

  const body = document.createElement('div');
  body.className = 'adc-card-body';

  if (titleEl) {
    const h = document.createElement('h3');
    h.className = 'adc-card-title';
    h.innerHTML = titleEl.innerHTML;
    body.append(h);
  }

  if (descEl) {
    const p = document.createElement('p');
    p.className = 'adc-card-desc';
    p.innerHTML = descEl.innerHTML;
    body.append(p);
  }

  inner.append(body);

  if (CLICKABLE_TYPES.has(variant) && ctaEl) {
    const a = document.createElement('a');
    a.href = ctaEl.href;
    a.className = 'adc-card-link-wrap';
    if (ctaEl.target === '_blank') {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    a.append(inner);
    card.append(a);
  } else {
    if (ctaEl) {
      const actions = document.createElement('div');
      actions.className = 'adc-card-actions';
      const a = document.createElement('a');
      a.href = ctaEl.href;
      a.className = 'adc-card-action-primary';
      a.textContent = ctaEl.textContent.trim();
      if (ctaEl.target === '_blank') {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      actions.append(a);
      body.append(actions);
    }
    card.append(inner);
  }

  return card;
}

export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  if (!rows.length) return;

  let sectionTitle = '';
  let cols = '3';
  const cardRows = [];

  rows.forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    if (cells.length === 1) {
      // Single-cell config row: either a digit (columns) or text (section title)
      const val = cells[0].textContent.trim();
      if (/^\d+$/.test(val)) cols = val;
      else if (val) sectionTitle = val;
    } else if (cells.length === 2) {
      // xwalk may render block's own fields (title + columns) as a 2-cell row
      const v0 = cells[0].textContent.trim();
      const v1 = cells[1].textContent.trim();
      if (/^\d+$/.test(v1)) {
        cols = v1;
        if (v0) sectionTitle = v0;
      } else if (/^\d+$/.test(v0)) {
        cols = v0;
        if (v1) sectionTitle = v1;
      } else {
        // Both cells are text — treat first as title
        sectionTitle = v0 || sectionTitle;
      }
    } else if (cells.length >= 3) {
      cardRows.push({ row, cells });
    }
  });

  block.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'adc-cards-wrap';

  if (sectionTitle) {
    const h = document.createElement('h2');
    h.className = 'adc-cards-section-title';
    h.textContent = sectionTitle;
    wrap.append(h);
  }

  const grid = document.createElement('div');
  grid.className = 'adc-cards-grid';
  grid.style.setProperty('--adc-cards-cols', cols);

  cardRows.forEach(({ row, cells }) => grid.append(buildCard(row, cells)));

  wrap.append(grid);
  block.append(wrap);
}

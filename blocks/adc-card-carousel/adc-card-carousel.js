import { moveInstrumentation } from '../../scripts/scripts.js';

// adc-card-carousel: container block.
// Parent config rows (1 cell): title text or cardsPerScreen number (2–6).
// Card-item children use resourceType block/v1/block/item — fields render as
// cells in a single row. Cell structure per card:
//   cells[0]: variant text  (classes field → text cell for block/item children)
//   cells[1]: card image    (image + imageAlt field-collapsed into <picture>)
//   cells[2]: logo image    (logo  + logoAlt  field-collapsed into <picture>)
//   cells[3]: content group (content_title, content_description, content_cta+ctaText)

const CLICKABLE_TYPES = new Set(['clickable-card', 'support']);

/**
 * Extract an image/picture element from a cell, handling all AEM render variants:
 * - <picture> (CDN-optimised on aem.page/live)
 * - bare <img> (author canvas)
 * - <a><img></a> (linked image)
 * - <a href="/content/dam/..."> (Remote Asset, author canvas)
 * - plain URL text (last resort fallback)
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
    const [, , , cell3, cell4] = cells;
    return {
      titleEl: cell3?.firstElementChild,
      descEl: cell4?.firstElementChild,
      ctaEl: cells.slice(5).reduce((found, c) => found || c?.querySelector('a'), null),
    };
  }
  const raw4 = cells[3];
  const flatEls = [];
  [...(raw4?.children || [])].forEach((child) => {
    if (child.tagName === 'DIV') flatEls.push(...child.children);
    else flatEls.push(child);
  });
  const ctaEl = flatEls.find((el) => el.tagName === 'A') || raw4?.querySelector('a');
  const textEls = flatEls.filter((el) => {
    if (el.tagName === 'A') return false;
    if (el.children.length === 1 && el.firstElementChild?.tagName === 'A') return false;
    return true;
  });
  const [titleEl, descEl] = textEls;
  return { titleEl, descEl, ctaEl };
}

function buildCarouselCard(row, cells) {
  const variant = cells[0]?.textContent.trim() || '';
  const picture = extractImage(cells[1]);
  const logo = extractImage(cells[2]);
  const { titleEl, descEl, ctaEl } = getContentEls(cells);

  const card = document.createElement('div');
  const typeClass = variant ? `adc-carousel-card-type-${variant}` : 'adc-carousel-card-type-default';
  card.className = `adc-carousel-card ${typeClass}`;

  moveInstrumentation(row, card);

  if (picture || logo) {
    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'adc-carousel-card-media';
    if (picture) {
      const imgEl = picture.querySelector('img');
      if (imgEl) imgEl.loading = 'lazy';
      mediaWrap.append(picture);
    }
    if (logo) {
      const logoWrap = document.createElement('div');
      logoWrap.className = 'adc-carousel-card-logo';
      logoWrap.append(logo.querySelector('img') || logo);
      mediaWrap.append(logoWrap);
    }
    card.append(mediaWrap);
  }

  const body = document.createElement('div');
  body.className = 'adc-carousel-card-body';

  if (titleEl) {
    const h = document.createElement('p');
    h.className = 'adc-carousel-card-title';
    h.innerHTML = titleEl.innerHTML;
    body.append(h);
  }

  if (descEl) {
    const d = document.createElement('div');
    d.className = 'adc-carousel-card-desc';
    d.innerHTML = descEl.innerHTML;
    body.append(d);
  }

  if (!CLICKABLE_TYPES.has(variant) && ctaEl) {
    const cta = document.createElement('div');
    cta.className = 'adc-carousel-card-cta';
    const a = document.createElement('a');
    a.href = ctaEl.href;
    a.className = 'adc-carousel-card-link';
    a.textContent = ctaEl.textContent.trim();
    a.setAttribute('aria-label', ctaEl.textContent.trim());
    if (ctaEl.target === '_blank') {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    cta.append(a);
    body.append(cta);
  }

  card.append(body);

  if (CLICKABLE_TYPES.has(variant) && ctaEl) {
    const wrap = document.createElement('a');
    wrap.href = ctaEl.href;
    wrap.className = 'adc-carousel-card-link-wrap';
    wrap.setAttribute('aria-label', titleEl?.textContent?.trim() || ctaEl.textContent.trim());
    if (ctaEl.target === '_blank') {
      wrap.target = '_blank';
      wrap.rel = 'noopener noreferrer';
    }
    wrap.append(...[...card.childNodes]);
    card.append(wrap);
  }

  return card;
}

/**
 * Render the full carousel: track, prev/next arrows, and pill-indicator dots.
 * Navigation is page-based — each page shows `perScreen` cards.
 * Dots = ceil(total / perScreen). Arrows hidden on mobile via CSS.
 * Touch swipe supported on all viewports.
 */
function renderCarousel(block, cards, perScreen) {
  const total = cards.length;
  const totalPages = Math.ceil(total / perScreen);
  let currentPage = 0;

  // Build track ---
  const track = document.createElement('div');
  track.className = 'adc-carousel-track';
  track.setAttribute('aria-live', 'polite');
  track.style.setProperty('--adc-carousel-total', String(total));

  cards.forEach((cardEl, idx) => {
    const item = document.createElement('div');
    item.className = 'adc-carousel-item';
    item.setAttribute('aria-hidden', idx >= perScreen ? 'true' : 'false');
    item.append(cardEl);
    track.append(item);
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'adc-carousel-wrapper';
  wrapper.append(track);

  // Build pill dots (event listeners added after goTo is defined) ---
  const dotsEl = document.createElement('div');
  dotsEl.className = 'adc-carousel-dots';
  dotsEl.setAttribute('role', 'tablist');
  dotsEl.setAttribute('aria-label', 'Carousel navigation');

  const dotBtns = [];
  for (let i = 0; i < totalPages; i += 1) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `adc-carousel-dot${i === 0 ? ' adc-carousel-dot-active' : ''}`;
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Page ${i + 1} of ${totalPages}`);
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    const indicator = document.createElement('span');
    indicator.className = 'adc-carousel-dot-indicator';
    dot.append(indicator);
    dotsEl.append(dot);
    dotBtns.push(dot);
  }

  // Build arrow buttons ---
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'adc-carousel-btn adc-carousel-btn-prev';
  prevBtn.setAttribute('aria-label', 'Previous');
  prevBtn.disabled = true;
  prevBtn.innerHTML = '<span aria-hidden="true">&#8249;</span>';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'adc-carousel-btn adc-carousel-btn-next';
  nextBtn.setAttribute('aria-label', 'Next');
  nextBtn.disabled = totalPages <= 1;
  nextBtn.innerHTML = '<span aria-hidden="true">&#8250;</span>';

  // Navigation — defined before event listeners that reference it ---
  function goTo(page) {
    currentPage = Math.max(0, Math.min(page, totalPages - 1));
    const startCard = currentPage * perScreen;

    track.style.transform = `translateX(-${(startCard / total) * 100}%)`;

    [...track.querySelectorAll('.adc-carousel-item')].forEach((item, idx) => {
      item.setAttribute('aria-hidden', (idx >= startCard && idx < startCard + perScreen) ? 'false' : 'true');
    });

    dotBtns.forEach((d, i) => {
      const active = i === currentPage;
      d.classList.toggle('adc-carousel-dot-active', active);
      d.setAttribute('aria-selected', String(active));
    });

    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage === totalPages - 1;
  }

  // Wire up event listeners ---
  dotBtns.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
  prevBtn.addEventListener('click', () => goTo(currentPage - 1));
  nextBtn.addEventListener('click', () => goTo(currentPage + 1));

  // Touch swipe ---
  let touchStartX = 0;
  wrapper.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  wrapper.addEventListener('touchend', (e) => {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 50) goTo(currentPage + (delta < 0 ? 1 : -1));
  }, { passive: true });

  // Keyboard on wrapper ---
  wrapper.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goTo(currentPage - 1);
    else if (e.key === 'ArrowRight') goTo(currentPage + 1);
  });

  // Assemble ---
  block.textContent = '';
  if (total > 1) {
    block.append(prevBtn, wrapper, nextBtn, dotsEl);
  } else {
    block.append(wrapper);
  }
}

export default function decorate(block) {
  const allRows = [...block.querySelectorAll(':scope > div')];
  if (!allRows.length) return;

  let titleText = '';
  let cardsPerScreen = 3;
  const cardRows = [];

  allRows.forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    if (cells.length === 1) {
      const val = cells[0].textContent.trim();
      const num = parseInt(val, 10);
      if (!Number.isNaN(num) && num >= 2 && num <= 6) {
        cardsPerScreen = num;
      } else if (val) {
        titleText = val;
      }
    } else if (cells.length >= 3) {
      cardRows.push({ row, cells });
    }
  });

  block.style.setProperty('--adc-carousel-per-screen', String(cardsPerScreen));

  if (titleText) {
    const h = document.createElement('h2');
    h.className = 'adc-carousel-heading';
    h.textContent = titleText;
    block.prepend(h);
  }

  if (!cardRows.length) return;

  const cards = cardRows.map(({ row, cells }) => buildCarouselCard(row, cells));
  renderCarousel(block, cards, cardsPerScreen);
}

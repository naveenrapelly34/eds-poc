import { loadBlock } from '../../scripts/aem.js';

function cell(row) {
  return row?.firstElementChild || row;
}

function text(row) {
  return cell(row)?.textContent?.trim() || '';
}

function html(row) {
  return cell(row)?.innerHTML?.trim() || text(row);
}

function asBool(value) {
  return String(value).trim().toLowerCase() === 'true';
}

function extractImageSource(imageCell) {
  if (!imageCell) return '';

  if (imageCell.tagName === 'IMG') {
    return imageCell.getAttribute('src') || '';
  }

  if (imageCell.tagName === 'PICTURE') {
    return imageCell.querySelector('img')?.getAttribute('src') || '';
  }

  const pictureImg = imageCell.querySelector('picture img');
  if (pictureImg) {
    return pictureImg.getAttribute('src') || '';
  }

  const img = imageCell.querySelector('img');
  if (img) {
    return img.getAttribute('src') || '';
  }

  const link = imageCell.querySelector('a');
  if (link) {
    const linkedImg = link.querySelector('img');
    if (linkedImg) {
      return linkedImg.getAttribute('src') || '';
    }

    const href = link.getAttribute('href') || '';
    if (href.startsWith('/') || href.startsWith('http') || href.startsWith('//')) {
      return href;
    }
  }

  const raw = imageCell.textContent?.trim() || '';
  if (raw.startsWith('/') || raw.startsWith('http') || raw.startsWith('//')) {
    return raw;
  }

  return '';
}

function createImage(src, alt, className = 'cmp-image__image') {
  if (!src) return null;

  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || ' ';
  img.loading = 'lazy';
  img.className = className;
  return img;
}

function createLinkBlock(data) {
  const {
    linkText,
    linkUrl,
    linkAction,
    redirectConfirm,
    external,
    superscript,
    superscriptText,
    superscriptLink,
  } = data;

  if (!linkText || !linkUrl) {
    return null;
  }

  const linkWrapper = document.createElement('div');
  linkWrapper.className = 'link__wrapper';

  const actionWrap = document.createElement('div');
  actionWrap.className = 'action-0 link';

  const cmpLink = document.createElement('div');
  cmpLink.className = 'cmp-link';

  const anchor = document.createElement('a');
  anchor.className = 'cmp-button link__text';
  anchor.href = linkUrl;
  anchor.target = linkAction || '_self';
  anchor.setAttribute('data-redirect-confirm', redirectConfirm ? 'true' : 'false');
  anchor.setAttribute('data-cmp-clickable', 'true');

  if (anchor.target === '_blank') {
    anchor.rel = 'noopener';
  }

  if (redirectConfirm) {
    anchor.setAttribute('role', 'link');
    anchor.setAttribute('tabindex', '0');
    anchor.setAttribute('aria-haspopup', 'dialog');
  }

  const textSpan = document.createElement('span');
  textSpan.className = 'link__inner-text';
  textSpan.textContent = linkText;
  anchor.append(textSpan);

  cmpLink.append(anchor);

  if (superscript && superscriptText) {
    if (superscriptLink) {
      const supLink = document.createElement('a');
      supLink.className = 'link__sup';
      supLink.href = superscriptLink;
      supLink.target = '_blank';
      supLink.rel = 'noopener';
      const supTag = document.createElement('sup');
      supTag.textContent = superscriptText;
      supLink.append(supTag);
      cmpLink.append(supLink);
    } else {
      const supTag = document.createElement('sup');
      supTag.className = 'link__sup';
      supTag.textContent = superscriptText;
      cmpLink.append(supTag);
    }
  }

  if ((linkAction === '_blank' || linkAction === '_self') && external) {
    const icon = document.createElement('span');
    icon.className = 'abt-icon abt-icon-arrow-up-right';
    cmpLink.append(icon);
  }

  actionWrap.append(cmpLink);
  linkWrapper.append(actionWrap);
  return linkWrapper;
}

// Slot class map: maps block name to layout role class on adc-card.card-composed
const CHILD_SLOT_MAP = {
  'adc-image': 'card__slot-image',
  'adc-logo': 'card__slot-logo',
  'adc-inline-text-title': 'card__slot-title',
  'adc-link': 'card__slot-link',
  text: 'card__slot-desc',
};

/**
 * Loads child blocks in-place without moving them in the DOM.
 * UE tracks children by data-aue-resource on direct block children —
 * moving them into a nested scaffold breaks that tracking on every re-render.
 * Instead, each child loads its own JS/CSS and CSS grid handles the visual layout.
 */
async function loadChildBlocks(block) {
  const KNOWN = Object.keys(CHILD_SLOT_MAP);

  // First, try direct children (already-decorated or pre-structured)
  let children = [...block.children].filter((el) => {
    if (el.classList.contains('block')) {
      return KNOWN.some((name) => el.classList.contains(name));
    }
    if (el.hasAttribute('data-aue-resource')) {
      const resource = el.getAttribute('data-aue-resource');
      const lastSegment = resource?.split('/').pop() || '';
      return KNOWN.includes(lastSegment) || lastSegment === 'text';
    }
    return el.classList.contains('text');
  });

  // If no direct children found, UE may have nested them in a wrapper.
  // Search descendants with data-aue-resource for known child types.
  if (!children.length) {
    children = [...block.querySelectorAll('[data-aue-resource]')].filter((el) => {
      if (el === block) return false; // Skip the block itself
      const resource = el.getAttribute('data-aue-resource');
      const lastSegment = resource?.split('/').pop() || '';
      return KNOWN.includes(lastSegment) || lastSegment === 'text';
    });

    // Re-parent found children to be direct children of block so UE tracking works
    if (children.length > 0) {
      console.log('[adc-card] found nested children, re-parenting to direct children');
      children.forEach((child) => {
        block.append(child);
      });
    }
  }

  console.log('[adc-card] loadChildBlocks:', { childCount: children.length, blockComposed: block.classList.contains('card-composed'), childNames: children.map((c) => [...c.classList].join(' ')) });

  if (!children.length) return false;

  const toLoad = [];
  children.forEach((child) => {
    // Determine block type: from class name or from data-aue-resource
    let blockType = null;

    if (child.classList.contains('block')) {
      blockType = [...child.classList].find((c) => c !== 'block' && KNOWN.includes(c));
    } else if (child.hasAttribute('data-aue-resource')) {
      // Extract block type from resource path
      const resource = child.getAttribute('data-aue-resource');
      blockType = resource?.split('/').pop();
    }

    if (!blockType) return;

    // Assign layout slot class so CSS can target it
    const slotKey = blockType;
    if (CHILD_SLOT_MAP[slotKey]) {
      child.classList.add(CHILD_SLOT_MAP[slotKey]);
    }

    // For already-decorated blocks, skip if already loading
    if (child.classList.contains('block') && child.dataset.blockStatus === 'loading') {
      return;
    }

    // Set up block metadata for EDS to pick up
    if (!child.classList.contains('block')) {
      child.classList.add('block', blockType);
    }

    if (!child.dataset.blockName) {
      child.dataset.blockName = blockType;
    }

    if (!child.dataset.blockStatus) {
      child.dataset.blockStatus = 'initialized';
    }

    toLoad.push(child);
  });

  await Promise.all(toLoad.map((child) => loadBlock(child)));
  block.classList.add('card-composed');
  console.log('[adc-card] children loaded, card-composed class added');
  return true;
}

export default async function decorate(block) {
  console.log('[adc-card] decorate called', { hasCard: !!block.querySelector(':scope > .card'), isCardComposed: block.classList.contains('card-composed'), directChildren: block.children.length });

  // Guard against re-running legacy row-mode only (.card present means already rendered).
  // card-composed mode is intentionally NOT guarded so UE-inserted children are
  // picked up on subsequent decorate calls. loadBlock itself skips already-loaded blocks.
  if (block.querySelector(':scope > .card')) {
    console.log('[adc-card] skipping: already has .card');
    return;
  }

  // In card-composed mode: always try to load children, never fall through to row-based rendering.
  // This prevents clearing children when UE re-renders the parent after selecting a child.
  if (block.classList.contains('card-composed')) {
    console.log('[adc-card] card-composed mode, reloading children');
    await loadChildBlocks(block);
    return;
  }

  if (await loadChildBlocks(block)) {
    console.log('[adc-card] loaded children successfully');
    return;
  }

  const rows = [...block.querySelectorAll(':scope > div')];
  if (!rows.length) {
    return;
  }

  const cardType = text(rows[0]) || 'default';
  const id = text(rows[1]);
  const className = text(rows[2]);
  const imageSrc = extractImageSource(cell(rows[3]));
  const imageAlt = text(rows[4]);
  const logoSrc = extractImageSource(cell(rows[5]));
  const logoAlt = text(rows[6]);
  const titleHtml = html(rows[7]);
  const descriptionHtml = html(rows[8]);
  const cardLabel = text(rows[9]);
  const linkText = text(rows[10]);
  const linkUrl = text(rows[11]);
  const linkAction = text(rows[12]) || '_self';
  const external = asBool(text(rows[13]));
  const redirectConfirm = asBool(text(rows[14]));
  const superscript = asBool(text(rows[15]));
  const superscriptText = text(rows[16]);
  const superscriptLink = text(rows[17]);

  const resolvedTitleHtml = titleHtml || 'Card title';
  const resolvedDescriptionHtml = descriptionHtml || 'Card description';
  const resolvedLinkText = linkText || 'Learn more';

  block.textContent = '';

  const card = document.createElement('article');
  card.className = 'card';

  const cardRoot = document.createElement('div');
  cardRoot.className = `card--${cardType} card__v2`;
  cardRoot.setAttribute('data-js-component', 'card');

  const section = document.createElement('section');
  section.className = `card__wrapper${className ? ` ${className}` : ''}`;
  if (id) {
    section.id = id;
  }

  const media = document.createElement('div');
  media.className = 'card__media';

  const primaryImageWrap = document.createElement('div');
  primaryImageWrap.className = 'cmp-image--primary';
  const primaryImage = createImage(imageSrc, imageAlt, 'cmp-image__image card__image');
  if (primaryImage) {
    primaryImageWrap.append(primaryImage);
  } else {
    const mediaPlaceholder = document.createElement('div');
    mediaPlaceholder.className = 'card__placeholder card__placeholder--media';
    mediaPlaceholder.textContent = 'Card image';
    primaryImageWrap.append(mediaPlaceholder);
  }
  media.append(primaryImageWrap);

  if (cardType === 'support' && cardLabel) {
    const supportLabel = document.createElement('span');
    supportLabel.className = 'card__support-label--text label-default';
    supportLabel.textContent = cardLabel;
    media.append(supportLabel);
  }

  if (logoSrc && (cardType === 'default' || cardType === 'patient-story')) {
    const logoWrap = document.createElement('div');
    logoWrap.className = 'cmp_image--logo logo-comp';

    const logoCmp = document.createElement('div');
    logoCmp.className = 'cmp-image cmp-image--desktop';

    const logoImage = createImage(logoSrc, logoAlt, 'cmp-image__image');
    if (logoImage) {
      logoCmp.append(logoImage);
      logoWrap.append(logoCmp);
      media.append(logoWrap);
    }
  } else if (cardType === 'default' || cardType === 'patient-story') {
    const logoWrap = document.createElement('div');
    logoWrap.className = 'cmp_image--logo logo-comp';
    const logoPlaceholder = document.createElement('div');
    logoPlaceholder.className = 'card__placeholder card__placeholder--logo';
    logoPlaceholder.textContent = 'Card logo';
    logoWrap.append(logoPlaceholder);
    media.append(logoWrap);
  }

  const body = document.createElement('div');
  body.className = 'card__body';

  if (resolvedTitleHtml) {
    const title = document.createElement('h4');
    title.className = 'card__title';

    const inlineTitle = document.createElement('div');
    inlineTitle.className = 'title';

    const cmpTitle = document.createElement('div');
    cmpTitle.className = 'cmp-title';

    const textEl = document.createElement('span');
    textEl.className = 'cmp-title__text';
    textEl.innerHTML = resolvedTitleHtml;

    cmpTitle.append(textEl);
    inlineTitle.append(cmpTitle);
    title.append(inlineTitle);
    body.append(title);
  }

  if (resolvedDescriptionHtml) {
    const description = document.createElement('div');
    description.className = `card__description ${cardType === 'support' ? 'body-small' : 'body-default'}`;
    description.innerHTML = resolvedDescriptionHtml;
    body.append(description);
  }

  if (cardType !== 'support' && cardType !== 'clickable-card') {
    const linkBlock = createLinkBlock({
      linkText: resolvedLinkText,
      linkUrl,
      linkAction,
      redirectConfirm,
      external,
      superscript,
      superscriptText,
      superscriptLink,
    });
    if (linkBlock) {
      body.append(linkBlock);
    }
  }

  section.append(media);
  section.append(body);

  if (cardType === 'support' || cardType === 'clickable-card') {
    const cardLink = document.createElement('a');
    cardLink.className = 'card__link';
    cardLink.setAttribute('aria-label', resolvedTitleHtml.replace(/<[^>]+>/g, '').trim() || 'Card link');
    if (linkUrl) {
      cardLink.href = linkUrl;
      cardLink.target = linkAction || '_self';
      if (cardLink.target === '_blank') {
        cardLink.rel = 'noopener';
      }
    }
    cardLink.append(section);
    cardRoot.append(cardLink);
  } else {
    cardRoot.append(section);
  }

  card.append(cardRoot);
  block.append(card);
}

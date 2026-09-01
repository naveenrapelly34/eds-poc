// adc-card-item: flat block (standalone use).
// 'classes' field (card type) is applied to block element by AEM.
// Row 0: card image (image + imageAlt field-collapsed into <picture>).
// Row 1: logo      (logo  + logoAlt  field-collapsed into <picture>).
// Row 2: content   (content_title, content_description, content_cta + content_ctaText
//                   element-grouped into one cell).
//
// When used as a child inside adc-cards container, adc-cards.js reads
// the 4-cell row directly: [classes-text | image | logo | content-group].

const CLICKABLE_TYPES = new Set(['clickable-card', 'support']);

export default function decorate(block) {
  const [imageRow, logoRow, contentRow] = [...block.querySelectorAll(':scope > div')];

  const variant = [...block.classList].find(
    (c) => ['logo', 'information', 'support', 'patient-story', 'clickable-card'].includes(c),
  ) || 'default';

  const picture = imageRow?.querySelector('picture');
  const logoPicture = logoRow?.querySelector('picture');
  const contentCell = contentRow?.firstElementChild;

  const heading = contentCell?.querySelector('h1,h2,h3,h4,h5,h6');
  const desc = contentCell?.querySelector('p');
  const cta = contentCell?.querySelector('a');

  block.innerHTML = '';

  const inner = document.createElement('div');
  inner.className = 'adc-card-inner';

  const media = document.createElement('div');
  media.className = 'adc-card-media';

  if (picture) {
    const wrap = document.createElement('div');
    wrap.className = 'adc-card-img';
    wrap.append(picture.closest('picture') || picture);
    media.append(wrap);
  }

  if (logoPicture) {
    const wrap = document.createElement('div');
    wrap.className = 'adc-card-logo-img';
    wrap.append(logoPicture.closest('picture') || logoPicture);
    media.append(wrap);
  }

  if (media.children.length) inner.append(media);

  const body = document.createElement('div');
  body.className = 'adc-card-body';

  if (heading) {
    const h = document.createElement('h3');
    h.className = 'adc-card-title';
    h.innerHTML = heading.innerHTML;
    body.append(h);
  }

  if (desc) {
    const p = document.createElement('p');
    p.className = 'adc-card-desc';
    p.innerHTML = desc.innerHTML;
    body.append(p);
  }

  inner.append(body);

  if (CLICKABLE_TYPES.has(variant) && cta) {
    const a = document.createElement('a');
    a.href = cta.href;
    a.className = 'adc-card-link-wrap';
    if (cta.target === '_blank') {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    a.append(inner);
    block.append(a);
  } else {
    if (cta) {
      const actions = document.createElement('div');
      actions.className = 'adc-card-actions';
      const a = document.createElement('a');
      a.href = cta.href;
      a.className = 'adc-card-action-primary';
      a.textContent = cta.textContent.trim();
      if (cta.target === '_blank') {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      actions.append(a);
      body.append(actions);
    }
    block.append(inner);
  }
}

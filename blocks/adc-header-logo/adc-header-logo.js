/*
 * ADC Header Logo Block
 * Matches AEM V1 Logo child component (LogoImpl)
 * resourceType: adc/webu/components/content/logo/v1/logo
 *
 * V1 dialog fields: fileReference, logoAltText, link, action, external
 *
 * Nav doc structure:
 *   Row 1: brand logo image | brand link URL
 *   Row 2: sticky logo image | sticky link URL (optional)
 */
export default function decorate(block) {
  const rows = [...block.children];

  block.classList.add('adc-header-logo');

  // Row 0 = brand logo
  if (rows[0]) {
    const cols = [...rows[0].children];
    const brandWrap = document.createElement('div');
    brandWrap.className = 'adc-header-logo-brand';

    const img = cols[0]?.querySelector('img');
    const linkEl = cols[1]?.querySelector('a') || cols[0]?.querySelector('a');
    const href = linkEl?.href || '/';

    if (img) {
      const a = document.createElement('a');
      a.href = href;
      a.className = 'adc-header-logo-brand-link';
      a.setAttribute('aria-label', img.alt || 'Home');
      const clonedImg = img.cloneNode(true);
      clonedImg.className = 'adc-header-logo-brand-image';
      a.append(clonedImg);
      brandWrap.append(a);
    }

    block.textContent = '';
    block.append(brandWrap);
  }

  // Row 1 = sticky / Abbott logo (optional)
  if (rows[1]) {
    const cols = [...rows[1].children];
    const stickyWrap = document.createElement('div');
    stickyWrap.className = 'adc-header-logo-sticky';

    const img = cols[0]?.querySelector('img');
    const linkEl = cols[1]?.querySelector('a') || cols[0]?.querySelector('a');
    const href = linkEl?.href || '/';

    if (img) {
      const a = document.createElement('a');
      a.href = href;
      a.className = 'adc-header-logo-sticky-link';
      a.setAttribute('aria-label', img.alt || 'Abbott');
      const clonedImg = img.cloneNode(true);
      clonedImg.className = 'adc-header-logo-sticky-image';
      a.append(clonedImg);
      stickyWrap.append(a);
    }

    block.append(stickyWrap);
  }
}

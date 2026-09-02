/*
 * ADC Header Link Block
 * Matches AEM V1 Link child component (LinkImpl)
 * resourceType: adc/webu/components/content/link/v1/link
 *
 * A single utility link with support for:
 * - Normal links (_self/_blank)
 * - External link indicator
 * - Modal pop-up action
 * - Section anchor (selfTag)
 * - Superscript
 * - Accessibility label
 *
 * Nav doc structure:
 *   Row 1: link text | destination URL
 *   Row 2: action (_self|_blank|modal|selfTag) | external (true|false)
 *   Row 3: (optional) accessibility label | icon image
 */
export default function decorate(block) {
  const rows = [...block.children];

  // Row 0: text + link
  const linkText = rows[0]?.children[0]?.textContent?.trim() || '';
  const linkEl = rows[0]?.children[1]?.querySelector('a');
  const href = linkEl?.href || rows[0]?.children[1]?.textContent?.trim() || '#';

  // Row 1: action + external flag
  const action = rows[1]?.children[0]?.textContent?.trim()?.toLowerCase() || '_self';
  const isExternal = rows[1]?.children[1]?.textContent?.trim()?.toLowerCase() === 'true';

  // Row 2: accessibility label + icon
  const ariaLabel = rows[2]?.children[0]?.textContent?.trim() || '';
  const iconImg = rows[2]?.children[1]?.querySelector('img');

  block.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'adc-header-link-wrapper';

  const a = document.createElement('a');
  a.className = 'adc-header-link-anchor';

  if (action === 'selftag') {
    // Section anchor — scroll to ID
    a.href = `#${href.replace('#', '')}`;
  } else if (action !== 'modal') {
    a.href = href;
    a.target = action === '_blank' ? '_blank' : '_self';
    if (action === '_blank' || isExternal) {
      a.rel = 'noopener noreferrer';
    }
  }

  if (ariaLabel) a.setAttribute('aria-label', ariaLabel);

  // Icon (optional)
  if (iconImg) {
    const img = iconImg.cloneNode(true);
    img.className = 'adc-header-link-icon';
    a.append(img);
  }

  // Link text
  const textSpan = document.createElement('span');
  textSpan.className = 'adc-header-link-text';
  textSpan.textContent = linkText;
  a.append(textSpan);

  // External indicator arrow
  if (isExternal) {
    const arrow = document.createElement('span');
    arrow.className = 'adc-header-link-external';
    arrow.setAttribute('aria-hidden', 'true');
    a.append(arrow);
  }

  wrapper.append(a);
  block.append(wrapper);
}

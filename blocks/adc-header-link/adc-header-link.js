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
 *   Fields are authored as a multi-value container and render as a flat list of
 *   <p>/<a> elements separated by <hr>. Fields are classified by content:
 *   link text | action (_self/_blank/modal/selfTag) | destination <a> |
 *   external (true/false) | accessibility label | icon image.
 */
import { parseFieldGroups, classifyGroup } from '../../scripts/nav-fields.js';

function buildLink(group) {
  const {
    link, href, image, action, flags, texts,
  } = classifyGroup(group);

  const dest = href || link?.href || '#';
  const act = action || '_self';
  const isExternal = flags.some(Boolean);
  const linkText = texts[0] || link?.textContent?.trim() || '';
  const ariaLabel = texts[1] || '';

  const wrapper = document.createElement('div');
  wrapper.className = 'adc-header-link-wrapper';

  const a = document.createElement('a');
  a.className = 'adc-header-link-anchor';

  if (act === 'selftag') {
    a.href = `#${dest.replace('#', '')}`;
  } else if (act !== 'modal') {
    a.href = dest;
    a.target = act === '_blank' ? '_blank' : '_self';
    if (act === '_blank' || isExternal) {
      a.rel = 'noopener noreferrer';
    }
  }

  if (ariaLabel) a.setAttribute('aria-label', ariaLabel);

  // Icon (optional)
  if (image) {
    const img = image.cloneNode(true);
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
  return wrapper;
}

export default function decorate(block) {
  const groups = parseFieldGroups(block);
  block.textContent = '';
  groups.forEach((group) => block.append(buildLink(group)));
}

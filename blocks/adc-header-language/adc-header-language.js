/*
 * ADC Header Language Block
 * Matches AEM V1 Language Navigation (PlatformLanguageNavigationImpl)
 * resourceType: adc/webu/components/content/languagenavigation/v1/languagenavigation
 *
 * V1 dialog fields: navigatorType, placeholder, ascendingOrder,
 *                    hideLanguage, hideCountry, searchRequired, columnHeaderRequired
 *
 * Nav doc structure:
 *   Fields render as a flat list separated by <hr>. A navigator label plus a
 *   rich-text list of country/language links (each an anchor).
 */
import { parseFieldGroups, classifyGroup } from '../../scripts/nav-fields.js';

export default function decorate(block) {
  const groups = parseFieldGroups(block);

  let label = 'Language';
  const languages = [];

  groups.forEach((group) => {
    const info = classifyGroup(group);
    // A rich-text list of language links
    if (info.list) {
      info.list.querySelectorAll('a').forEach((anchor) => {
        languages.push({
          label: anchor.textContent.trim(),
          href: anchor.getAttribute('href') || anchor.href || '#',
          isCurrent: anchor.querySelector('strong') !== null,
        });
      });
    }
    // A single language link
    if (info.link) {
      languages.push({
        label: info.texts[0] || info.link.textContent.trim(),
        href: info.href,
        isCurrent: false,
      });
    } else if (info.texts.length && label === 'Language') {
      // First plain-text field is the navigator label
      [label] = info.texts;
    }
  });

  block.textContent = '';

  // Current language display + toggle
  const current = languages.find((l) => l.isCurrent) || languages[0];

  const toggle = document.createElement('button');
  toggle.className = 'adc-header-language-toggle';
  toggle.setAttribute('aria-label', label);
  toggle.setAttribute('aria-expanded', 'false');

  const globeIcon = document.createElement('span');
  globeIcon.className = 'adc-header-language-globe';
  toggle.append(globeIcon);

  const currentLabel = document.createElement('span');
  currentLabel.className = 'adc-header-language-current';
  currentLabel.textContent = current?.label || label;
  toggle.append(currentLabel);

  const chevron = document.createElement('span');
  chevron.className = 'adc-header-language-chevron';
  toggle.append(chevron);

  block.append(toggle);

  // Dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'adc-header-language-dropdown';
  dropdown.setAttribute('aria-hidden', 'true');

  const dropdownLabel = document.createElement('div');
  dropdownLabel.className = 'adc-header-language-dropdown-label';
  dropdownLabel.textContent = label;
  dropdown.append(dropdownLabel);

  const list = document.createElement('ul');
  list.className = 'adc-header-language-list';

  languages.forEach((lang) => {
    const li = document.createElement('li');
    li.className = 'adc-header-language-item';
    if (lang.isCurrent) li.classList.add('adc-header-language-item-active');

    const a = document.createElement('a');
    a.href = lang.href;
    a.className = 'adc-header-language-link';
    a.textContent = lang.label;
    if (lang.isCurrent) a.setAttribute('aria-current', 'true');

    li.append(a);
    list.append(li);
  });

  dropdown.append(list);
  block.append(dropdown);

  // Toggle
  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    dropdown.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (!block.contains(e.target)) {
      toggle.setAttribute('aria-expanded', 'false');
      dropdown.setAttribute('aria-hidden', 'true');
    }
  });
}

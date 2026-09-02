/*
 * ADC Header Language Block
 * Matches AEM V1 Language Navigation (PlatformLanguageNavigationImpl)
 * resourceType: adc/webu/components/content/languagenavigation/v1/languagenavigation
 *
 * V1 dialog fields: navigatorType, placeholder, ascendingOrder,
 *                    hideLanguage, hideCountry, searchRequired, columnHeaderRequired
 *
 * Nav doc structure:
 *   Row 1: label text (e.g., "Select Country")
 *   Row 2+: language label | URL (one per row)
 */
export default function decorate(block) {
  const rows = [...block.children];

  const label = rows[0]?.children[0]?.textContent?.trim() || 'Language';

  // Parse language options
  const languages = [];
  for (let i = 1; i < rows.length; i += 1) {
    const langLabel = rows[i]?.children[0]?.textContent?.trim();
    const link = rows[i]?.children[1]?.querySelector('a');
    const href = link?.href || rows[i]?.children[1]?.textContent?.trim();
    if (langLabel && href) {
      const isCurrent = rows[i]?.children[0]?.querySelector('strong') !== null;
      languages.push({ label: langLabel, href, isCurrent });
    }
  }

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

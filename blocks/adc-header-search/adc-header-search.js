/*
 * ADC Header Search Block
 * Matches AEM V1 HeaderSearch (HeaderSearchImpl) + GlobalCoveoSearch (GlobalCoveoSearchImpl)
 * resourceType: adc/webu/components/search/headersearch/v1/headersearch
 *              adc/webu/globals/components/search/global-coveo-search
 *
 * V1 HeaderSearch fields: searchPlaceholder, searchResultsPage, searchType
 * V1 CoveoSearch fields: searchHub, redirectURL
 *
 * Nav doc structure:
 *   Row 1: search placeholder text | search results page URL
 *   Row 2: (optional) search type (global-search | coveo-search) | search hub
 */
export default function decorate(block) {
  const rows = [...block.children];

  // Read authored config
  const placeholderText = rows[0]?.children[0]?.textContent?.trim() || 'What are you looking for?';
  const searchPageUrl = rows[0]?.children[1]?.querySelector('a')?.href
    || rows[0]?.children[1]?.textContent?.trim()
    || '/search';
  const searchType = rows[1]?.children[0]?.textContent?.trim()?.toLowerCase() || 'global';
  const searchHub = rows[1]?.children[1]?.textContent?.trim() || '';

  block.textContent = '';
  block.dataset.searchType = searchType;
  if (searchHub) block.dataset.searchHub = searchHub;

  // Search toggle button
  const toggle = document.createElement('button');
  toggle.className = 'adc-header-search-toggle';
  toggle.setAttribute('aria-label', 'Search');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span class="adc-header-search-icon"></span>';
  block.append(toggle);

  // Search overlay
  const overlay = document.createElement('div');
  overlay.className = 'adc-header-search-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const container = document.createElement('div');
  container.className = 'adc-header-search-container';

  const form = document.createElement('form');
  form.className = 'adc-header-search-form';
  form.setAttribute('role', 'search');
  form.action = searchPageUrl;
  form.method = 'get';

  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'q';
  input.className = 'adc-header-search-input';
  input.placeholder = placeholderText;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', placeholderText);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'adc-header-search-submit';
  submitBtn.setAttribute('aria-label', 'Submit search');
  submitBtn.innerHTML = '<span class="adc-header-search-icon"></span>';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'adc-header-search-close';
  closeBtn.setAttribute('aria-label', 'Close search');
  closeBtn.innerHTML = '<span class="adc-header-search-close-icon"></span>';

  form.append(input, submitBtn);
  container.append(form, closeBtn);
  overlay.append(container);
  block.append(overlay);

  // Toggle search overlay
  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    overlay.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
    if (!isOpen) input.focus();
  });

  closeBtn.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'false');
    overlay.setAttribute('aria-hidden', 'true');
    toggle.focus();
  });

  // Escape closes
  block.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggle.setAttribute('aria-expanded', 'false');
      overlay.setAttribute('aria-hidden', 'true');
      toggle.focus();
    }
  });

  // Form submit → navigate to search page
  form.addEventListener('submit', (e) => {
    const query = input.value.trim();
    if (!query) {
      e.preventDefault();
      return;
    }
    // For coveo: could dispatch custom event or redirect differently
    if (searchType === 'coveo') {
      e.preventDefault();
      const url = new URL(searchPageUrl, window.location.origin);
      url.hash = `q=${encodeURIComponent(query)}`;
      if (searchHub) url.searchParams.set('searchHub', searchHub);
      window.location.href = url.toString();
    }
  });
}

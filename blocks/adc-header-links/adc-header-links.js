/*
 * ADC Header Links Block
 * Matches AEM V1 LinkStack (LinkStackV1Impl) — utility link dropdown
 * resourceType: adc/webu/components/content/linkstack/v1/linkstack
 *
 * V1 dialog fields: linkStackType (linkstack|siteselect), stackTitle, stackLink,
 *                    action, stackExternal, links[] (multifield: text, link, action, external)
 *
 * Nav doc structure:
 *   Row 1: stack title | stack link URL
 *   Row 2+: link label | URL (one per row)
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  // Row 0: stack title | stack link URL
  const stackTitle = rows[0]?.children[0]?.textContent?.trim() || '';
  const stackLinkEl = rows[0]?.children[1]?.querySelector('a');
  const stackHref = stackLinkEl?.href || rows[0]?.children[1]?.textContent?.trim() || '';

  // Sub-links (rows 1+)
  const subLinks = [];
  for (let i = 1; i < rows.length; i += 1) {
    const text = rows[i]?.children[0]?.textContent?.trim();
    const linkEl = rows[i]?.children[1]?.querySelector('a');
    const href = linkEl?.href || rows[i]?.children[1]?.textContent?.trim();
    if (text && href) {
      subLinks.push({ text, href, target: linkEl?.target || '_self' });
    }
  }

  block.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'adc-header-links-stack';

  // Stack title link / toggle
  if (stackTitle) {
    if (subLinks.length) {
      // Dropdown with sub-links (V1 linkstack type)
      const toggle = document.createElement('button');
      toggle.className = 'adc-header-links-toggle';
      toggle.setAttribute('aria-expanded', 'false');

      const titleSpan = document.createElement('span');
      titleSpan.className = 'adc-header-links-title';
      titleSpan.textContent = stackTitle;
      toggle.append(titleSpan);

      const chevron = document.createElement('span');
      chevron.className = 'adc-header-links-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      toggle.append(chevron);

      wrapper.append(toggle);

      // Dropdown panel
      const dropdown = document.createElement('div');
      dropdown.className = 'adc-header-links-dropdown';
      dropdown.setAttribute('aria-hidden', 'true');

      const list = document.createElement('ul');
      list.className = 'adc-header-links-list';

      subLinks.forEach((link) => {
        const li = document.createElement('li');
        li.className = 'adc-header-links-item';
        const a = document.createElement('a');
        a.href = link.href;
        a.className = 'adc-header-links-link';
        a.textContent = link.text;
        if (link.target === '_blank') {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        li.append(a);
        list.append(li);
      });

      dropdown.append(list);
      wrapper.append(dropdown);

      // Toggle interactions
      toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        dropdown.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
      });

      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
          toggle.setAttribute('aria-expanded', 'false');
          dropdown.setAttribute('aria-hidden', 'true');
        }
      });

      wrapper.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          toggle.setAttribute('aria-expanded', 'false');
          dropdown.setAttribute('aria-hidden', 'true');
          toggle.focus();
        }
      });
    } else {
      // Simple title link (no sub-links)
      const a = document.createElement('a');
      a.href = stackHref || '#';
      a.className = 'adc-header-links-title-link';
      a.textContent = stackTitle;
      wrapper.append(a);
    }
  }

  block.append(wrapper);
}

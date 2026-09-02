/*
 * ADC Mega Menu Block
 * Matches AEM V1 MegaMenu container (MegaMenuContainerImpl)
 * resourceType: adc/webu/components/content/megamenu/v1/megamenu
 *
 * V1 dialog fields: accessibilityLabel (container — children are the nav items)
 *
 * Authoring: authors build navigation as nested lists in the nav document.
 * The block reads the list structure and builds mega menu UI.
 *
 * Nav doc structure:
 *   Row 1: Navigation content (nested UL/LI)
 *   Row 2: (optional) config — hide on desktop, aria label
 *
 * List structure:
 *   - Level 1: Primary nav items (visible in nav bar)
 *     - Level 2: Sub-menu columns (each becomes a panel column header)
 *       - Level 3: Column links
 */

/**
 * Find the element whose direct children hold the authored nav markup
 * (<p> headings and/or <ul> lists), skipping empty config fields such as
 * the accessibility label.
 */
function findNavContentEl(block) {
  const candidates = [...block.querySelectorAll('div')];
  return candidates.find(
    (div) => [...div.children].some((c) => c.tagName === 'UL' || c.tagName === 'P'),
  ) || block;
}

/**
 * Normalise authored content into a single nested <ul>.
 * Supports two authoring patterns:
 *   A) Heading <p>(optionally with <a>) followed by a child <ul>.
 *      This is the easiest way to author - type a heading, then a bullet list.
 *   B) A single fully-nested <ul><li>...<ul>...</ul></li></ul>.
 */
function normalizeToNestedList(content) {
  if (!content) return null;
  const nodes = [...content.children];
  const topUls = nodes.filter((n) => n.tagName === 'UL');
  const paras = nodes.filter((n) => n.tagName === 'P');

  // Pattern B: already a single nested list, no heading paragraphs.
  if (topUls.length === 1 && paras.length === 0) return topUls[0];

  // Pattern A: build an <li> from each heading + its following <ul>.
  const ul = document.createElement('ul');
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.tagName === 'P') {
      const li = document.createElement('li');
      const sourceAnchor = node.querySelector('a');
      const anchor = document.createElement('a');
      anchor.textContent = (sourceAnchor || node).textContent.trim();
      const href = sourceAnchor?.getAttribute('href');
      if (href) anchor.setAttribute('href', href);
      li.append(anchor);
      if (nodes[i + 1]?.tagName === 'UL') {
        li.append(nodes[i + 1].cloneNode(true));
        i += 1;
      }
      ul.append(li);
    } else if (node.tagName === 'UL') {
      node.querySelectorAll(':scope > li').forEach((li) => ul.append(li.cloneNode(true)));
    }
  }
  return ul;
}

function buildDesktopNav(ul) {
  const nav = document.createElement('nav');
  nav.className = 'adc-mega-menu-nav';
  nav.setAttribute('aria-label', 'Main Navigation');

  const primaryList = document.createElement('ul');
  primaryList.className = 'adc-mega-menu-items';

  ul.querySelectorAll(':scope > li').forEach((li) => {
    const primaryItem = document.createElement('li');
    primaryItem.className = 'adc-mega-menu-item';

    const link = li.querySelector(':scope > a');
    const subList = li.querySelector(':scope > ul');

    if (link) {
      const primaryLink = document.createElement('a');
      primaryLink.href = link.href;
      primaryLink.className = 'adc-mega-menu-link';
      primaryLink.textContent = link.textContent;

      if (subList) {
        primaryLink.setAttribute('aria-expanded', 'false');
        primaryLink.setAttribute('aria-haspopup', 'true');
        const chevron = document.createElement('span');
        chevron.className = 'adc-mega-menu-chevron';
        chevron.setAttribute('aria-hidden', 'true');
        primaryLink.append(chevron);
      }

      primaryItem.append(primaryLink);
    }

    if (subList) {
      const megaPanel = document.createElement('div');
      megaPanel.className = 'adc-mega-menu-panel';

      const panelInner = document.createElement('div');
      panelInner.className = 'adc-mega-menu-panel-inner';

      const subItems = [...subList.querySelectorAll(':scope > li')];
      const hasColumns = subItems.some((subLi) => subLi.querySelector(':scope > ul'));

      if (hasColumns) {
        // 3-level content: each child is a titled column with its own links.
        subItems.forEach((subLi) => {
          const column = document.createElement('div');
          column.className = 'adc-mega-menu-panel-column';

          const subLink = subLi.querySelector(':scope > a');
          const thirdLevel = subLi.querySelector(':scope > ul');

          if (subLink) {
            const colTitle = document.createElement('a');
            colTitle.href = subLink.href;
            colTitle.className = 'adc-mega-menu-panel-title';
            colTitle.textContent = subLink.textContent;
            column.append(colTitle);
          }

          if (thirdLevel) {
            const colLinks = document.createElement('ul');
            colLinks.className = 'adc-mega-menu-panel-links';

            thirdLevel.querySelectorAll(':scope > li > a').forEach((thirdLink) => {
              const colItem = document.createElement('li');
              const colLink = document.createElement('a');
              colLink.href = thirdLink.href;
              colLink.className = 'adc-mega-menu-panel-link';
              colLink.textContent = thirdLink.textContent;
              colItem.append(colLink);
              colLinks.append(colItem);
            });

            column.append(colLinks);
          }

          panelInner.append(column);
        });
      } else {
        // 2-level content: children render as a vertical list of links.
        const column = document.createElement('div');
        column.className = 'adc-mega-menu-panel-column';
        const colLinks = document.createElement('ul');
        colLinks.className = 'adc-mega-menu-panel-links';

        subItems.forEach((subLi) => {
          const subLink = subLi.querySelector(':scope > a');
          const colItem = document.createElement('li');
          const colLink = document.createElement('a');
          colLink.href = subLink ? subLink.href : '#';
          colLink.className = 'adc-mega-menu-panel-link';
          colLink.textContent = (subLink || subLi).textContent.trim();
          colItem.append(colLink);
          colLinks.append(colItem);
        });

        column.append(colLinks);
        panelInner.append(column);
      }

      megaPanel.append(panelInner);
      primaryItem.append(megaPanel);
    }

    primaryList.append(primaryItem);
  });

  nav.append(primaryList);
  return nav;
}

function buildMobileNav(desktopNav) {
  const mobileNav = document.createElement('div');
  mobileNav.className = 'adc-mega-menu-mobile';

  desktopNav.querySelectorAll('.adc-mega-menu-item').forEach((item) => {
    const group = document.createElement('div');
    group.className = 'adc-mega-menu-mobile-group';

    const link = item.querySelector('.adc-mega-menu-link');
    const panel = item.querySelector('.adc-mega-menu-panel');

    if (link && panel) {
      const toggle = document.createElement('button');
      toggle.className = 'adc-mega-menu-mobile-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = `<span>${link.textContent}</span><span class="adc-mega-menu-mobile-chevron"></span>`;
      group.append(toggle);

      const submenu = document.createElement('div');
      submenu.className = 'adc-mega-menu-mobile-submenu';

      panel.querySelectorAll('.adc-mega-menu-panel-column').forEach((col) => {
        const title = col.querySelector('.adc-mega-menu-panel-title');
        const links = col.querySelectorAll('.adc-mega-menu-panel-link');

        if (title) {
          const subTitle = document.createElement('a');
          subTitle.href = title.href;
          subTitle.className = 'adc-mega-menu-mobile-title';
          subTitle.textContent = title.textContent;
          submenu.append(subTitle);
        }

        links.forEach((l) => {
          const subLink = document.createElement('a');
          subLink.href = l.href;
          subLink.className = 'adc-mega-menu-mobile-link';
          subLink.textContent = l.textContent;
          submenu.append(subLink);
        });
      });

      group.append(submenu);
    } else if (link) {
      const simpleLink = document.createElement('a');
      simpleLink.href = link.href;
      simpleLink.className = 'adc-mega-menu-mobile-toggle';
      simpleLink.textContent = link.textContent;
      group.append(simpleLink);
    }

    mobileNav.append(group);
  });

  return mobileNav;
}

function setupInteractions(block) {
  // Desktop mega panel toggle
  const navItems = block.querySelectorAll('.adc-mega-menu-item');
  navItems.forEach((item) => {
    const link = item.querySelector('.adc-mega-menu-link');
    if (!link || !item.querySelector('.adc-mega-menu-panel')) return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = link.getAttribute('aria-expanded') === 'true';
      navItems.forEach((other) => {
        const otherLink = other.querySelector('.adc-mega-menu-link');
        if (otherLink && otherLink !== link) otherLink.setAttribute('aria-expanded', 'false');
      });
      link.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  });

  // Escape key closes panels
  block.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      navItems.forEach((item) => {
        const link = item.querySelector('.adc-mega-menu-link');
        if (link) link.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Click outside closes panels
  document.addEventListener('click', (e) => {
    if (!block.contains(e.target)) {
      navItems.forEach((item) => {
        const link = item.querySelector('.adc-mega-menu-link');
        if (link) link.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Mobile accordion toggles
  block.querySelectorAll('.adc-mega-menu-mobile-toggle').forEach((toggle) => {
    if (toggle.tagName === 'BUTTON') {
      toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        const submenu = toggle.closest('.adc-mega-menu-mobile-group')
          ?.querySelector('.adc-mega-menu-mobile-submenu');
        if (submenu) submenu.classList.toggle('adc-mega-menu-mobile-submenu-open', !isOpen);
      });
    }
  });
}

export default function decorate(block) {
  const navContent = findNavContentEl(block);
  const ul = normalizeToNestedList(navContent);
  if (!ul || !ul.querySelector('li')) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'adc-mega-menu-wrapper';

  // Build desktop nav
  const desktopNav = buildDesktopNav(ul);
  wrapper.append(desktopNav);

  // Build mobile nav from desktop structure
  wrapper.append(buildMobileNav(desktopNav));

  block.textContent = '';
  block.append(wrapper);

  setupInteractions(block);
}

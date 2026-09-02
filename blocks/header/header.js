/*
 * ADC Header Block — Composition Engine
 * Matches AEM V1 Header component (HeaderImpl)
 * resourceType: adc/webu/components/content/header/v1/header
 *
 * V1 Header own fields: hideBottomUtilitySection, removeSearch, headerSearchType
 *
 * AEM V1 Child Component     → EDS Child Block
 * ─────────────────────────────────────────────────
 * LogoImpl                    → adc-header-logo
 * MegaMenuContainerImpl       → adc-mega-menu
 * HeaderSearchImpl            → adc-header-search
 * GlobalCoveoSearchImpl       → adc-header-search (coveo variant)
 * PlatformLanguageNavImpl     → adc-header-language
 * LinkStackV1Impl             → adc-header-links
 * LinkImpl                    → adc-header-link
 *
 * Nav document structure:
 *   Section 1: adc-header-logo + adc-header-links + adc-header-language + adc-header-link
 *   Section 2: adc-mega-menu + adc-header-search
 *
 * Fallback: if no child blocks found, reads default content (image/lists/links)
 * for backward compatibility with simple nav documents.
 */

import { decorateBlock, loadBlock } from '../../scripts/aem.js';

const MOBILE_BREAKPOINT = 992;

/* Child blocks that carry their own decorate() + CSS. */
const CHILD_BLOCK_SELECTOR = [
  '.adc-header-logo',
  '.adc-header-link',
  '.adc-header-links',
  '.adc-header-language',
  '.adc-mega-menu',
  '.adc-header-search',
].join(', ');

function isDesktop() {
  return window.innerWidth >= MOBILE_BREAKPOINT;
}

/**
 * Fallback: build brand logo from default content (no child block).
 */
function buildFallbackBrandLogo(content) {
  const brand = document.createElement('div');
  brand.className = 'adc-header-logo';

  const link = content.querySelector('a');
  const img = content.querySelector('img');

  if (link && img) {
    const wrap = document.createElement('div');
    wrap.className = 'adc-header-logo-brand';
    const a = document.createElement('a');
    a.href = link.href;
    a.className = 'adc-header-logo-brand-link';
    a.setAttribute('aria-label', img.alt || 'Home');
    const clonedImg = img.cloneNode(true);
    clonedImg.className = 'adc-header-logo-brand-image';
    a.append(clonedImg);
    wrap.append(a);
    brand.append(wrap);
  }

  return brand;
}

/**
 * Fallback: build simple search (no child block).
 */
function buildFallbackSearch() {
  const wrapper = document.createElement('div');
  wrapper.className = 'adc-header-search';

  const toggle = document.createElement('button');
  toggle.className = 'adc-header-search-toggle';
  toggle.setAttribute('aria-label', 'Search');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span class="adc-header-search-icon"></span>';
  wrapper.append(toggle);

  const overlay = document.createElement('div');
  overlay.className = 'adc-header-search-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const container = document.createElement('div');
  container.className = 'adc-header-search-container';

  const form = document.createElement('form');
  form.className = 'adc-header-search-form';
  form.setAttribute('role', 'search');

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'adc-header-search-input';
  input.placeholder = 'What are you looking for?';
  input.autocomplete = 'off';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'adc-header-search-close';
  closeBtn.setAttribute('aria-label', 'Close search');
  closeBtn.innerHTML = '<span class="adc-header-search-close-icon"></span>';

  form.append(input);
  container.append(form, closeBtn);
  overlay.append(container);
  wrapper.append(overlay);

  // Interactions
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

  return wrapper;
}

/**
 * Fallback: build mega nav from nested lists.
 */
function buildFallbackMegaNav(content) {
  const ul = content.querySelector('ul');
  if (!ul) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'adc-mega-menu';

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
      const navLink = document.createElement('a');
      navLink.href = link.href;
      navLink.className = 'adc-mega-menu-link';
      navLink.textContent = link.textContent;

      if (subList) {
        navLink.setAttribute('aria-expanded', 'false');
        navLink.setAttribute('aria-haspopup', 'true');
        const chevron = document.createElement('span');
        chevron.className = 'adc-mega-menu-chevron';
        chevron.setAttribute('aria-hidden', 'true');
        navLink.append(chevron);
      }
      primaryItem.append(navLink);
    }

    if (subList) {
      const panel = document.createElement('div');
      panel.className = 'adc-mega-menu-panel';
      const inner = document.createElement('div');
      inner.className = 'adc-mega-menu-panel-inner';

      subList.querySelectorAll(':scope > li').forEach((subLi) => {
        const col = document.createElement('div');
        col.className = 'adc-mega-menu-panel-column';

        const subLink = subLi.querySelector(':scope > a');
        const thirdLevel = subLi.querySelector(':scope > ul');

        if (subLink) {
          const title = document.createElement('a');
          title.href = subLink.href;
          title.className = 'adc-mega-menu-panel-title';
          title.textContent = subLink.textContent;
          col.append(title);
        }

        if (thirdLevel) {
          const links = document.createElement('ul');
          links.className = 'adc-mega-menu-panel-links';
          thirdLevel.querySelectorAll(':scope > li > a').forEach((a) => {
            const item = document.createElement('li');
            const colLink = document.createElement('a');
            colLink.href = a.href;
            colLink.className = 'adc-mega-menu-panel-link';
            colLink.textContent = a.textContent;
            item.append(colLink);
            links.append(item);
          });
          col.append(links);
        }

        inner.append(col);
      });

      panel.append(inner);
      primaryItem.append(panel);
    }

    primaryList.append(primaryItem);
  });

  nav.append(primaryList);
  wrapper.append(nav);

  // Mobile nav
  const mobileNav = document.createElement('div');
  mobileNav.className = 'adc-mega-menu-mobile';

  wrapper.querySelectorAll('.adc-mega-menu-item').forEach((item) => {
    const group = document.createElement('div');
    group.className = 'adc-mega-menu-mobile-group';
    const itemLink = item.querySelector('.adc-mega-menu-link');
    const itemPanel = item.querySelector('.adc-mega-menu-panel');

    if (itemLink && itemPanel) {
      const toggle = document.createElement('button');
      toggle.className = 'adc-mega-menu-mobile-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = `<span>${itemLink.textContent}</span><span class="adc-mega-menu-mobile-chevron"></span>`;
      group.append(toggle);

      const submenu = document.createElement('div');
      submenu.className = 'adc-mega-menu-mobile-submenu';

      itemPanel.querySelectorAll('.adc-mega-menu-panel-column').forEach((col) => {
        const title = col.querySelector('.adc-mega-menu-panel-title');
        const links = col.querySelectorAll('.adc-mega-menu-panel-link');
        if (title) {
          const sub = document.createElement('a');
          sub.href = title.href;
          sub.className = 'adc-mega-menu-mobile-title';
          sub.textContent = title.textContent;
          submenu.append(sub);
        }
        links.forEach((l) => {
          const sub = document.createElement('a');
          sub.href = l.href;
          sub.className = 'adc-mega-menu-mobile-link';
          sub.textContent = l.textContent;
          submenu.append(sub);
        });
      });
      group.append(submenu);
    } else if (itemLink) {
      const simple = document.createElement('a');
      simple.href = itemLink.href;
      simple.className = 'adc-mega-menu-mobile-toggle';
      simple.textContent = itemLink.textContent;
      group.append(simple);
    }

    mobileNav.append(group);
  });

  wrapper.append(mobileNav);
  return wrapper;
}

/**
 * Build hamburger menu button.
 */
function buildHamburger() {
  const hamburger = document.createElement('button');
  hamburger.className = 'header-hamburger';
  hamburger.setAttribute('aria-label', 'Open Menu');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = `
    <span class="header-hamburger-line"></span>
    <span class="header-hamburger-line"></span>
    <span class="header-hamburger-line"></span>
  `;
  return hamburger;
}

/**
 * Build skip navigation link (accessibility).
 */
function buildSkipNav() {
  const skip = document.createElement('a');
  skip.href = '#main-content';
  skip.className = 'header-skip-nav';
  skip.textContent = 'Skip to main content';
  return skip;
}

/* ---- Interaction Setup ---- */

function setupMegaNavInteractions(header) {
  const navItems = header.querySelectorAll('.adc-mega-menu-item');
  navItems.forEach((item) => {
    const link = item.querySelector('.adc-mega-menu-link');
    if (!link || !item.querySelector('.adc-mega-menu-panel')) return;
    if (link.dataset.megaWired) return;
    link.dataset.megaWired = 'true';

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

  document.addEventListener('click', (e) => {
    if (!header.contains(e.target)) {
      navItems.forEach((item) => {
        const link = item.querySelector('.adc-mega-menu-link');
        if (link) link.setAttribute('aria-expanded', 'false');
      });
    }
  });
}

function setupMobileMenu(header) {
  const hamburger = header.querySelector('.header-hamburger');
  const mobileNav = header.querySelector('.adc-mega-menu-mobile');
  if (!hamburger || !mobileNav) return;

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    mobileNav.classList.toggle('adc-mega-menu-mobile-open', !isOpen);
    hamburger.classList.toggle('header-hamburger-active', !isOpen);
    document.body.classList.toggle('header-mobile-menu-open', !isOpen);
  });

  mobileNav.querySelectorAll('.adc-mega-menu-mobile-toggle').forEach((toggle) => {
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

function setupStickyHeader(header) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      header.classList.add('header-sticky');
    } else {
      header.classList.remove('header-sticky');
    }
  }, { passive: true });
}

function setupResize() {
  let wasMobile = !isDesktop();
  window.addEventListener('resize', () => {
    const isMobile = !isDesktop();
    if (wasMobile !== isMobile) {
      wasMobile = isMobile;
      if (isDesktop()) {
        document.querySelectorAll('.header-hamburger').forEach((h) => {
          h.setAttribute('aria-expanded', 'false');
          h.classList.remove('header-hamburger-active');
        });
        document.querySelectorAll('.adc-mega-menu-mobile').forEach((m) => {
          m.classList.remove('adc-mega-menu-mobile-open');
        });
        document.body.classList.remove('header-mobile-menu-open');
      }
    }
  });
}

function setupEscapeKey(header) {
  header.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close all panels
      header.querySelectorAll('[aria-expanded="true"]').forEach((el) => {
        el.setAttribute('aria-expanded', 'false');
      });
      header.querySelectorAll('[aria-hidden="false"]').forEach((el) => {
        el.setAttribute('aria-hidden', 'true');
      });
    }
  });
}

function isMetaTrue(name) {
  return document.querySelector(`meta[name="${name}"]`)
    ?.content?.trim()?.toLowerCase() === 'true';
}

function buildMainSection(section) {
  const mainSection = document.createElement('div');
  mainSection.className = 'header-main';

  const mainContainer = document.createElement('div');
  mainContainer.className = 'header-container';

  mainContainer.append(buildHamburger());

  if (!section) {
    mainSection.append(mainContainer);
    return mainSection;
  }

  // Only look at blocks that live in THIS section (Section 1 / dark bar)
  const logos = [...section.querySelectorAll('.adc-header-logo')];
  const linkStacks = [...section.querySelectorAll('.adc-header-links')];
  const links = [...section.querySelectorAll('.adc-header-link')];
  const langs = [...section.querySelectorAll('.adc-header-language')];

  // First logo = brand logo (left)
  if (logos[0]) {
    mainContainer.append(logos[0]);
  } else {
    mainContainer.append(buildFallbackBrandLogo(section));
  }

  const mainRight = document.createElement('div');
  mainRight.className = 'header-main-right';

  linkStacks.forEach((b) => mainRight.append(b));
  links.forEach((b) => mainRight.append(b));
  langs.forEach((b) => mainRight.append(b));

  // Any additional logos (e.g. Abbott logo) render on the right
  logos.slice(1).forEach((b) => {
    b.classList.add('adc-header-logo-secondary');
    mainRight.append(b);
  });

  mainContainer.append(mainRight);
  mainSection.append(mainContainer);
  return mainSection;
}

function buildUtilitySection(section, hideBottomUtility, removeSearch) {
  const utilityBottom = document.createElement('div');
  utilityBottom.className = 'header-utility-bottom';
  if (hideBottomUtility) utilityBottom.classList.add('header-utility-bottom-hidden-desktop');

  const utilContainer = document.createElement('div');
  utilContainer.className = 'header-container';

  const megaMenuBlock = section?.querySelector('.adc-mega-menu');
  if (megaMenuBlock) {
    utilContainer.append(megaMenuBlock);
  } else if (section) {
    const fallbackNav = buildFallbackMegaNav(section);
    if (fallbackNav) utilContainer.append(fallbackNav);
  }

  // Main-nav link stacks belong in the utility (white) bar
  if (section) {
    section.querySelectorAll('.adc-header-links').forEach((b) => utilContainer.append(b));
  }

  const toolsSection = document.createElement('div');
  toolsSection.className = 'header-tools';

  // CTA / utility links authored in Section 2
  if (section) {
    section.querySelectorAll('.adc-header-link').forEach((b) => toolsSection.append(b));
  }

  const searchBlock = section?.querySelector('.adc-header-search');
  if (!removeSearch) {
    if (searchBlock) {
      toolsSection.append(searchBlock);
    } else {
      toolsSection.append(buildFallbackSearch());
    }
  }

  utilContainer.append(toolsSection);
  utilityBottom.append(utilContainer);
  return utilityBottom;
}

/* ---- Main Decorate ---- */

export default async function decorate(block) {
  const navMeta = document.querySelector('meta[name="nav"]');
  const navPath = navMeta ? new URL(navMeta.content, window.location).pathname : '/nav';

  const resp = await fetch(`${navPath}.plain.html`);
  if (!resp.ok) return;

  const html = await resp.text();
  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  // Run each authored child block's own decorate() + load its CSS, while the
  // block still holds its raw authored rows. Without this, the raw field values
  // (language codes, search labels, target flags) leak onto the page as text.
  await Promise.all(
    [...fragment.querySelectorAll(CHILD_BLOCK_SELECTOR)].map((childBlock) => {
      decorateBlock(childBlock);
      return loadBlock(childBlock);
    }),
  );

  // Nav document children (sections)
  const children = [...fragment.children];

  // V1 Header own fields — read from page metadata
  const hideBottomUtility = isMetaTrue('hide-bottom-utility-section');
  const removeSearch = isMetaTrue('remove-search');

  const headerWrapper = document.createElement('div');
  headerWrapper.className = 'header-global';
  headerWrapper.setAttribute('role', 'banner');

  // Skip navigation (accessibility)
  headerWrapper.append(buildSkipNav());

  headerWrapper.append(buildMainSection(children[0]));
  headerWrapper.append(buildUtilitySection(children[1], hideBottomUtility, removeSearch));

  // Clear and compose
  block.textContent = '';
  block.append(headerWrapper);

  // Setup all interactions
  setupMegaNavInteractions(headerWrapper);
  setupMobileMenu(headerWrapper);
  setupStickyHeader(headerWrapper);
  setupResize();
  setupEscapeKey(headerWrapper);
}

/*
 * ADC Footer Block
 * Matches the adc-webu footer component UI:
 * - Link stack columns with collapsible headers (mobile accordion)
 * - Horizontal divider
 * - Bottom section: Abbott logo + social media icons
 * - Disclaimer links row
 * - Copyright text
 * - Back to top button
 */

/**
 * Build link stack columns from footer document content.
 * Footer document structure:
 *   Child 0: link stacks (each <p><strong>Title</strong></p> followed by <ul> of links)
 *   Child 1: logo + social media
 *   Child 2: disclaimer links
 *   Child 3: copyright text
 */
function buildLinkStacks(content) {
  const top = document.createElement('div');
  top.className = 'footer-top';

  const row = document.createElement('div');
  row.className = 'footer-link-row';

  // Parse link stack groups: title (strong/heading) followed by list
  const elements = [...content.children];
  let currentWrapper = null;

  elements.forEach((el) => {
    const isTitle = el.querySelector('strong')
      || el.tagName === 'H2'
      || el.tagName === 'H3'
      || el.tagName === 'H4'
      || el.tagName === 'H5'
      || el.tagName === 'H6';

    if (isTitle) {
      currentWrapper = document.createElement('div');
      currentWrapper.className = 'footer-link-wrapper';

      const header = document.createElement('div');
      header.className = 'footer-link-stack-header';

      const titleText = el.textContent.trim();
      const titleLink = el.querySelector('a');

      if (titleLink) {
        const a = document.createElement('a');
        a.href = titleLink.href;
        a.className = 'footer-link-stack-title';
        a.textContent = titleText;
        header.append(a);
      } else {
        const h6 = document.createElement('h6');
        h6.className = 'footer-link-stack-title';
        h6.textContent = titleText;
        header.append(h6);
      }

      // Mobile accordion toggle
      const chevron = document.createElement('button');
      chevron.className = 'footer-link-stack-toggle';
      chevron.setAttribute('aria-label', `Toggle ${titleText}`);
      chevron.setAttribute('aria-expanded', 'false');
      chevron.innerHTML = '<span class="footer-chevron-icon"></span>';
      header.append(chevron);

      currentWrapper.append(header);
      row.append(currentWrapper);
    } else if (el.tagName === 'UL' && currentWrapper) {
      const linkList = document.createElement('ul');
      linkList.className = 'footer-links';

      el.querySelectorAll('li').forEach((li) => {
        const item = document.createElement('li');
        item.className = 'footer-link-item';

        const link = li.querySelector('a');
        if (link) {
          const a = document.createElement('a');
          a.href = link.href;
          a.className = 'footer-link-text';
          a.textContent = link.textContent;
          if (link.target) a.target = link.target;
          if (link.target === '_blank') a.rel = 'noopener noreferrer';
          item.append(a);
        } else {
          item.textContent = li.textContent;
        }

        linkList.append(item);
      });

      currentWrapper.append(linkList);
    }
  });

  top.append(row);
  return top;
}

/**
 * Build bottom section: logo + social media.
 */
function buildBottomSection(content) {
  const bottom = document.createElement('div');
  bottom.className = 'footer-bottom';

  const section = document.createElement('div');
  section.className = 'footer-bottom-section';

  // Logo
  const img = content?.querySelector('img');
  const link = content?.querySelector('a');

  if (img) {
    const logoWrap = document.createElement('div');
    logoWrap.className = 'footer-logo';

    if (link) {
      const a = document.createElement('a');
      a.href = link.href;
      a.className = 'footer-logo-link';
      const clonedImg = img.cloneNode(true);
      clonedImg.className = 'footer-logo-image';
      a.append(clonedImg);
      logoWrap.append(a);
    } else {
      const clonedImg = img.cloneNode(true);
      clonedImg.className = 'footer-logo-image';
      logoWrap.append(clonedImg);
    }

    section.append(logoWrap);
  }

  // Social media icons
  const socialLinks = content?.querySelectorAll('ul li a');
  if (socialLinks && socialLinks.length > 0) {
    const social = document.createElement('div');
    social.className = 'footer-social-media';

    // Check for social media title
    const socialTitle = content?.querySelector('h6, h5');
    if (socialTitle) {
      const title = document.createElement('h6');
      title.className = 'footer-social-title';
      title.textContent = socialTitle.textContent;
      social.append(title);
    }

    const iconList = document.createElement('ul');
    iconList.className = 'footer-social-icons';

    socialLinks.forEach((a) => {
      const li = document.createElement('li');
      const socialLink = document.createElement('a');
      socialLink.href = a.href;
      socialLink.target = '_blank';
      socialLink.rel = 'noopener noreferrer';
      socialLink.className = 'footer-social-link';
      socialLink.setAttribute('aria-label', a.textContent || 'Social media');

      // Use text as icon identifier or img if present
      const iconImg = a.querySelector('img');
      if (iconImg) {
        socialLink.append(iconImg.cloneNode(true));
      } else {
        socialLink.textContent = a.textContent;
      }

      li.append(socialLink);
      iconList.append(li);
    });

    social.append(iconList);
    section.append(social);
  }

  bottom.append(section);
  return bottom;
}

/**
 * Build disclaimer links row.
 */
function buildDisclaimerLinks(content) {
  const disclaimerWrap = document.createElement('div');
  disclaimerWrap.className = 'footer-disclaimer-row';

  const list = document.createElement('ul');
  list.className = 'footer-disclaimer-section';

  const links = content?.querySelectorAll('a');
  if (links) {
    links.forEach((a) => {
      const li = document.createElement('li');
      li.className = 'footer-disclaimer-item';

      const link = document.createElement('a');
      link.href = a.href;
      link.className = 'footer-disclaimer-link';
      link.textContent = a.textContent;
      if (a.target) link.target = a.target;
      if (a.target === '_blank') link.rel = 'noopener noreferrer';

      li.append(link);
      list.append(li);
    });
  }

  disclaimerWrap.append(list);
  return disclaimerWrap;
}

/**
 * Build copyright section.
 */
function buildCopyright(content) {
  const copyrightWrap = document.createElement('div');
  copyrightWrap.className = 'footer-copyright-row';

  if (content) {
    const copyright = document.createElement('p');
    copyright.className = 'footer-copyright';
    copyright.textContent = content.textContent.trim();
    copyrightWrap.append(copyright);
  }

  return copyrightWrap;
}

/**
 * Build back-to-top button.
 */
function buildBackToTop() {
  const wrapper = document.createElement('div');
  wrapper.className = 'footer-back-to-top';

  const btn = document.createElement('button');
  btn.className = 'footer-back-to-top-btn';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '<span class="footer-arrow-up-icon"></span>';

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  wrapper.append(btn);
  return wrapper;
}

/**
 * Set up mobile accordion for link stacks.
 */
function setupMobileAccordion(footer) {
  footer.querySelectorAll('.footer-link-stack-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      const linkList = toggle.closest('.footer-link-wrapper')?.querySelector('.footer-links');
      if (linkList) linkList.classList.toggle('footer-links-open', !isOpen);
    });
  });
}

export default async function decorate(block) {
  const footerMeta = document.querySelector('meta[name="footer"]');
  const footerPath = footerMeta
    ? new URL(footerMeta.content, window.location).pathname
    : '/footer';

  const resp = await fetch(`${footerPath}.plain.html`);
  if (!resp.ok) return;

  const html = await resp.text();
  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  // Footer document children map to sections
  const children = [...fragment.children];

  const footerWrapper = document.createElement('footer');
  footerWrapper.className = 'footer-global';
  footerWrapper.setAttribute('role', 'contentinfo');

  const container = document.createElement('div');
  container.className = 'footer-container';

  // Back to top
  block.prepend(buildBackToTop());

  // Link stacks (first section of footer doc)
  if (children[0]) {
    container.append(buildLinkStacks(children[0]));
  }

  // Horizontal divider
  const divider = document.createElement('hr');
  divider.className = 'footer-horizontal-divider';
  divider.setAttribute('aria-hidden', 'true');
  container.append(divider);

  // Bottom: logo + social + disclaimers + copyright
  const bottomContainer = document.createElement('div');
  bottomContainer.className = 'footer-bottom-container';

  if (children[1]) {
    bottomContainer.append(buildBottomSection(children[1]));
  }

  if (children[2]) {
    bottomContainer.append(buildDisclaimerLinks(children[2]));
  }

  if (children[3]) {
    bottomContainer.append(buildCopyright(children[3]));
  }

  container.append(bottomContainer);
  footerWrapper.append(container);

  block.textContent = '';
  block.append(footerWrapper);

  setupMobileAccordion(footerWrapper);
}

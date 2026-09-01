function cell(row) {
  return row?.firstElementChild || row;
}

function text(row) {
  return cell(row)?.textContent?.trim() || '';
}

function html(row) {
  return cell(row)?.innerHTML?.trim() || text(row);
}

function asBool(value) {
  return String(value).trim().toLowerCase() === 'true';
}

function stripHtml(value) {
  const temp = document.createElement('div');
  temp.innerHTML = value;
  return temp.textContent?.trim() || '';
}

function resolveHref(action, baseLink, sectionId, id) {
  if (action === 'modal') {
    return `#${id || 'adc-link-modal'}`;
  }

  if (action === 'selfTag' && baseLink) {
    return sectionId ? `${baseLink}#${sectionId}` : baseLink;
  }

  return baseLink;
}

export default function decorate(block) {
  if (block.querySelector(':scope > .cmp-link')) {
    return;
  }

  const rows = [...block.querySelectorAll(':scope > div')];
  if (!rows.length) {
    return;
  }

  const linkTextHtml = html(rows[0]);
  const action = text(rows[1]) || '_blank';
  const link = text(rows[2]);
  const superscript = asBool(text(rows[3]));
  const superscriptText = text(rows[4]);
  const superscriptLink = text(rows[5]);
  const external = asBool(text(rows[6]));
  const redirectConfirm = asBool(text(rows[7]));
  const sectionID = text(rows[8]);
  const accessibilityLabel = text(rows[9]);
  const modalTitle = text(rows[10]);
  const modalSize = text(rows[11]) || 'default';
  const popUpUrl = text(rows[12]);
  const icon = text(rows[13]);
  const id = text(rows[14]);
  const className = text(rows[15]);

  if (!linkTextHtml) {
    block.textContent = '';
    return;
  }

  const href = resolveHref(action, link, sectionID, id);
  const redirectPopup = (action === '_blank' || action === '_self') && redirectConfirm;
  const modalPopup = action === 'modal';
  const modalLarge = modalPopup && modalSize === 'large';

  block.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = `cmp-link${className ? ` ${className}` : ''}${modalLarge ? ' generic-modal--large' : ''}`;
  wrapper.setAttribute('data-js-component', 'link');

  const anchor = document.createElement('a');
  anchor.className = 'cmp-button link__text';
  if (id) {
    anchor.id = id;
  }

  if (accessibilityLabel) {
    anchor.setAttribute('aria-label', accessibilityLabel);
  } else {
    anchor.setAttribute('aria-label', stripHtml(linkTextHtml));
  }

  anchor.setAttribute('data-redirect-confirm', redirectConfirm ? 'true' : 'false');
  anchor.setAttribute('data-cmp-clickable', 'true');

  if (href) {
    anchor.href = href;
  }

  if (!modalPopup && action !== 'selfTag') {
    anchor.target = action;
  }

  if ((external && action === '_blank') || action === '_blank') {
    anchor.rel = external ? 'noopener' : 'noopener';
  }

  if (modalPopup) {
    anchor.setAttribute('data-bs-toggle', 'modal');
  }

  if (redirectPopup || modalPopup) {
    anchor.tabIndex = 0;
    anchor.setAttribute('aria-haspopup', 'dialog');
  }

  if (redirectPopup) {
    anchor.setAttribute('role', 'link');
  }

  const innerText = document.createElement('span');
  innerText.className = 'link__inner-text';
  innerText.innerHTML = linkTextHtml;
  anchor.append(innerText);

  wrapper.append(anchor);

  if (superscript && superscriptText) {
    if (superscriptLink) {
      const supLink = document.createElement('a');
      supLink.className = 'link__sup';
      supLink.href = superscriptLink;
      supLink.target = '_blank';
      supLink.rel = 'noopener';
      const sup = document.createElement('sup');
      sup.textContent = superscriptText;
      supLink.append(sup);
      wrapper.append(supLink);
    } else {
      const sup = document.createElement('sup');
      sup.className = 'link__sup';
      sup.textContent = superscriptText;
      wrapper.append(sup);
    }
  }

  if ((action === '_blank' || action === '_self') && external) {
    const externalIcon = document.createElement('span');
    externalIcon.className = 'abt-icon abt-icon-arrow-up-right';
    wrapper.append(externalIcon);
  }

  if (modalPopup && (modalTitle || popUpUrl || icon)) {
    const popup = document.createElement('div');
    popup.className = 'popup-content';
    popup.style.display = 'none';

    const title = document.createElement('div');
    title.className = 'popup-content--title';

    if (icon) {
      const iconEl = document.createElement('em');
      iconEl.className = `abt-icon modal-icon ${icon}`.trim();
      title.append(iconEl);
    }

    if (modalTitle) {
      const textWrap = document.createElement('div');
      textWrap.className = 'generic-modal__text';
      const h4 = document.createElement('h4');
      h4.className = 'modal-title';
      h4.textContent = modalTitle;
      textWrap.append(h4);
      title.append(textWrap);
    }

    const data = document.createElement('div');
    data.className = 'popup-content--data';
    if (popUpUrl) {
      const p = document.createElement('p');
      p.textContent = popUpUrl;
      data.append(p);
    }

    popup.append(title);
    popup.append(data);
    wrapper.append(popup);
  }

  block.append(wrapper);
}

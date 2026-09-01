function cell(row) {
  return row?.firstElementChild || row;
}

function extractImageSource(imageCell) {
  if (!imageCell) return null;

  if (imageCell.tagName === 'IMG') {
    return imageCell.getAttribute('src');
  }

  if (imageCell.tagName === 'PICTURE') {
    return imageCell.querySelector('img')?.getAttribute('src');
  }

  const picture = imageCell.querySelector('picture img');
  if (picture) {
    return picture.getAttribute('src');
  }

  const img = imageCell.querySelector('img');
  if (img) {
    return img.getAttribute('src');
  }

  const link = imageCell.querySelector('a');
  if (link) {
    const linkedImg = link.querySelector('img');
    if (linkedImg) {
      return linkedImg.getAttribute('src');
    }

    const href = link.getAttribute('href') || '';
    if (href.startsWith('/') || href.startsWith('http') || href.startsWith('//')) {
      return href;
    }
  }

  const raw = imageCell.textContent.trim();
  if (raw.startsWith('/') || raw.startsWith('http') || raw.startsWith('//')) {
    return raw;
  }

  return null;
}

function createImageElement(src, altText, tabletSrc, mobileSrc, displayOriginalImage) {
  if (!src) {
    return null;
  }

  const image = document.createElement('img');
  image.setAttribute('data-cmp-hook-image', 'imageV3');
  image.setAttribute('src', src);
  image.setAttribute('loading', 'lazy');
  image.setAttribute('itemprop', 'contentUrl');
  image.className = `cmp-image__image cmp-image__image-v3 image__default${displayOriginalImage ? ' image__original' : ''}`;
  image.alt = altText;

  if (tabletSrc) {
    image.setAttribute('data-tablet-img', tabletSrc);
  }

  if (mobileSrc) {
    image.setAttribute('data-mobile-img', mobileSrc);
  }

  return image;
}

function createWrapper(src, id, className) {
  const wrapper = document.createElement('div');
  wrapper.className = `cmp-image cmp-image--desktop${className ? ` ${className}` : ''}`;
  wrapper.setAttribute('data-cmp-is', 'image');
  wrapper.setAttribute('data-cmp-hook-image', 'imageV3');
  wrapper.setAttribute('data-cmp-filereference', src);
  wrapper.setAttribute('itemscope', '');
  wrapper.setAttribute('itemtype', 'http://schema.org/ImageObject');

  if (id) {
    wrapper.id = id;
  }

  return wrapper;
}

function appendCaption(block, caption, displayPopupTitle) {
  if (!caption) {
    return;
  }

  if (displayPopupTitle) {
    const meta = document.createElement('meta');
    meta.setAttribute('itemprop', 'caption');
    meta.setAttribute('content', caption);
    block.append(meta);
    return;
  }

  const title = document.createElement('span');
  title.className = 'cmp-image__title';
  title.setAttribute('itemprop', 'caption');
  title.textContent = caption;
  block.append(title);
}

export default function decorate(block) {
  // Prevent destructive re-decoration when page bootstrap decorates blocks again.
  if (block.querySelector(':scope > .cmp-image') || block.querySelector(':scope > .cmp-image__link .cmp-image')) {
    return;
  }

  const rows = [...block.querySelectorAll(':scope > div')];
  if (!rows.length) {
    return;
  }

  const desktopSrc = extractImageSource(cell(rows[0]));
  const tabletSrc = extractImageSource(cell(rows[1]));
  const mobileSrc = extractImageSource(cell(rows[2]));
  const isDecorative = cell(rows[4])?.textContent.trim() === 'true';
  const altText = isDecorative ? ' ' : (cell(rows[3])?.textContent.trim() || ' ');
  const caption = cell(rows[5])?.textContent.trim() || '';
  const displayPopupTitle = cell(rows[6])?.textContent.trim() === 'true';
  const href = cell(rows[7])?.textContent.trim() || '';
  const target = cell(rows[8])?.textContent.trim() || '_self';
  const displayOriginalImage = cell(rows[9])?.textContent.trim() === 'true';
  const id = cell(rows[10])?.textContent.trim() || '';
  const className = cell(rows[11])?.textContent.trim() || '';

  const image = createImageElement(desktopSrc, altText, tabletSrc, mobileSrc, displayOriginalImage);

  if (!image) {
    return;
  }

  block.textContent = '';

  const wrapper = createWrapper(desktopSrc, id, className);
  wrapper.append(image);

  if (href) {
    const link = document.createElement('a');
    link.className = 'cmp-image__link';
    link.href = href;
    link.setAttribute('data-cmp-clickable', 'true');
    link.target = target;
    if (target === '_blank') {
      link.rel = 'noopener noreferrer';
    }
    link.append(wrapper);
    block.append(link);
  } else {
    block.append(wrapper);
  }

  appendCaption(block, caption, displayPopupTitle);
}

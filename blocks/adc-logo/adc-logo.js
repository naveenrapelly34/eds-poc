function cell(row) {
  return row?.firstElementChild || row;
}

function createImageNode(sourceCell, altText) {
  if (!sourceCell) return null;

  if (sourceCell.tagName === 'PICTURE') {
    const img = sourceCell.querySelector('img');
    if (img && altText) img.alt = altText;
    return sourceCell;
  }

  if (sourceCell.tagName === 'IMG') {
    const img = sourceCell.cloneNode(true);
    if (altText) img.alt = altText;
    return img;
  }

  const picture = sourceCell.querySelector('picture');
  if (picture) {
    const img = picture.querySelector('img');
    if (img && altText) img.alt = altText;
    return picture;
  }

  const existingImage = sourceCell.querySelector('img');
  if (existingImage) {
    const img = existingImage.cloneNode(true);
    if (altText) img.alt = altText;
    return img;
  }

  const imageLink = sourceCell.querySelector('a');
  if (imageLink) {
    const linkedImage = imageLink.querySelector('img');
    if (linkedImage) {
      const img = linkedImage.cloneNode(true);
      if (altText) img.alt = altText;
      return img;
    }
  }

  const src = sourceCell.textContent.trim();
  if (!src || (!src.startsWith('/') && !src.startsWith('http') && !src.startsWith('//'))) {
    return null;
  }

  const img = document.createElement('img');
  img.src = src;
  img.alt = altText || '';
  img.loading = 'lazy';
  return img;
}

function createCmpImage(imageNode) {
  const wrap = document.createElement('div');
  wrap.className = 'cmp-image';

  const image = imageNode.closest ? (imageNode.closest('picture') || imageNode) : imageNode;
  const picture = image.tagName === 'PICTURE' ? image : null;

  if (picture) {
    const img = picture.querySelector('img');
    if (img) img.classList.add('cmp-image__image');
    wrap.append(picture);
  } else {
    image.classList.add('cmp-image__image');
    wrap.append(image);
  }

  return wrap;
}

export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const imageCell = cell(rows[0]);
  const altText = cell(rows[1])?.textContent.trim() || '';
  const href = cell(rows[2])?.textContent.trim() || '';
  const target = cell(rows[3])?.textContent.trim() || '_self';
  const external = cell(rows[4])?.textContent.trim() === 'true';
  const elementId = cell(rows[5])?.textContent.trim() || '';

  const imageNode = createImageNode(imageCell, altText);
  block.textContent = '';

  if (!imageNode) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'logo-comp';
  wrapper.dataset.jsComponent = 'logo';

  if (elementId) {
    wrapper.id = elementId;
  }

  const cmpImage = createCmpImage(imageNode);

  if (href) {
    const link = document.createElement('a');
    link.className = 'logo-comp--link';
    link.href = href;
    link.target = target || '_self';
    if (external) {
      link.dataset.redirectConfirm = 'true';
    }
    link.append(cmpImage);
    wrapper.append(link);
  } else {
    wrapper.append(cmpImage);
  }

  block.append(wrapper);
}

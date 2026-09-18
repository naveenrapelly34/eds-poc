const KNOWN_FIELDS = new Set([
  'size', 'overlappasset', 'layout', 'mediumoverlappasset', 'shortlayout',
  'desktopimage', 'tabletimage', 'mobileimage', 'alt', 'pretitle',
  'title', 'subtitle', 'description', 'id',
  'overlaplogo', 'overlapimage', 'overlapcopy',
  'mediumoverlapimage', 'mediumoverlapcopy',
  'button1label', 'button1link', 'button1action', 'button1style',
  'button2label', 'button2link', 'button2action', 'button2style',
]);

function extractImage(cell) {
  if (!cell) return null;
  const pic = cell.querySelector('picture');
  if (pic) return pic;
  let img = cell.querySelector('img');
  if (img) return img;
  const a = cell.querySelector('a');
  if (a) {
    img = a.querySelector('img');
    if (img) return img;
    const href = a.getAttribute('href') || '';
    if (href && (href.startsWith('/') || href.startsWith('http'))) {
      const el = document.createElement('img');
      el.src = href;
      el.alt = a.textContent.trim();
      el.loading = 'lazy';
      return el;
    }
  }
  const src = cell.textContent.trim();
  if (src && (src.startsWith('/') || src.startsWith('http'))) {
    const el = document.createElement('img');
    el.src = src;
    el.alt = '';
    el.loading = 'lazy';
    return el;
  }
  return null;
}

function buildPicture(desktopCell, tabletCell, mobileCell, alt) {
  const desktopEl = extractImage(desktopCell);
  if (!desktopEl) return null;
  if (desktopEl.tagName === 'PICTURE') return desktopEl;

  const picture = document.createElement('picture');

  const mobileEl = extractImage(mobileCell);
  if (mobileEl && mobileEl.src) {
    const src = document.createElement('source');
    src.media = '(max-width: 767px)';
    src.srcset = mobileEl.src;
    picture.append(src);
  }

  const tabletEl = extractImage(tabletCell);
  if (tabletEl && tabletEl.src) {
    const src = document.createElement('source');
    src.media = '(max-width: 1023px)';
    src.srcset = tabletEl.src;
    picture.append(src);
  }

  desktopEl.alt = alt;
  picture.append(desktopEl);
  return picture;
}

function getVariantClasses(size, layout, shortLayout, overlappAsset, mediumOverlappAsset) {
  const classes = [`hero-${size}`];
  if (size === 'tall' || (size === 'medium' && layout === 'circlecopy')) {
    classes.push('hero-copy-inside-circle');
  }
  if (size === 'medium' && (layout === 'greybackgroundimagecircle' || layout === 'yellowbackgroundimagecircle')) {
    classes.push('hero-image-in-circle');
  }
  if ((size === 'medium' && layout === 'greybackgroundimagecircle') || (size === 'short' && shortLayout === 'greybackground')) {
    classes.push('hero-bg-gray');
  }
  if ((size === 'medium' && layout === 'yellowbackgroundimagecircle') || (size === 'short' && shortLayout === 'yellowgradientbackground')) {
    classes.push('hero-bg-yellow-gradient');
  }
  const tallOverlap = size === 'tall' && overlappAsset === 'enabled';
  const medGrayOverlap = size === 'medium' && layout === 'greybackgroundimagecircle' && mediumOverlappAsset === 'enabled';
  if (tallOverlap || medGrayOverlap) {
    classes.push('hero-extra-padding');
  }
  return classes;
}

export default function decorate(block) {
  const allRows = [...block.querySelectorAll(':scope > div')];
  if (!allRows.length) return;

  const props = {};
  const buttonRows = [];

  allRows.forEach((row) => {
    const rowCells = [...row.querySelectorAll(':scope > div')];
    if (rowCells.length === 2) {
      const [keyCell, valCell] = rowCells;
      const key = keyCell.textContent.trim().toLowerCase().replace(/[\s-]/g, '');
      if (KNOWN_FIELDS.has(key)) {
        props[key] = valCell;
        return;
      }
    }
    buttonRows.push(row);
  });

  const size = props.size?.textContent.trim() || 'tall';
  const layout = props.layout?.textContent.trim() || '';
  const shortLayout = props.shortlayout?.textContent.trim() || '';
  const overlappAsset = props.overlappasset?.textContent.trim() || 'enabled';
  const mediumOverlappAsset = props.mediumoverlappasset?.textContent.trim() || 'disabled';
  const alt = props.alt?.textContent.trim() || '';
  const pretitle = props.pretitle?.textContent.trim() || '';
  const blockId = props.id?.textContent.trim() || '';

  const hasOverlap = size === 'tall' && overlappAsset === 'enabled';
  const hasMediumOverlap = size === 'medium'
    && layout === 'greybackgroundimagecircle'
    && mediumOverlappAsset === 'enabled';
  const isImageCircle = size === 'medium'
    && (layout === 'greybackgroundimagecircle' || layout === 'yellowbackgroundimagecircle');

  const picture = size !== 'short'
    ? buildPicture(props.desktopimage, props.tabletimage, props.mobileimage, alt)
    : null;

  block.innerHTML = '';

  // Variant classes go on block itself (matches AEM where variants are on the root element)
  // eslint-disable-next-line max-len
  const variantClasses = getVariantClasses(size, layout, shortLayout, overlappAsset, mediumOverlappAsset);
  block.classList.add(...variantClasses);
  if (blockId) block.id = blockId;

  if (picture && !isImageCircle) {
    const media = document.createElement('div');
    media.className = 'hero-media';
    const imgWrap = document.createElement('div');
    imgWrap.className = 'hero-image';
    imgWrap.append(picture);
    media.append(imgWrap);
    block.append(media);
  }

  const section = document.createElement('section');
  section.className = 'hero-section';
  const container = document.createElement('div');
  container.className = 'container hero-container';
  const row = document.createElement('div');
  row.className = 'row';

  const col = document.createElement('div');
  col.className = 'hero-column';

  const content = document.createElement('div');
  content.className = 'hero-content';

  if (pretitle) {
    const pre = document.createElement('p');
    pre.className = 'hero-pretitle';
    pre.textContent = pretitle;
    content.append(pre);
  }

  if (props.title) {
    const h1 = document.createElement('h1');
    h1.className = 'hero-header';
    h1.innerHTML = props.title.innerHTML;
    content.append(h1);
  }

  if (props.subtitle) {
    const sub = document.createElement('div');
    sub.className = 'hero-subtitle';
    sub.innerHTML = props.subtitle.innerHTML;
    content.append(sub);
  }

  if (props.description) {
    const desc = document.createElement('div');
    desc.className = 'hero-body body-default';
    desc.innerHTML = props.description.innerHTML;
    content.append(desc);
  }

  const btns = [
    {
      label: props.button1label,
      link: props.button1link,
      action: props.button1action,
      style: props.button1style,
    },
    {
      label: props.button2label,
      link: props.button2link,
      action: props.button2action,
      style: props.button2style,
    },
  ].filter(({ label, link }) => label?.textContent.trim() || link?.querySelector('a'));

  if (btns.length) {
    const extras = document.createElement('div');
    extras.className = 'hero-extras';
    btns.forEach(({
      label, link, action, style,
    }) => {
      const text = label?.textContent.trim() || '';
      const linkEl = link?.querySelector('a');
      if (!text && !linkEl) return;

      const btnWrap = document.createElement('div');
      btnWrap.className = 'button';

      const a = document.createElement('a');
      a.href = linkEl?.href || linkEl?.getAttribute('href') || '#';
      const btnStyle = style?.textContent.trim() || 'primary';
      a.className = `btn btn-${btnStyle}`;
      a.textContent = text || linkEl?.textContent.trim() || '';
      if (action?.textContent.trim() === '_blank') {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      btnWrap.append(a);
      extras.append(btnWrap);
    });
    content.append(extras);
  }

  col.append(content);
  row.append(col);

  if (isImageCircle && picture) {
    const mediaCol = document.createElement('div');
    mediaCol.className = 'hero-media-circle';
    const imgWrap = document.createElement('div');
    imgWrap.className = 'hero-image';
    imgWrap.append(picture);
    mediaCol.append(imgWrap);
    row.append(mediaCol);
  }

  container.append(row);
  section.append(container);
  block.append(section);

  if (hasOverlap) {
    const overlapSection = document.createElement('section');
    overlapSection.className = 'hero-section-overlap container';
    const overlapRow = document.createElement('div');
    overlapRow.className = 'row';

    const logoEl = extractImage(props.overlaplogo);
    if (logoEl) {
      const logoWrap = document.createElement('div');
      logoWrap.className = 'hero-overlap-logo';
      logoWrap.append(logoEl);
      overlapRow.append(logoWrap);
    }

    const overlapImgEl = extractImage(props.overlapimage);
    if (overlapImgEl) {
      const overlapImgWrap = document.createElement('div');
      overlapImgWrap.className = 'hero-overlap-image';
      overlapImgWrap.append(overlapImgEl);
      overlapRow.append(overlapImgWrap);
    }

    if (props.overlapcopy) {
      const titleWrap = document.createElement('div');
      titleWrap.className = 'hero-overlap-content';
      const copy = document.createElement('div');
      copy.className = 'hero-copy';
      copy.innerHTML = props.overlapcopy.innerHTML;
      titleWrap.append(copy);
      overlapRow.append(titleWrap);
    }

    overlapSection.append(overlapRow);
    block.append(overlapSection);
  }

  if (hasMediumOverlap) {
    const overlapSection = document.createElement('section');
    overlapSection.className = 'hero-section-overlap container';
    const overlapRow = document.createElement('div');
    overlapRow.className = 'row';

    const overlapImgEl = extractImage(props.mediumoverlapimage);
    if (overlapImgEl) {
      const overlapImgWrap = document.createElement('div');
      overlapImgWrap.className = 'hero-overlap-image';
      overlapImgWrap.append(overlapImgEl);
      overlapRow.append(overlapImgWrap);
    }

    if (props.mediumoverlapcopy) {
      const titleWrap = document.createElement('div');
      titleWrap.className = 'hero-overlap-content';
      const copy = document.createElement('div');
      copy.className = 'hero-copy';
      copy.innerHTML = props.mediumoverlapcopy.innerHTML;
      titleWrap.append(copy);
      overlapRow.append(titleWrap);
    }

    overlapSection.append(overlapRow);
    block.append(overlapSection);
  }
}

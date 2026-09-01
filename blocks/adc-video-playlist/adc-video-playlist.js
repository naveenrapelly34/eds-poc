// Field order per video-item row: cells[0]=thumbnail, cells[1]=title,
//                                  cells[2]=videoUrl, cells[3]=description

function extractImage(imageCell, altText) {
  if (!imageCell) return null;
  const pic = imageCell.querySelector('picture');
  if (pic) {
    if (altText) { const img = pic.querySelector('img'); if (img) img.alt = altText; }
    return pic;
  }
  const img = imageCell.querySelector('img');
  if (img) { if (altText) img.alt = altText; return img; }
  const a = imageCell.querySelector('a');
  if (a) {
    const imgInA = a.querySelector('img');
    if (imgInA) { if (altText) imgInA.alt = altText; return imgInA; }
    const href = a.getAttribute('href') || '';
    if (href && (href.startsWith('/') || href.startsWith('http') || href.startsWith('//'))) {
      const el = document.createElement('img');
      el.src = href;
      el.alt = altText || '';
      el.loading = 'lazy';
      return el;
    }
  }
  const src = imageCell.textContent.trim();
  if (src && (src.startsWith('/') || src.startsWith('http') || src.startsWith('//'))) {
    const el = document.createElement('img');
    el.src = src;
    el.alt = altText || '';
    el.loading = 'lazy';
    return el;
  }
  return null;
}

function getVideoEmbed(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  if (url.match(/\.(mp4|webm|ogg)$/i)) return url;
  if (url.includes('/embed')) return url;
  return null;
}

function buildPlayer(video) {
  const wrap = document.createElement('div');
  wrap.className = 'adc-playlist-video';
  if (video.embedUrl) {
    const iframe = document.createElement('iframe');
    iframe.src = video.embedUrl;
    iframe.title = video.title;
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('allow', 'autoplay; encrypted-media');
    wrap.append(iframe);
  } else if (video.thumbEl) {
    const clone = video.thumbEl.cloneNode(true);
    wrap.append(clone);
  }
  return wrap;
}

function isConfigRow(row) {
  const cells = [...row.querySelectorAll(':scope > div')];
  if (cells.length !== 1) return false;
  const text = cells[0].textContent.trim();
  if (cells[0].querySelector('picture, img')) return false;
  if (text.startsWith('/') || text.startsWith('http')) return false;
  return true;
}

export default function decorate(block) {
  const allRows = [...block.querySelectorAll(':scope > div')];
  if (!allRows.length) return;

  // Skip optional title config row (playlist's own model field)
  let playlistTitle = '';
  let startIdx = 0;
  if (isConfigRow(allRows[0])) {
    playlistTitle = allRows[0].querySelector(':scope > div')?.textContent.trim() || '';
    startIdx = 1;
  }

  const videoRows = allRows.slice(startIdx);
  if (!videoRows.length) return;

  const videos = videoRows.map((row, idx) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    const thumbEl = extractImage(cells[0], cells[1]?.textContent.trim() || '');
    const title = cells[1]?.textContent.trim() || `Video ${idx + 1}`;
    const videoUrl = cells[2]?.textContent.trim() || '';
    const description = cells[3]?.textContent.trim() || '';
    const embedUrl = getVideoEmbed(videoUrl);
    return {
      title, embedUrl, thumbEl, description,
    };
  });

  const container = document.createElement('div');
  container.className = 'adc-playlist';

  if (playlistTitle) {
    const h = document.createElement('h2');
    h.className = 'adc-playlist-heading';
    h.textContent = playlistTitle;
    container.append(h);
  }

  const mainArea = document.createElement('div');
  mainArea.className = 'adc-playlist-main';

  const mainTitle = document.createElement('p');
  mainTitle.className = 'adc-playlist-main-title';
  mainTitle.textContent = videos[0]?.title || '';

  let mainPlayer = buildPlayer(videos[0] || { title: '' });

  const mainCaption = document.createElement('p');
  mainCaption.className = 'adc-playlist-caption';
  mainCaption.textContent = videos[0]?.description || '';

  mainArea.append(mainTitle, mainPlayer, mainCaption);

  const sidebar = document.createElement('div');
  sidebar.className = 'adc-playlist-sidebar';

  videos.forEach((video, idx) => {
    const item = document.createElement('div');
    item.className = `adc-playlist-item${idx === 0 ? ' adc-playlist-item-active' : ''}`;
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    const thumb = document.createElement('div');
    thumb.className = 'adc-playlist-thumb';
    if (video.thumbEl) {
      const tImg = video.thumbEl.cloneNode(true);
      thumb.append(tImg);
    } else {
      const ph = document.createElement('div');
      ph.className = 'adc-playlist-thumb-placeholder';
      thumb.append(ph);
    }
    const playIcon = document.createElement('span');
    playIcon.className = 'adc-playlist-play-icon';
    playIcon.setAttribute('aria-hidden', 'true');
    playIcon.textContent = '▶';
    thumb.append(playIcon);

    const info = document.createElement('div');
    info.className = 'adc-playlist-item-info';
    const itemTitle = document.createElement('p');
    itemTitle.className = 'adc-playlist-item-title';
    itemTitle.textContent = video.title;
    info.append(itemTitle);
    if (video.description) {
      const cap = document.createElement('p');
      cap.className = 'adc-playlist-item-caption';
      cap.textContent = video.description;
      info.append(cap);
    }

    item.append(thumb, info);

    const activate = () => {
      sidebar.querySelectorAll('.adc-playlist-item').forEach((el) => {
        el.classList.remove('adc-playlist-item-active');
      });
      item.classList.add('adc-playlist-item-active');
      mainTitle.textContent = video.title;
      mainCaption.textContent = video.description || '';
      const newPlayer = buildPlayer(video);
      mainPlayer.replaceWith(newPlayer);
      mainPlayer = newPlayer;
    };
    item.addEventListener('click', activate);
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') activate(); });

    sidebar.append(item);
  });

  container.append(mainArea, sidebar);
  block.textContent = '';
  block.append(container);
}

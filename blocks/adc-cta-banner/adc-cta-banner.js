// adc-cta-banner: flat block.
// 'classes' field (style: yellow / grey / dark) is applied to the block element
// by AEM as a CSS class — no row parsing needed for style variant.
// Row 0: content cell (content_title, content_description,
//         content_cta1 + content_cta1Text, content_cta2 + content_cta2Text
//         all element-grouped into one cell, rendered in DOM order).

export default function decorate(block) {
  const [contentRow] = [...block.querySelectorAll(':scope > div')];
  const contentCell = contentRow?.firstElementChild;

  block.innerHTML = '';

  const inner = document.createElement('div');
  inner.className = 'adc-cta-banner-container';

  if (contentCell) {
    [...contentCell.children].forEach((child) => {
      const tag = child.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        const h = document.createElement('h2');
        h.className = 'adc-cta-banner-title';
        h.innerHTML = child.innerHTML;
        inner.append(h);
      } else if (tag === 'p') {
        const p = document.createElement('p');
        p.className = 'adc-cta-banner-desc';
        p.innerHTML = child.innerHTML;
        inner.append(p);
      } else if (tag === 'a') {
        let btns = inner.querySelector('.adc-cta-banner-buttons');
        if (!btns) {
          btns = document.createElement('div');
          btns.className = 'adc-cta-banner-buttons';
          inner.append(btns);
        }
        const a = document.createElement('a');
        a.href = child.href;
        a.className = 'adc-cta-banner-btn';
        a.textContent = child.textContent.trim();
        if (child.target) a.target = child.target;
        btns.append(a);
      }
    });
  }

  block.append(inner);
}

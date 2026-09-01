/**
 * ADC Button Block
 *
 * Standalone reusable button matching the AEM Button component.
 * Cells: [0] Label  [1] Destination URL  [2] Open In (_self|_blank)
 *        [3] Style (primary|primary-alt|secondary)
 */
export default function decorate(block) {
  const row = block.querySelector(':scope > div');
  if (!row) return;

  const cells = [...row.querySelectorAll(':scope > div')];
  const text = cells[0]?.textContent.trim() || '';
  const linkEl = cells[1]?.querySelector('a');
  const href = linkEl?.href || linkEl?.getAttribute('href') || cells[1]?.textContent.trim() || '#';
  const action = cells[2]?.textContent.trim() || '_self';
  const btnStyle = cells[3]?.textContent.trim() || 'primary';

  block.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'button';

  const a = document.createElement('a');
  a.href = href;
  a.className = `btn btn-${btnStyle}`;
  a.textContent = text || linkEl?.textContent.trim() || '';

  if (action === '_blank') {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }

  wrap.append(a);
  block.append(wrap);
}

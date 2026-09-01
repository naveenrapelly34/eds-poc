export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const isSingle = block.classList.contains('single');

  // Controls bar
  const controls = document.createElement('div');
  controls.className = 'adc-accordion-controls';

  const expandAll = document.createElement('button');
  expandAll.textContent = 'Expand All';
  expandAll.type = 'button';

  const collapseAll = document.createElement('button');
  collapseAll.textContent = 'Collapse All';
  collapseAll.type = 'button';

  controls.append(expandAll, collapseAll);

  const items = rows.map((row, idx) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    const titleText = cells[0]?.textContent.trim() || `Item ${idx + 1}`;
    const contentEl = cells[1] || cells[0];
    const id = `adc-accordion-panel-${idx}`;

    const item = document.createElement('div');
    item.className = 'adc-accordion-item';

    const button = document.createElement('button');
    button.className = 'adc-accordion-button';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', id);
    button.innerHTML = `<span>${titleText}</span><span class="adc-accordion-icon" aria-hidden="true">+</span>`;

    const panel = document.createElement('div');
    panel.className = 'adc-accordion-panel';
    panel.id = id;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', `adc-accordion-btn-${idx}`);
    panel.hidden = true;
    if (contentEl) panel.innerHTML = contentEl.innerHTML;

    button.id = `adc-accordion-btn-${idx}`;

    button.addEventListener('click', () => {
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      if (isSingle && !isOpen) {
        items.forEach(({ btn, pnl, icon }) => {
          btn.setAttribute('aria-expanded', 'false');
          pnl.hidden = true;
          icon.textContent = '+';
        });
      }
      const open = !isOpen;
      button.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      button.querySelector('.adc-accordion-icon').textContent = open ? '−' : '+';
    });

    item.append(button, panel);
    return {
      item, btn: button, pnl: panel, icon: button.querySelector('.adc-accordion-icon'),
    };
  });

  expandAll.addEventListener('click', () => {
    items.forEach(({ btn, pnl, icon }) => {
      btn.setAttribute('aria-expanded', 'true');
      pnl.hidden = false;
      icon.textContent = '−';
    });
  });

  collapseAll.addEventListener('click', () => {
    items.forEach(({ btn, pnl, icon }) => {
      btn.setAttribute('aria-expanded', 'false');
      pnl.hidden = true;
      icon.textContent = '+';
    });
  });

  block.textContent = '';
  block.append(controls, ...items.map(({ item }) => item));
}

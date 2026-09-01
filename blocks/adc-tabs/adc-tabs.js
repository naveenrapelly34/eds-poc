const VARIANTS = ['underline', 'pill', 'boxed'];

export default function decorate(block) {
  const allRows = [...block.querySelectorAll(':scope > div')];

  // Skip variant config row (block's own model field, not a tab item)
  const configRow = allRows.find((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    return cells.length === 1 && VARIANTS.includes(cells[0].textContent.trim());
  });

  let variant = 'underline';
  if (configRow) {
    variant = configRow.querySelector(':scope > div')?.textContent.trim() || 'underline';
  }
  block.classList.add(`variant-${variant}`);

  const rows = allRows.filter((r) => r !== configRow);

  const nav = document.createElement('div');
  nav.className = 'adc-tabs-nav';
  nav.setAttribute('role', 'tablist');

  const panels = document.createElement('div');
  panels.className = 'adc-tabs-panels';

  const tabItems = rows.map((row, idx) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    const label = cells[0]?.textContent.trim() || `Tab ${idx + 1}`;
    const content = cells[1] || cells[0];
    const tabId = `adc-tab-${idx}`;
    const panelId = `adc-panel-${idx}`;

    const tab = document.createElement('button');
    tab.className = `adc-tabs-tab${idx === 0 ? ' adc-tabs-tab-active' : ''}`;
    tab.type = 'button';
    tab.textContent = label;
    tab.id = tabId;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
    tab.setAttribute('aria-controls', panelId);

    const panel = document.createElement('div');
    panel.className = `adc-tabs-panel${idx === 0 ? ' adc-tabs-panel-active' : ''}`;
    panel.id = panelId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    if (content) panel.innerHTML = content.innerHTML;

    tab.addEventListener('click', () => {
      nav.querySelectorAll('.adc-tabs-tab').forEach((t) => {
        t.classList.remove('adc-tabs-tab-active');
        t.setAttribute('aria-selected', 'false');
      });
      panels.querySelectorAll('.adc-tabs-panel').forEach((p) => {
        p.classList.remove('adc-tabs-panel-active');
      });
      tab.classList.add('adc-tabs-tab-active');
      tab.setAttribute('aria-selected', 'true');
      panel.classList.add('adc-tabs-panel-active');
    });

    tab.addEventListener('keydown', (e) => {
      const tabs = [...nav.querySelectorAll('.adc-tabs-tab')];
      const current = tabs.indexOf(tab);
      if (e.key === 'ArrowRight') tabs[(current + 1) % tabs.length].click();
      if (e.key === 'ArrowLeft') tabs[(current - 1 + tabs.length) % tabs.length].click();
    });

    nav.append(tab);
    panels.append(panel);
    return { tab, panel };
  });

  block.textContent = '';
  if (tabItems.length) block.append(nav, panels);
}

function cell(row) {
  return row?.firstElementChild || row;
}

function getTitleHtml(block) {
  const firstRow = block.querySelector(':scope > div');
  if (!firstRow) {
    return '';
  }

  const contentCell = cell(firstRow);
  return contentCell?.innerHTML?.trim() || contentCell?.textContent?.trim() || '';
}

export default function decorate(block) {
  if (block.querySelector(':scope > .title')) {
    return;
  }

  const titleHtml = getTitleHtml(block);
  if (!titleHtml) {
    block.textContent = '';
    return;
  }

  block.textContent = '';

  const titleWrapper = document.createElement('div');
  titleWrapper.className = 'title';

  const cmpTitle = document.createElement('div');
  cmpTitle.className = 'cmp-title';

  const heading = document.createElement('h1');
  heading.className = 'cmp-title__text';
  heading.innerHTML = titleHtml;

  cmpTitle.append(heading);
  titleWrapper.append(cmpTitle);
  block.append(titleWrapper);
}

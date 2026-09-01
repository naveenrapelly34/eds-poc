/**
 * ADC Inline Text Block
 *
 * EDS equivalent of AEM inlinetext/v3 ("InLine Text - Description").
 *
 * Dependency chain:
 *   v3 --(sling:resourceSuperType)--> v1
 *   v1 HTML: ${title.title @context='html'}  (raw RTE HTML, no wrapper)
 *   Sling Model: TitleImpl reads @ValueMapValue String title (JCR prop: ./title)
 *
 * Authoring field (from v3 _cq_dialog, name="./title", label="Description"):
 *   RTE toolbar: bold, italic, underline, unordered-list, superscript, links
 *   htmlRules:   b->strong, i->em  (semantic markup)
 *   paraformat:  features="-"  => headings are DISABLED
 *   removeSingleParagraphContainer: true => no <p> wrap for single paragraph
 *
 * AEM produces HTML like:
 *   Some text with <strong>bold</strong>, <em>italic</em>, <u>underline</u>,
 *   <sup>1</sup>, <a href="...">link</a>, or <ul><li>list item</li></ul>.
 *   Span classes may appear: body-large, body-default, body-small, caption,
 *   color-text-gray, upper-case, lower-case, capitalize, font-12, font-14,
 *   disclaimer-text, check-green  (applied via RTE styles picker).
 *
 * AEM rendering adds class="inlinetext" to the outer component container —
 * mirrored here as the inner wrapper class.
 *
 * DOM after decoration:
 *   .adc-inlinetext
 *     .inlinetext   <- mirrors AEM auto-generated container class
 *       <rich text HTML from TitleImpl.getTitle()>
 */
export default function decorate(block) {
  const row = block.querySelector(':scope > div');
  if (!row) return;

  const contentCell = row.querySelector(':scope > div');
  if (!contentCell) return;

  // Wrap in .inlinetext to mirror the AEM-generated container class.
  // Content is AEM-sourced RTE HTML; innerHTML is safe here.
  const wrapper = document.createElement('div');
  wrapper.className = 'inlinetext';
  wrapper.innerHTML = contentCell.innerHTML;

  block.innerHTML = '';
  block.append(wrapper);
}

# UE Container Blocks — Learnings & Troubleshooting

Hard-won notes from building the **ADC Form** block (an EDS port of AEM's Form
Container) and getting its **"+ Add child field"** to work in the Universal
Editor. Read this before building any block that has authorable child items
(form → fields, cards → card, accordion → item, carousel → slide).

---

## 1. The symptom we hit

- Authored the **ADC Form** container, clicked **+** to add a child field →
  **nothing happened / the field vanished on the next edit**.
- Console showed **no errors**.
- Config (component-definition/models/filters) was byte-for-byte correct and
  deployed — verified with `curl`.

So the problem was **not** the UE config. It was the **block's `decorate()`**.

---

## 2. How a UE container actually delivers content to your block

For a container + item block (`.../block/v1/block` + `.../block/v1/block/item`),
xwalk hands your `decorate(block)` a set of `<div>` rows. Two things are true
and easy to forget:

1. **Every child item row carries its OWN instrumentation attributes**, most
   importantly `data-aue-model="<child-component-id>"` (and `data-aue-resource`,
   `data-aue-type="component"`). This is the *reliable* way to know a row is a
   child item.
2. **The container re-runs `decorate()` on the SAME element after every edit.**
   It does not always give you fresh server markup — it can hand you the DOM you
   already transformed on the previous run.

```
<div class="adc-form block" data-aue-type="container" data-aue-filter="adc-form" ...>
  <div data-aue-model="adc-form-field" data-aue-resource="urn:...">  ← a child field
    <div>Text</div><div>email</div><div>…settings…</div><div>…options…</div>
  </div>
</div>
```

---

## 3. The two bugs (and the fixes)

### Bug A — Detecting children by matching cell **text** ❌

Original code decided "is this row a field?" by testing the first cell's text
against a hardcoded list (`text`, `email`, `select`, …). When xwalk rendered the
select's *display label* instead of its *value* (or grouped config differently),
the row didn't match → the field was **silently dropped**. It saved to the
content repo (so it reappeared after a full refresh) but was discarded on the
next in-editor re-render (so it "disappeared").

**Fix — detect children by their own model attribute, never by content:**

```js
function isFieldItemRow(row) {
  if (row.getAttribute('data-aue-model') === 'adc-form-field') return true;
  const res = row.getAttribute('data-aue-resource') || '';
  return /adc[-_]?form[-_]?field/i.test(res);
}
```

> **Rule:** Identify container children by `data-aue-model` (or
> `data-aue-resource`), **not** by matching cell text/type values. Select values
> may render as display names; positions may shift.

### Bug B — Rebuilding the DOM drops child instrumentation ❌

`decorate()` wipes the block (`block.textContent = ''`) and rebuilds a `<form>`.
That throws away the `data-aue-*` attributes UE needs to keep tracking each
child — so **+ Add child** has nothing to attach to.

**Fix — carry instrumentation from each source row onto the element you build:**

```js
import { moveInstrumentation } from '../../scripts/scripts.js';
// while building each field:
if (field.sourceRow && el) moveInstrumentation(field.sourceRow, el);
```

`moveInstrumentation(from, to)` moves the `data-aue-*` attributes so UE still
sees each rendered field as the editable child it created.

### Non-fix we tried and reverted — the "idempotency guard" ⚠️

We briefly added `if (block.querySelector(':scope > .o-form-container')) return;`
to skip re-decoration. **Don't.** The working `adc-cards` container has no such
guard; UE provides usable markup on edit, and the guard just masked the real
detection bug. Removed it.

---

## 4. Debugging checklist for "+ add child does nothing"

1. **Verify config is deployed** (rules out 90% of false leads):
   ```bash
   curl -s https://main--eds-poc--naveenrapelly34.aem.live/component-definition.json | jq '...'
   curl -s https://main--eds-poc--naveenrapelly34.aem.live/component-filters.json | jq '...'
   curl -s https://main--eds-poc--naveenrapelly34.aem.live/component-models.json | jq 'length'
   ```
   Confirm: container has `template.filter` + `model`; child uses
   `.../block/v1/block/item`; a filter `{id: container, components:[child]}`
   exists; the container is listed in the `section` filter.
2. **Confirm the container is recognized** — inspect the block in the UE DOM.
   If it has `data-aue-type="container"` and `data-aue-filter`, UE recognition
   is fine and the bug is in your `decorate()`.
3. **Add an editor-only diagnostic** to see the *real* rows UE gives you:
   ```js
   if (block.hasAttribute('data-aue-resource')) {
     // eslint-disable-next-line no-console
     console.debug('[adc-form] raw rows', rows.map((r) => ({
       cells: r.children.length,
       first: r.children[0]?.textContent.trim().slice(0, 24),
       model: r.getAttribute('data-aue-model'),
     })));
   }
   ```
4. **Compare against a working container** in this repo (`adc-cards.js`,
   `adc-card-carousel.js`) — they are the source of truth for the correct
   pattern (`moveInstrumentation`, structural child detection, no guard).
5. **Bypass the service worker.** `sw.js` is active in this project and can serve
   stale block JS. After every deploy, hard-reload (**Cmd+Shift+R**) or unregister
   the SW in DevTools → Application → Service Workers.

---

## 5. Golden rules (TL;DR)

- Detect container children by **`data-aue-model` / `data-aue-resource`**, never
  by cell text.
- If `decorate()` rebuilds the DOM, **`moveInstrumentation(sourceRow, builtEl)`**
  for every child or UE loses editability.
- **Don't** add re-decoration guards — fix detection instead.
- **Verify deployed config with curl** before suspecting config.
- **Hard-reload** past the service worker when testing after a deploy.
- Keep a working sibling block open as a reference.

---

## 6. Known residual

`parseFieldRow`'s UE branch reads the grouped **settings** cell for
`label / required / placeholder / regex / errorMsg` and treats the last cell as
`value`, but in the UE model that last cell is **options**. So for
`select/checkbox/radio` the options aren't parsed yet, and grouped-cell offsets
for `label`/`placeholder` may be slightly misaligned (a field can render without
its authored label showing). Confirm the exact cell layout from the diagnostic
log above, then align `parseFieldRow` to it. Text/email/tel fields render and
submit correctly today.

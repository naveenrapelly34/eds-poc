/**
 * ADC Form Block
 *
 * Authoring table structure (rows in UE):
 * Row 1 : formType       — ESL API endpoint key (e.g. "contactUs")
 * Row 2 : successMessage — shown after successful submission
 * Row 3 : failureMessage — shown on API error
 * Row 4 : recaptcha      — "true" to enable Google reCAPTCHA v2
 * Row 5+ : field rows    — each row: [type, name, label, required, placeholder, regex, errorMsg]
 *
 * Field types supported: text, email, tel, password, textarea, hidden,
 * select, checkbox, radio. For select/checkbox/radio the last cell holds the
 * options as "Label:value" pairs separated by ";" (a single checkbox may embed
 * a consent version in its value as "value|version").
 *
 * Submission flow:
 *   fetch('POST', config.endpoint) → serverless proxy (adds secret) → ESL API
 *   When `data-endpoint` is empty or "demo" the block runs in demo mode and
 *   simulates a successful submission so the UI can be validated without a
 *   backend.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// Serverless proxy endpoint (set via the block attribute `data-endpoint`).
const ENDPOINT_ATTR = 'data-endpoint';
const RECAPTCHA_SITE_KEY_ATTR = 'data-recaptcha-site-key';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildHiddenInput(name, value) {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value;
  return input;
}

/**
 * Reads per-country context from page metadata. This is the EDS replacement for
 * AEM's inherited page properties (siteName / countryCode) that the Sling Model
 * turned into X-Application-Id / X-Country-Code headers. Authors set these once
 * per country via the metadata sheet (see chapter 17 theming for the pattern).
 */
const metaContent = (name) => document.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';

function getFormContext() {
  return {
    applicationId: metaContent('application-id') || metaContent('app-id'),
    countryCode: metaContent('country') || metaContent('country-code'),
    language: (document.documentElement.lang || metaContent('language')).split('-')[0].toUpperCase(),
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateField(input) {
  const errorEl = input.closest('.a-input-field')?.querySelector('.a-input-field-text-require');
  const { required } = input;
  const { regex } = input.dataset;
  const isCheckbox = input.type === 'checkbox';
  const isRadio = input.type === 'radio';
  const value = (isCheckbox || isRadio) ? '' : input.value?.trim();

  let filled;
  if (isCheckbox) {
    filled = input.checked;
  } else if (isRadio) {
    filled = !!input.form?.querySelector(`input[name="${CSS.escape(input.name)}"]:checked`);
  } else {
    filled = !!value;
  }

  let valid = true;
  let errorMsg = '';

  if (required && !filled) {
    valid = false;
    errorMsg = input.dataset.requiredMsg || 'This field is required';
  } else if (regex && value && !new RegExp(regex).test(value)) {
    valid = false;
    errorMsg = input.dataset.regexMsg || 'Invalid format';
  }

  if (errorEl) {
    errorEl.querySelector('span').textContent = errorMsg;
    errorEl.style.display = valid ? 'none' : 'flex';
  }
  input.setAttribute('aria-invalid', valid ? 'false' : 'true');
  return valid;
}

function validateForm(form) {
  const inputs = [...form.querySelectorAll('input:not([type=hidden]), textarea, select')];
  return inputs.reduce((acc, input) => validateField(input) && acc, true);
}

// ─── Form data serialisation ───────────────────────────────────────────────────

/**
 * Supports nested field names via dot notation: "address.city" → { address: { city: value } }
 */
function setNestedValue(obj, path, value) {
  if (!path.includes('.')) {
    obj[path] = value; // eslint-disable-line no-param-reassign
    return;
  }
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((o, k) => {
    o[k] = o[k] || {}; // eslint-disable-line no-param-reassign
    return o[k];
  }, obj);
  target[lastKey] = value;
}

function serializeForm(form) {
  const body = {};
  const headers = { 'Content-Type': 'application/json' };

  // Text-like inputs, selects and textareas
  [...form.querySelectorAll('input:not([type=checkbox]):not([type=radio]), select, textarea')].forEach((input) => {
    const { name, value } = input;
    if (!name) return;
    if (input.dataset.header === 'true') {
      headers[name] = value;
    } else {
      setNestedValue(body, name, value);
    }
  });

  // Radio groups — only the checked value
  const radioNames = new Set(
    [...form.querySelectorAll('input[type=radio]')].map((r) => r.name).filter(Boolean),
  );
  radioNames.forEach((name) => {
    const checked = form.querySelector(`input[type=radio][name="${CSS.escape(name)}"]:checked`);
    if (checked) setNestedValue(body, name, checked.value);
  });

  // Checkbox groups (consent format)
  const checkboxGroups = {};
  [...form.querySelectorAll('input[type=checkbox]')].forEach((cb) => {
    const { name } = cb;
    if (!name) return;
    if (!checkboxGroups[name]) checkboxGroups[name] = [];
    let { value } = cb;
    let consentVersion;
    if (value.includes('|')) {
      [value, consentVersion] = value.split('|');
    }
    const entry = { consentName: value, consentValue: cb.checked };
    if (consentVersion) entry.consentVersion = consentVersion;
    checkboxGroups[name].push(entry);
  });

  Object.entries(checkboxGroups).forEach(([name, entries]) => {
    setNestedValue(body, name, entries.length === 1 ? entries[0].consentValue : entries);
  });

  return { body, headers };
}

// ─── reCAPTCHA ────────────────────────────────────────────────────────────────

function loadRecaptcha(siteKey) {
  return new Promise((resolve) => {
    if (window.grecaptcha) { resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.onload = () => resolve();
    document.head.append(script);
  });
}

async function getRecaptchaToken(siteKey) {
  await loadRecaptcha(siteKey);
  return window.grecaptcha.execute(siteKey, { action: 'submit' });
}

// ─── Field builders ───────────────────────────────────────────────────────────

function buildInputField({
  type, name, label, required, placeholder, regex, errorMsg, id,
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'a-input-field mt-0';
  wrapper.dataset.required = required ? 'true' : 'false';

  const group = document.createElement('div');
  group.className = 'form-group a-form-grp';
  group.setAttribute('data-component', 'input-field');

  // Label
  if (label && type !== 'hidden') {
    const labelEl = document.createElement('label');
    labelEl.className = 'form-label a-input-label';
    labelEl.htmlFor = id;
    labelEl.innerHTML = `<span class="a-input-field-label">${label}</span>${required ? '<span class="a-input-field-required">*</span>' : ''}`;
    group.append(labelEl);
  }

  // Input / textarea
  const inputGroup = document.createElement('div');
  inputGroup.className = 'input-group a-input-grp';

  let input;
  if (type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 4;
  } else {
    input = document.createElement('input');
    input.type = type || 'text';
  }

  input.className = 'form-control a-input-control';
  input.name = name;
  input.id = id;
  input.placeholder = placeholder || '';
  if (required) input.required = true;
  if (regex) input.dataset.regex = regex;
  if (errorMsg) input.dataset.regexMsg = errorMsg;
  input.dataset.requiredMsg = `${label || name} is required`;

  input.addEventListener('blur', () => validateField(input));

  inputGroup.append(input);
  group.append(inputGroup);

  // Error message container
  if (required || regex) {
    const errorEl = document.createElement('div');
    errorEl.className = 'form-text a-input-field-text-require';
    errorEl.style.display = 'none';
    errorEl.setAttribute('aria-live', 'polite');
    errorEl.innerHTML = '<em class="abt-icon abt-icon-notice-circle-outline"></em><span></span>';
    group.append(errorEl);
  }

  wrapper.append(group);
  return wrapper;
}

// ─── Choice / select builders ──────────────────────────────────────────────────

/**
 * Parses "Label:value;Label:value" into [{ label, value }].
 */
function parseOptions(str) {
  return (str || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf(':');
      if (idx === -1) return { label: pair, value: pair };
      return { label: pair.slice(0, idx).trim(), value: pair.slice(idx + 1).trim() };
    });
}

function buildErrorEl() {
  const errorEl = document.createElement('div');
  errorEl.className = 'form-text a-input-field-text-require';
  errorEl.style.display = 'none';
  errorEl.setAttribute('aria-live', 'polite');
  errorEl.innerHTML = '<em class="abt-icon abt-icon-notice-circle-outline"></em><span></span>';
  return errorEl;
}

function buildSelectField({
  name, label, required, placeholder, value, id,
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'a-input-field mt-0';
  wrapper.dataset.required = required ? 'true' : 'false';

  const group = document.createElement('div');
  group.className = 'form-group a-form-grp';

  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'form-label a-input-label';
    labelEl.htmlFor = id;
    labelEl.innerHTML = `<span class="a-input-field-label">${label}</span>${required ? '<span class="a-input-field-required">*</span>' : ''}`;
    group.append(labelEl);
  }

  const select = document.createElement('select');
  select.className = 'form-control a-input-control';
  select.name = name;
  select.id = id;
  if (required) select.required = true;

  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = placeholder || 'Select…';
  ph.disabled = required;
  ph.selected = true;
  select.append(ph);

  parseOptions(value).forEach((opt) => {
    const optionEl = document.createElement('option');
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    select.append(optionEl);
  });

  select.addEventListener('change', () => validateField(select));
  group.append(select);
  if (required) group.append(buildErrorEl());

  wrapper.append(group);
  return wrapper;
}

function buildChoiceField({
  type, name, label, required, value, id,
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'a-input-field a-choice-field mt-0';
  wrapper.dataset.required = required ? 'true' : 'false';

  const options = parseOptions(value);
  const isSingleCheckbox = type === 'checkbox' && options.length === 0;

  if (label && !isSingleCheckbox) {
    const legend = document.createElement('span');
    legend.className = 'a-input-label';
    legend.innerHTML = `<span class="a-input-field-label">${label}</span>${required ? '<span class="a-input-field-required">*</span>' : ''}`;
    wrapper.append(legend);
  }

  const list = isSingleCheckbox ? [{ label, value }] : options;

  list.forEach((opt, i) => {
    const optId = `${id}-${i}`;
    const row = document.createElement('div');
    row.className = 'a-choice-option';

    const input = document.createElement('input');
    input.type = type;
    input.name = name;
    input.id = optId;
    input.value = opt.value;
    if (required) input.required = true;
    input.dataset.requiredMsg = `${label || name} is required`;
    input.addEventListener('change', () => validateField(input));

    const optLabel = document.createElement('label');
    optLabel.htmlFor = optId;
    optLabel.textContent = opt.label;

    row.append(input, optLabel);
    wrapper.append(row);
  });

  if (required) wrapper.append(buildErrorEl());
  return wrapper;
}

// ─── Form builder ─────────────────────────────────────────────────────────────

function buildForm(config, fields) {
  const form = document.createElement('form');
  form.className = 'o-form-container-main-form';
  form.noValidate = true;

  const fieldContainer = document.createElement('div');
  fieldContainer.className = 'form-container';

  fields.forEach((field, i) => {
    const id = `adc-form-field-${i}`;
    let el;
    if (field.type === 'hidden') {
      el = buildHiddenInput(field.name, field.value || '');
      form.append(el);
    } else if (field.type === 'select') {
      el = buildSelectField({ ...field, id });
      fieldContainer.append(el);
    } else if (field.type === 'checkbox' || field.type === 'radio') {
      el = buildChoiceField({ ...field, id });
      fieldContainer.append(el);
    } else {
      el = buildInputField({ ...field, id });
      fieldContainer.append(el);
    }
    // Preserve Universal Editor instrumentation so authored field items stay
    // selectable/re-orderable and the container's "+" add-child affordance works.
    if (field.sourceRow && el) moveInstrumentation(field.sourceRow, el);
  });

  form.append(fieldContainer);

  // Buttons row
  const btnRow = document.createElement('div');
  btnRow.className = 'o-form-container-buttons d-flex';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'cmp-button abt-btn abt-btn-primary';
  submitBtn.textContent = config.submitLabel || 'Submit';

  btnRow.append(submitBtn);

  if (config.resetLabel) {
    const resetBtn = document.createElement('button');
    resetBtn.type = 'reset';
    resetBtn.className = 'cmp-button abt-btn abt-btn-secondary';
    resetBtn.textContent = config.resetLabel;
    btnRow.append(resetBtn);
  }

  form.append(btnRow);

  // Messages
  const successEl = document.createElement('div');
  successEl.className = 'o-form-container-success-msg';
  successEl.setAttribute('role', 'alert');
  successEl.style.display = 'none';

  const errorEl = document.createElement('div');
  errorEl.className = 'o-form-container-error-msg';
  errorEl.setAttribute('role', 'alert');
  errorEl.style.display = 'none';

  return {
    form, successEl, errorEl, submitBtn,
  };
}

// ─── Submission ───────────────────────────────────────────────────────────────

async function submitForm(form, config, successEl, errorEl, submitBtn) {
  successEl.style.display = 'none';
  errorEl.style.display = 'none';

  if (!validateForm(form)) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  try {
    const { body, headers } = serializeForm(form);

    // Add reCAPTCHA token if configured
    if (config.recaptcha && config.recaptchaSiteKey) {
      const token = await getRecaptchaToken(config.recaptchaSiteKey);
      headers['g-recaptcha-response'] = token;
    }

    const ctx = config.context || {};
    const contextHeaders = {
      'x-form-type': config.formType,
      ...(ctx.applicationId ? { 'x-application-id': ctx.applicationId } : {}),
      ...(ctx.countryCode ? { 'x-country-code': ctx.countryCode } : {}),
      ...(ctx.language ? { 'x-preferred-language': ctx.language } : {}),
    };

    let ok;
    if (!config.endpoint || config.endpoint === 'demo') {
      // Demo mode: no serverless proxy configured yet. Simulate a successful
      // submission so the UI/behaviour can be validated end to end.
      // eslint-disable-next-line no-console
      console.info('[adc-form] demo submit', { headers: { ...headers, ...contextHeaders }, body });
      await new Promise((resolve) => { setTimeout(resolve, 600); });
      ok = true;
    } else {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { ...headers, ...contextHeaders },
        body: JSON.stringify(body),
      });
      ok = response.ok;
      if (!ok) throw new Error(`HTTP ${response.status}`);
    }

    if (ok) {
      successEl.textContent = config.successMessage || 'Thank you for your submission.';
      successEl.style.display = 'block';
      form.reset();
    }
  } catch {
    errorEl.textContent = config.failureMessage || 'Something went wrong. Please try again.';
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = config.submitLabel || 'Submit';
  }
}

// ─── Block decoration ─────────────────────────────────────────────────────────

// Supported field types (first cell of a field row / adc-form-field item).
const FIELD_TYPES = new Set([
  'text', 'email', 'tel', 'password', 'textarea', 'hidden', 'select', 'checkbox', 'radio',
]);

// DA key-value config rows: recognised key (cell[0]) → config property.
const CONFIG_KEY_MAP = new Map([
  ['formtype', 'formType'],
  ['endpointkey', 'formType'],
  ['successmessage', 'successMessage'],
  ['failuremessage', 'failureMessage'],
  ['recaptcha', 'recaptcha'],
  ['submitlabel', 'submitLabel'],
  ['resetlabel', 'resetLabel'],
]);

// Universal Editor container (adc-form) model field order. Leading single-cell
// value rows map positionally to these properties.
const UE_CONFIG_ORDER = ['formType', 'successMessage', 'failureMessage', 'submitLabel'];

const cellText = (el) => el?.textContent?.trim() || '';

function parseFieldRow(cells) {
  const type = cellText(cells[0]).toLowerCase() || 'text';
  const name = cellText(cells[1]);

  if (cells.length >= 7) {
    // Flat DA table row: type,name,label,required,placeholder,regex,errorMsg,options
    return {
      type,
      name,
      label: cellText(cells[2]),
      required: /^true$/i.test(cellText(cells[3])),
      placeholder: cellText(cells[4]),
      regex: cellText(cells[5]),
      errorMsg: cellText(cells[6]),
      value: cellText(cells[7]),
    };
  }

  // Universal Editor item row (adc-form-field): cells are
  //   [type, name, settings-group, options]
  // where the settings group holds label/required/placeholder/regex/errorMsg
  // rendered in model order as child elements of one cell.
  const parts = cells[2] ? [...cells[2].children].map(cellText) : [];
  const [label = '', required = '', placeholder = '', regex = '', errorMsg = ''] = parts;
  return {
    type,
    name,
    label,
    required: /^true$/i.test(required),
    placeholder,
    regex,
    errorMsg,
    value: cells.length >= 4 ? cellText(cells[3]) : '',
  };
}

export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  if (!rows.length) return;

  const config = {
    formType: '',
    successMessage: '',
    failureMessage: '',
    recaptcha: false,
    submitLabel: 'Submit',
    resetLabel: block.getAttribute('data-reset-label') || '',
    recaptchaSiteKey: block.getAttribute(RECAPTCHA_SITE_KEY_ATTR) || '',
    endpoint: block.getAttribute(ENDPOINT_ATTR) || metaContent('form-endpoint') || '',
    context: getFormContext(),
  };

  const assignConfig = (prop, rawValue) => {
    const value = (rawValue || '').trim();
    if (prop === 'recaptcha') config.recaptcha = /^true$/i.test(value);
    else if (prop === 'submitLabel') config.submitLabel = value || 'Submit';
    else config[prop] = value;
  };

  const fields = [];
  const positionalConfig = [];
  let hasKeyedConfig = false;

  // A single walk handles BOTH authoring formats:
  //   • DA table:  key-value config rows (`| formType | contactUs |`) + multi-cell field rows
  //   • Universal Editor:  container model fields render as leading single-cell
  //     value rows (in model order) followed by adc-form-field item rows.
  rows.forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    if (!cells.length) return;
    const firstText = cells[0].textContent.trim();
    const firstLc = firstText.toLowerCase();

    if (FIELD_TYPES.has(firstLc) && cells.length >= 2) {
      const field = parseFieldRow(cells);
      // Keep named fields (production) and any UE-instrumented item row (even if
      // not yet named) so a just-added field persists in the editor.
      if (field.name || row.hasAttribute('data-aue-resource')) {
        field.sourceRow = row;
        fields.push(field);
      }
    } else if (cells.length >= 2 && CONFIG_KEY_MAP.has(firstLc)) {
      // DA key-value config row.
      assignConfig(CONFIG_KEY_MAP.get(firstLc), cells[cells.length - 1].textContent);
      hasKeyedConfig = true;
    } else if (cells.length === 1) {
      // UE single-cell container config value (mapped positionally below).
      positionalConfig.push(firstText);
    }
  });

  // UE positional fallback: leading value rows map to the model field order.
  if (!hasKeyedConfig && positionalConfig.length) {
    positionalConfig.forEach((value, i) => {
      const prop = UE_CONFIG_ORDER[i];
      if (prop) assignConfig(prop, value);
    });
  }

  // Build the form
  const container = document.createElement('div');
  container.className = 'o-form-container';

  const wrapper = document.createElement('div');
  wrapper.className = 'o-form-container-wrapper';

  const outer = document.createElement('div');
  outer.className = 'o-form-container-outer';

  const {
    form, successEl, errorEl, submitBtn,
  } = buildForm(config, fields);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm(form, config, successEl, errorEl, submitBtn);
  });

  outer.append(form, successEl, errorEl);
  wrapper.append(outer);
  container.append(wrapper);

  block.textContent = '';
  block.append(container);
}

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
 * Field types supported: text, email, tel, password, textarea, hidden
 *
 * Submission flow:
 *   fetch('POST /bin/adc/form-submit') → AEM proxy servlet → ESL API
 */

const PROXY_URL = '/bin/adc/form-submit';
const RECAPTCHA_SITE_KEY_ATTR = 'data-recaptcha-site-key';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildHiddenInput(name, value) {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value;
  return input;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateField(input) {
  const errorEl = input.closest('.a-input-field')?.querySelector('.a-input-field-text-require');
  const value = input.value?.trim();
  const { required } = input;
  const { regex } = input.dataset;

  let valid = true;
  let errorMsg = '';

  if (required && !value) {
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

  // Standard inputs + textareas
  [...form.querySelectorAll('input:not([type=checkbox]), textarea')].forEach((input) => {
    const { name, value } = input;
    if (!name) return;
    if (input.dataset.header === 'true') {
      headers[name] = value;
    } else {
      setNestedValue(body, name, value);
    }
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

// ─── Form builder ─────────────────────────────────────────────────────────────

function buildForm(config, fields) {
  const form = document.createElement('form');
  form.className = 'o-form-container-main-form';
  form.noValidate = true;

  const fieldContainer = document.createElement('div');
  fieldContainer.className = 'form-container';

  fields.forEach((field, i) => {
    if (field.type === 'hidden') {
      form.append(buildHiddenInput(field.name, field.value || ''));
      return;
    }
    fieldContainer.append(buildInputField({ ...field, id: `adc-form-field-${i}` }));
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

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        ...headers,
        'x-form-type': config.formType,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      successEl.textContent = config.successMessage || 'Thank you for your submission.';
      successEl.style.display = 'block';
      form.reset();
    } else {
      throw new Error(`HTTP ${response.status}`);
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

export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  if (!rows.length) return;

  // Parse config rows (first 5 rows are config, rest are fields)
  const configRows = rows.slice(0, 5);
  const fieldRows = rows.slice(5);

  const getCellValue = (row, col = 1) => row?.children?.[col]?.textContent?.trim() || '';

  const config = {
    formType: getCellValue(configRows[0]),
    successMessage: getCellValue(configRows[1]),
    failureMessage: getCellValue(configRows[2]),
    recaptcha: getCellValue(configRows[3]) === 'true',
    submitLabel: getCellValue(configRows[4]) || 'Submit',
    recaptchaSiteKey: block.getAttribute(RECAPTCHA_SITE_KEY_ATTR) || '',
  };

  // Parse field rows: [type, name, label, required, placeholder, regex, errorMsg]
  const fields = fieldRows.map((row) => {
    const cells = [...row.children];
    return {
      type: cells[0]?.textContent?.trim() || 'text',
      name: cells[1]?.textContent?.trim() || '',
      label: cells[2]?.textContent?.trim() || '',
      required: cells[3]?.textContent?.trim() === 'true',
      placeholder: cells[4]?.textContent?.trim() || '',
      regex: cells[5]?.textContent?.trim() || '',
      errorMsg: cells[6]?.textContent?.trim() || '',
      value: cells[7]?.textContent?.trim() || '',
    };
  }).filter((f) => f.name);

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

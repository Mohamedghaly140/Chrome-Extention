/**
 * Auto-fill content script: enables autocomplete and fills username/password
 * from stored credentials even when the site sets autocomplete="off".
 * For strict sites (e.g. eservice.incometax.gov.eg): fill only on focus or "Auto-fill now".
 */

const STORAGE_KEY = "siteCredentials";

/** Hosts that require user to focus the field first before we fill (no immediate fill on load). */
const FILL_ON_FOCUS_HOSTS = ["eservice.incometax.gov.eg", "incometax.gov.eg"];

function getHost() {
  try {
    return new URL(document.baseURI || document.URL).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    return "";
  }
}

function isFillOnFocusSite() {
  const host = getHost();
  return FILL_ON_FOCUS_HOSTS.some(h => host === h || host.endsWith("." + h));
}

/** Detect username/email input (generic). Egyptian tax site may use name with "user" or first text input. */
function findUsernameField(form) {
  const scope = form || document;
  const candidates = scope.querySelectorAll(
    'input[type="text"], input[type="email"], input:not([type])',
  );
  for (const input of candidates) {
    if (input.type === "password" || input.hidden || input.disabled) continue;
    const name = (input.name || "").toLowerCase();
    const id = (input.id || "").toLowerCase();
    const placeholder = (input.placeholder || "").toLowerCase();
    const autocomplete = (
      input.getAttribute("autocomplete") || ""
    ).toLowerCase();
    if (
      name.includes("user") ||
      name.includes("email") ||
      name.includes("login") ||
      id.includes("user") ||
      id.includes("email") ||
      id.includes("login") ||
      placeholder.includes("user") ||
      placeholder.includes("email") ||
      autocomplete === "username" ||
      autocomplete === "email"
    ) {
      return input;
    }
  }
  return candidates[0] || null;
}

/** Detect password input. Prefer id="userPwdInput" (Egyptian tax site). */
function findPasswordField(form) {
  const scope = form || document;
  const byId = scope.querySelector("input#userPwdInput");
  if (byId && !byId.hidden && !byId.disabled) {
    if (byId.type !== "password") byId.setAttribute("type", "password");
    return byId;
  }
  const candidates = scope.querySelectorAll('input[type="password"]');
  for (const input of candidates) {
    if (input.hidden || input.disabled) continue;
    return input;
  }
  return null;
}

/** Force autocomplete on. */
function forceAutocompleteOn(input, kind) {
  if (!input) return;
  input.removeAttribute("autocomplete");
  input.setAttribute(
    "autocomplete",
    kind === "password" ? "current-password" : "username",
  );
  input.setAttribute("data-autofill-extension", "on");
}

/** Set value and fire input/change so frameworks and site scripts see it. */
function setInputValue(input, value) {
  if (!input) return;
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (nativeSetter) {
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

let fillInProgress = false;

/**
 * Fill username and password from credentials.
 * Focuses username, sets value, then focuses password and sets value
 * so the password field is "selected" before fill (required by some sites).
 */
function doFill(credentials) {
  if (!credentials || (!credentials.username && !credentials.password)) return;
  const usernameField = findUsernameField();
  const passwordField = findPasswordField();
  if (!usernameField && !passwordField) return;

  fillInProgress = true;

  if (credentials.username && usernameField) {
    usernameField.focus();
    setInputValue(usernameField, credentials.username);
  }
  if (credentials.password && passwordField) {
    // Select password field first, then set value (required for eservice.incometax.gov.eg)
    passwordField.focus();
    setInputValue(passwordField, credentials.password);
  }

  setTimeout(() => {
    fillInProgress = false;
  }, 100);
}

/** Enable autocomplete on all relevant inputs; optionally attach fill-on-focus. */
function enableAutocompleteAndFill(credentials, options) {
  const { fillOnLoad = true, attachFillOnFocus = false } = options || {};
  const forms = document.querySelectorAll("form");
  const processedUsername = new WeakSet();
  const processedPassword = new WeakSet();

  if (forms.length) {
    forms.forEach(form => {
      form.setAttribute("autocomplete", "on");
      form.setAttribute("data-autofill-extension", "on");
    });
  } else {
    const form = document.querySelector("form");
    if (form) {
      form.setAttribute("autocomplete", "on");
      form.setAttribute("data-autofill-extension", "on");
    }
  }

  const allTextOrEmail = document.querySelectorAll(
    'input[type="text"], input[type="email"], input:not([type])',
  );
  allTextOrEmail.forEach(input => {
    if (input.type === "password" || input.hidden) return;
    if (processedUsername.has(input)) return;
    if (
      (input.name && /user|email|login/i.test(input.name)) ||
      (input.id && /user|email|login/i.test(input.id)) ||
      (input.placeholder && /user|email/i.test(input.placeholder)) ||
      input.getAttribute("autocomplete") === "username" ||
      input.getAttribute("autocomplete") === "email"
    ) {
      forceAutocompleteOn(input, "username");
      processedUsername.add(input);
    }
  });

  const userPwdInput = document.querySelector("input#userPwdInput");
  if (
    userPwdInput &&
    !userPwdInput.hidden &&
    !processedPassword.has(userPwdInput)
  ) {
    if (userPwdInput.type !== "password")
      userPwdInput.setAttribute("type", "password");
    forceAutocompleteOn(userPwdInput, "password");
    processedPassword.add(userPwdInput);
  }

  const allPassword = document.querySelectorAll('input[type="password"]');
  allPassword.forEach(input => {
    if (input.hidden) return;
    if (processedPassword.has(input)) return;
    forceAutocompleteOn(input, "password");
    processedPassword.add(input);
  });

  // Fill on focus: when user focuses password or username, fetch and fill (so latest credentials are used)
  if (attachFillOnFocus) {
    const host = getHost();
    const runFillOnFocus = () => {
      if (fillInProgress) return;
      chrome.storage.local.get(STORAGE_KEY, data => {
        const creds = host ? (data[STORAGE_KEY] || {})[host] || null : null;
        if (creds?.username || creds?.password) doFill(creds);
      });
    };
    const usernameField = findUsernameField();
    const passwordField = findPasswordField();
    [usernameField, passwordField].filter(Boolean).forEach(el => {
      if (el.__autofillFocusAttached) return;
      el.__autofillFocusAttached = true;
      el.addEventListener("focus", runFillOnFocus, { once: false });
    });
  }

  // Immediate fill on load only when allowed (not for strict sites)
  if (fillOnLoad && credentials) doFill(credentials);
}

/** Debounce helper */
function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

/** Fetch credentials and run enable + fill with correct options for this host. */
function runAutofill() {
  const host = getHost();
  const fillOnFocusSite = isFillOnFocusSite();

  chrome.storage.local.get(STORAGE_KEY, data => {
    const credentials = host ? (data[STORAGE_KEY] || {})[host] || null : null;
    enableAutocompleteAndFill(credentials, {
      fillOnLoad: !fillOnFocusSite,
      attachFillOnFocus: fillOnFocusSite,
    });
  });
}

/** Run autofill when DOM changes (e.g. login modal appears), debounced. */
function observeDOMChanges() {
  runAutofill();

  const debouncedRun = debounce(runAutofill, 250);
  const observer = new MutationObserver(() => {
    debouncedRun();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // For fill-on-focus sites, retry a few times so we attach listeners when form appears late
  if (isFillOnFocusSite()) {
    [300, 800, 1500].forEach(delay => {
      setTimeout(runAutofill, delay);
    });
  }
}

function main() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeDOMChanges);
  } else {
    observeDOMChanges();
  }
}

main();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.command === "enable" || message.command === "fillNow") {
    const host = getHost();
    chrome.storage.local.get(STORAGE_KEY, data => {
      const credentials = host ? (data[STORAGE_KEY] || {})[host] || null : null;
      doFill(credentials);
      enableAutocompleteAndFill(credentials, {
        fillOnLoad: false,
        attachFillOnFocus: isFillOnFocusSite(),
      });
      sendResponse({ ok: true });
    });
  } else if (message.command === "disable") {
    const inputs = document.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="password"]',
    );
    inputs.forEach(input => input.setAttribute("autocomplete", "off"));
    const form = document.querySelector("form");
    if (form) form.setAttribute("autocomplete", "off");
    sendResponse({ ok: true });
  }
  return true;
});

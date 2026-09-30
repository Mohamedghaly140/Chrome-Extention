# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Manifest V3 Chrome extension ("Auto-Complete") that stores a username/password per site and fills login forms even when the site sets `autocomplete="off"`. It was built mainly for `eservice.incometax.gov.eg`, and that site gets special handling in several places. The README is the stock Vite template and says nothing about the extension.

## Commands

Uses Yarn (there's a `yarn.lock`).

- `yarn dev` runs the Vite dev server on port 3000 with CRXJS HMR. Load `dist/` as an unpacked extension in `chrome://extensions`.
- `yarn build` runs `tsc -b && vite build` and writes the extension to `dist/`.
- `yarn lint` runs ESLint.

There is no test suite.

## Architecture

`vite.config.ts` feeds `manifest.json` to `@crxjs/vite-plugin`, which bundles every entry point the manifest references. Only the popup goes through React/TypeScript. The two other scripts are plain JS at the repo root.

- **Popup** (`index.html` → `src/main.tsx` → `src/App.tsx`): reads the active tab's host, then loads and saves credentials **directly** with `chrome.storage.local`. "Auto-fill now" sends `{command: "fillNow"}` to the content script with `chrome.tabs.sendMessage`.
- **Content script** (`contentScript.js`, injected on `<all_urls>` at `document_idle`): finds username and password fields heuristically, forces `autocomplete` on, and fills them through the native `HTMLInputElement` value setter, then dispatches `input`/`change` so framework-controlled inputs pick up the value. A debounced `MutationObserver` re-runs it when login forms appear late. It also handles the `enable`, `fillNow` and `disable` messages.
- **Background service worker** (`background.js`): has `getCredentials`, `saveCredentials` and `getCredentialsForContent` message handlers, but nothing calls them right now, because the popup and content script both read storage themselves. Its `chrome.action.onClicked` listener never fires either, since the manifest defines a `default_popup`.

### Shared conventions (duplicated, keep in sync)

- Storage schema: `chrome.storage.local["siteCredentials"]` is a `Record<host, {username, password}>`. The key string `STORAGE_KEY` is defined separately in `App.tsx`, `contentScript.js` and `background.js`.
- Host normalization: `hostname` with a leading `www.` stripped. This also exists in both the popup (`getHostFromUrl`) and the content script (`getHost`), and the two must match or lookups miss.

### Site-specific behavior

- Hosts listed in `FILL_ON_FOCUS_HOSTS` (the incometax sites) are **not** filled on page load. The content script attaches focus listeners instead and fills when the user focuses a field or clicks "Auto-fill now". It also retries at 300/800/1500 ms to catch forms that render late.
- `findPasswordField` looks for `input#userPwdInput` first and forces it to `type="password"`.
- `doFill` focuses the password field before setting its value, because the tax site requires it.
- `manifest.json`'s CSP allows `https://eservice.incometax.gov.eg` in `script-src-elem`.

### Tooling caveats

- ESLint only covers `**/*.{ts,tsx}`, so `background.js` and `contentScript.js` are never linted.
- `tsconfig.app.json` lists those two files under `include`, but `allowJs` and `checkJs` are off, so they aren't type-checked either.
- Icons in `public/` are served from the extension root (for example, `icon_logo_128px.png`).

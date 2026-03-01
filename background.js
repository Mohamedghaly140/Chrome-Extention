const STORAGE_KEY = "siteCredentials";

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["contentScript.js"],
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.command === "getCredentials") {
    const host = message.host || "";
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      const credentials = data[STORAGE_KEY] || {};
      sendResponse({ credentials: credentials[host] || null });
    });
    return true; // keep channel open for async sendResponse
  }
  if (message.command === "saveCredentials") {
    const { host, username, password } = message;
    if (!host) {
      sendResponse({ ok: false });
      return true;
    }
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      const credentials = data[STORAGE_KEY] || {};
      credentials[host] = { username: username || "", password: password || "" };
      chrome.storage.local.set({ [STORAGE_KEY]: credentials }, () => {
        sendResponse({ ok: true });
      });
    });
    return true;
  }
  if (message.command === "getCredentialsForContent") {
    const host = message.host || "";
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      const credentials = data[STORAGE_KEY] || {};
      sendResponse({ credentials: credentials[host] || null });
    });
    return true;
  }
});

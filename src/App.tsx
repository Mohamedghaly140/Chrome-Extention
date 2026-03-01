import React, { useEffect, useState } from "react";
import "./App.css";

const STORAGE_KEY = "siteCredentials";

type StoredCredential = { username: string; password: string };
type CredentialsMap = Record<string, StoredCredential>;

function getHostFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const AutoCompletePopup: React.FC = () => {
  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [fillSent, setFillSent] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url && (tab.url.startsWith("http:") || tab.url.startsWith("https:"))) {
        const h = getHostFromUrl(tab.url);
        setHost(h);
        chrome.storage.local.get(STORAGE_KEY, (data) => {
          const all = (data[STORAGE_KEY] || {}) as CredentialsMap;
          const credentials = all[h];
          if (credentials) {
            setUsername(credentials.username || "");
            setPassword(credentials.password || "");
          }
        });
      }
    });
  }, []);

  const saveCredentials = () => {
    if (!host) return;
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      const credentials: CredentialsMap = (data[STORAGE_KEY] || {}) as CredentialsMap;
      credentials[host] = { username, password };
      chrome.storage.local.set({ [STORAGE_KEY]: credentials }, () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    });
  };

  const fillNow = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId == null) return;
      chrome.tabs.sendMessage(tabId, { command: "fillNow" }, () => {
        setFillSent(true);
        setTimeout(() => setFillSent(false), 2000);
      });
    });
  };

  return (
    <div className="home-container">
      <div className="content">
        <header className="popup-header">
          <img
            src="icon_logo_128px.png"
            alt=""
            className="icon"
          />
          <h1>Auto-Complete</h1>
        </header>

        {host ? (
          <>
            <div className="host-badge" title={host}>
              Site: <strong>{host}</strong>
            </div>

            <div className="form-card">
              <div className="form-group">
                <label htmlFor="popup-username">Username / Email</label>
                <input
                  id="popup-username"
                  type="text"
                  autoComplete="username"
                  placeholder="Username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="form-group">
                <label htmlFor="popup-password">Password</label>
                <input
                  id="popup-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="button-row">
                <button
                  type="button"
                  onClick={saveCredentials}
                  className="btn btn-primary"
                >
                  Save for this site
                </button>
                <button
                  type="button"
                  onClick={fillNow}
                  className="btn btn-secondary"
                >
                  Auto-fill now
                </button>
              </div>

              <div className="feedback-wrap">
                {saved && <p className="feedback success">Saved.</p>}
                {fillSent && <p className="feedback success">Filled.</p>}
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>Open a webpage (http/https) to save or fill credentials.</p>
          </div>
        )}

        <p className="help-text">
          Save your login for this site, then use &quot;Auto-fill now&quot; to fill the form even when the site disables autocomplete.
        </p>

        <div className="icon-container">
          <img
            src="icon_logo_128px.png"
            alt=""
            className="icon"
          />
        </div>
      </div>
    </div>
  );
};

export default AutoCompletePopup;

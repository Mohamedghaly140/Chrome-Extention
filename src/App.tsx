import React, { useEffect } from "react";
import "./App.css";

const AutoCompletePopup: React.FC = () => {
  const enableAutocomplete = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id as number, { command: "enable" });
    });
  };

  useEffect(() => {
    enableAutocomplete();
  }, []);

  return (
    <div className="home-container">
      <div className="content">
        <h1>Auto-Complete Extension</h1>
        <p>
          Welcome to the Auto-Complete Extension! This extension helps you
          automatically fill in your credentials on websites that disable
          browser autofill features. Just enable the extension, and it will take
          care of the rest!
        </p>
        <p>
          With our extension, you can easily manage your username and password
          autofill settings, allowing for a smoother and more efficient browsing
          experience.
        </p>
        <div className="icon-container">
          <img
            src="icon_logo_128px.png"
            alt="Auto-Complete Icon"
            className="icon"
          />
        </div>
      </div>
    </div>
  );
};

export default AutoCompletePopup;

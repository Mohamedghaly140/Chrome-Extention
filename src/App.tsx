import React, { useEffect } from "react";

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
    <div>
      <h1>App</h1>
      Auto Complete Extention
    </div>
  );
};

export default AutoCompletePopup;

console.log("Hello from the content script!");

const enableAutocomplete = () => {
  const passwordInput = document.querySelector(
    'input#userPwdInput[name="pwd"]'
  );
  if (passwordInput) {
    passwordInput.setAttribute("type", "password");
    passwordInput.setAttribute("autocomplete", "current-password");

    const handleFocus = () => {
      passwordInput.setAttribute("autocomplete", "current-password");
    };

    passwordInput.addEventListener("focus", handleFocus);

    // Store a custom cleanup function to remove the event listener later
    passwordInput.removeFocusListener = () =>
      passwordInput.removeEventListener("focus", handleFocus);
  }
  const inputs = document.querySelectorAll(
    'input[type="text"], input[type="email"]'
  );

  inputs.forEach(input => {
    if (
      (input.type === "text" || input.type === "email") &&
      input.name.includes("userName")
    ) {
      // input.setAttribute("type", "text");
      input.setAttribute("autocomplete", "username");
    } else if (input.type === "password") {
      input.setAttribute("autocomplete", "current-password"); // Use 'current-password' for password fields
    } else {
      input.setAttribute("autocomplete", "on"); // Default for other fields
    }

    // If the site tries to reset the value on focus, re-enable autocomplete on focus
    const handleFocus = () => {
      input.setAttribute(
        "autocomplete",
        input.type === "password" ? "current-password" : "username"
      );
    };

    // Add event listener for focus event
    input.addEventListener("focus", handleFocus);

    // Optional: Save the listener in case you want to remove it later
    input.removeFocusListener = () =>
      input.removeEventListener("focus", handleFocus);
  });

  const form = document.querySelector("form");

  if (form) {
    form.setAttribute("autocomplete", "on");
  }
};

const disableAutocomplete = () => {
  const passwordInput = document.querySelector(
    'input#userPwdInput[name="pwd"]'
  );
  if (passwordInput) {
    passwordInput.setAttribute("autocomplete", "off");
  }

  const inputs = document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="password"]'
  );

  inputs.forEach(input => {
    input.setAttribute("autocomplete", "off"); // Disable autocomplete for each input
  });

  // Select the form element if it exists and disable autocomplete for the whole form
  const form = document.querySelector("form");

  if (form) {
    form.setAttribute("autocomplete", "off");
  }
};

// This will listen for messages from the popup or background script
const observeDOMChanges = () => {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === "childList") {
        // New nodes added to the DOM
        enableAutocomplete(); // Re-enable autocomplete on new elements
      }
    });
  });

  // Configure observer to watch for child elements added or removed in the document body
  observer.observe(document.body, {
    childList: true,
    subtree: true, // Watch all descendants
  });

  // Enable autocomplete for the initial page load
  enableAutocomplete();
};

// Start observing the DOM
observeDOMChanges();

// Listen for messages from the background or popup script
chrome.runtime.onMessage.addListener(message => {
  if (message.command === "enable") {
    enableAutocomplete();
  } else if (message.command === "disable") {
    // Optionally disable autocomplete (not covered in the current implementation)
    const inputs = document.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="password"]'
    );
    inputs.forEach(input => {
      input.setAttribute("autocomplete", "off");
    });
  }
});

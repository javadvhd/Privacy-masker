console.log(">>>> content.js loaded");
// Function to mask sensitive information
function getMaskedText(text) {
  console.log(">>>>> getMaskedText", text);
  let maskedText = text;

  // Regex for finding email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

  // A heuristic regex for finding password-like strings.
  // This looks for strings of 8+ characters with at least one uppercase, one lowercase, and one number.
  // WARNING: This can have false positives.
  const passwordRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}/g;

  // Replace emails with stars
  maskedText = maskedText.replace(emailRegex, (match) =>
    "*".repeat(match.length)
  );

  // Replace password-like strings with stars
  maskedText = maskedText.replace(passwordRegex, (match) =>
    "*".repeat(match.length)
  );

  return maskedText;
}

// Function to apply the masking logic to all text areas
function applyMasking() {
  console.log(">>>>> applyMasking");
  const textareas = document.querySelectorAll("textarea");

  textareas.forEach((textarea) => {
    // We create a "shadow" div to display the masked text
    // This provides a much better user experience than modifying the textarea value directly.
    let shadow = textarea._shadowDiv;
    if (!shadow) {
      shadow = document.createElement("div");
      textarea._shadowDiv = shadow;
      shadow.style.position = "absolute";
      shadow.style.pointerEvents = "none"; // Makes the div "un-clickable"
      shadow.style.font = window.getComputedStyle(textarea).font;
      shadow.style.padding = window.getComputedStyle(textarea).padding;
      shadow.style.border = window.getComputedStyle(textarea).border;
      shadow.style.letterSpacing =
        window.getComputedStyle(textarea).letterSpacing;
      shadow.style.lineHeight = window.getComputedStyle(textarea).lineHeight;
      shadow.style.whiteSpace = "pre-wrap"; // Respects newlines and spaces
      shadow.style.wordWrap = "break-word";

      document.body.appendChild(shadow);

      textarea.addEventListener("input", () => updateShadow(textarea, shadow));
      textarea.addEventListener("scroll", () => updateShadow(textarea, shadow));
      new ResizeObserver(() => updateShadow(textarea, shadow)).observe(
        textarea
      );
    }
    updateShadow(textarea, shadow);
  });
}

function updateShadow(textarea, shadow) {
  console.log(">>>>> updateShadow", textarea, shadow);
  // Check chrome storage to see if masking is enabled
  chrome.storage.sync.get({ maskingEnabled: true }, function (data) {
    if (data.maskingEnabled) {
      const rect = textarea.getBoundingClientRect();
      shadow.style.display = "block";
      shadow.style.top = `${rect.top + window.scrollY}px`;
      shadow.style.left = `${rect.left + window.scrollX}px`;
      shadow.style.width = `${textarea.clientWidth}px`;
      shadow.style.height = `${textarea.clientHeight}px`;
      shadow.textContent = getMaskedText(textarea.value);
      shadow.scrollTop = textarea.scrollTop; // Sync scroll position
      textarea.style.color = "transparent"; // Hide the real text
    } else {
      shadow.style.display = "none";
      textarea.style.color = ""; // Show the real text
    }
  });
}

// Initial run
applyMasking();

// Listen for changes in the toggle switch from the popup
chrome.storage.onChanged.addListener(function (changes, namespace) {
  console.log("changes in storage ", changes, namespace);
  if (changes.maskingEnabled) {
    applyMasking();
  }
});

// Run the masker again in case new textareas are added to the page dynamically
const observer = new MutationObserver(applyMasking);
observer.observe(document.body, { childList: true, subtree: true });

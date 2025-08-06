// --- Configuration ---
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const passwordRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}/g;
const MASKED_CLASS = "privacy-masker-span";
const MASKED_SELECTOR = `.${MASKED_CLASS}`;

// --- Add Styles to the Page ---
// We inject a <style> tag to define how our masked spans will look.
// Using a CSS filter or text-shadow is better than replacing with '*' because it preserves spacing.
const style = document.createElement("style");
style.textContent = `
  ${MASKED_SELECTOR} {
    background-color: #333;
    color: transparent;
    border-radius: 3px;
    text-shadow: 0 0 5px rgba(0,0,0,0.8);
    cursor: pointer;
    user-select: none; /* Prevents selecting the masked text */
  }
`;
document.head.append(style);

// --- Core Masking Logic ---

/**
 * Traverses the nodes within an element and applies masking to text nodes.
 * @param {Node} node The starting node (usually the contenteditable div).
 */
function maskNode(node) {
  console.log(">>>>> maskNode", node);
  // Use a TreeWalker to efficiently find all text nodes
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); // TODO: change SHOW_TEXT because does not support div

  console.log(">>>>> walker", walker);

  let textNode;
  while ((textNode = walker.nextNode())) {
    // Skip nodes that are already inside a mask or script/style tags
    console.log(
      ">>>>> closest",
      textNode.parentElement.closest(MASKED_SELECTOR)
    );
    if (
      textNode.parentElement.closest(MASKED_SELECTOR) ||
      textNode.parentElement.closest("script, style")
    ) {
      continue;
    }

    const text = textNode.nodeValue;
    const matches = [
      ...text.matchAll(emailRegex),
      ...text.matchAll(passwordRegex),
    ];

    if (matches.length > 0) {
      // Process matches in reverse to avoid index issues after splitting text nodes
      for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const matchText = match[0];
        const matchIndex = match.index;

        // Split the text node at the end of the match
        const endNode = textNode.splitText(matchIndex + matchText.length);
        // Split the text node at the start of the match. What's left in 'textNode' is the text before the match.
        // The return value 'matchNode' is the text node containing our sensitive word.
        const matchNode = textNode.splitText(matchIndex);

        // Create the masking span and put the sensitive text inside it
        const span = document.createElement("span");
        span.className = MASKED_CLASS;
        span.dataset.originalText = matchNode.nodeValue; // Store original text
        span.textContent = "•".repeat(matchNode.nodeValue.length); // Display dots of the same length

        // Replace the text node with our new span
        matchNode.parentNode.replaceChild(span, matchNode);
      }
    }
  }
}

/**
 * Unmasks a specific span, restoring the original text for editing.
 * @param {HTMLElement} span The masked span to unmask.
 */
function unmaskSpan(span) {
  const originalText = span.dataset.originalText;
  if (originalText) {
    const textNode = document.createTextNode(originalText);
    span.parentNode.replaceChild(textNode, span);

    // Optional: place cursor at the end of the unmasked text
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(textNode, textNode.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

// --- Event Listeners and Initialization ---

function setupListeners(rootElement) {
  // Main listener for when user types or pastes
  rootElement.addEventListener(
    "input",
    (e) => {
      // Check if masking is enabled from storage
      chrome.storage.sync.get({ maskingEnabled: true }, (data) => {
        console.log(">>>>> data", data, e);
        if (data.maskingEnabled) {
          // We only need to mask the nodes around the current cursor position,
          // but for simplicity, we re-mask the whole element.
          // For very large documents, you might want to optimize this.
          maskNode(rootElement);
        }
      });
    },
    { capture: true }
  ); // Use capture to run our logic before other listeners

  // Listener to unmask when a user clicks on a masked element
  rootElement.addEventListener(
    "click",
    (e) => {
      const maskedElement = e.target.closest(MASKED_SELECTOR);
      if (maskedElement) {
        e.preventDefault();
        e.stopPropagation();
        unmaskSpan(maskedElement);
      }
    },
    { capture: true }
  );
}

// Function to find all editable elements and attach listeners
function initializeMasking() {
  const editableElements = document.querySelectorAll(
    '[contenteditable="true"]'
  );
  editableElements.forEach((el) => {
    console.log(">>>>> el", el);
    // Use a flag to ensure we only attach listeners once
    if (!el._privacyMaskerAttached) {
      setupListeners(el);
      el._privacyMaskerAttached = true;
    }
  });
}

// --- Run the extension ---

// Initial run
initializeMasking();

// Use a MutationObserver to detect new editable elements added to the page dynamically
const observer = new MutationObserver(initializeMasking);
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

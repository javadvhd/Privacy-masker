console.log("popup.js loaded");
document.addEventListener("DOMContentLoaded", function () {
  console.log("popup.js loaded 2");
  const toggleSwitch = document.getElementById("toggleSwitch");

  // Load the saved state and set the toggle accordingly
  chrome.storage.sync.get({ maskingEnabled: true }, function (data) {
    console.log("chrome.storage.sync.get", data);
    toggleSwitch.checked = data.maskingEnabled;
  });

  // When the toggle is clicked, save the new state
  toggleSwitch.addEventListener("change", function () {
    console.log("toggleSwitch", this.checked);
    chrome.storage.sync.set({ maskingEnabled: this.checked });
  });
});

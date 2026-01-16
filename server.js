const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

/* ---------------- HOME PAGE ---------------- */
app.get("/", (req, res) => {
  res.send(`
    <h2>AI Summarizer Backend is Running ✅</h2>
    <p>POST /summarize → Save summary</p>
    <p>GET /data → View saved summaries</p>
  `);
});

/* ---------------- SUMMARIZE API ---------------- */
function summarizeText(text) {
  return text.split(" ").slice(0, 40).join(" ") + "...";
}

app.post("/summarize", (req, res) => {
  const { content, url } = req.body;

  if (!content) {
    return res.status(400).json({ error: "No content received" });
  }

  const summary = summarizeText(content);

  const record = {
    url,
    summary,
    time: new Date().toISOString()
  };

  let data = [];
  if (fs.existsSync(DATA_FILE)) {
    data = JSON.parse(fs.readFileSync(DATA_FILE));
  }

  data.push(record);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  console.log("Summary stored for:", url);

  res.json({ summary });
});

/* ---------------- VIEW STORED DATA ---------------- */
app.get("/data", (req, res) => {
  if (!fs.existsSync(DATA_FILE)) {
    return res.json([]);
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  res.json(data);
});

/* ---------------- START SERVER ---------------- */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

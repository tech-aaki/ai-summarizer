const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// simple summarizer logic
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

  const data = JSON.parse(fs.readFileSync("data.json"));
  data.push(record);
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));

  res.json({ summary });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

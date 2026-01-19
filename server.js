const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ✅ TLS-safe MongoDB URI
const MONGO_URI =
  "mongodb+srv://inforecyclestore_db_user:Rw3rC14S4r5nGbHM@ai-summarizer.gqwena9.mongodb.net/?appName=ai-summarizer";

let collection;

/* ---------------- START SERVER AFTER DB CONNECT ---------------- */
async function startServer() {
  try {
    const client = new MongoClient(MONGO_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
      }
    });

    await client.connect();
    console.log("✅ MongoDB connected successfully");

    const db = client.db("ai_summarizer");
    collection = db.collection("summaries");

    app.listen(PORT, () => {
      console.log("🚀 Server running on port", PORT);
    });

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

/* ---------------- ROUTES ---------------- */

app.get("/", (req, res) => {
  res.send("AI Summarizer Backend is Running (MongoDB Mode) ✅");
});

app.post("/summarize", async (req, res) => {
  const { content, url } = req.body;

  if (!content) {
    return res.status(400).json({ error: "No summary received" });
  }

  try {
    await collection.insertOne({
      pageUrl: url,
      summary: content,
      createdAt: new Date()
    });

    res.json({ success: true, summary: content });

  } catch (err) {
    console.error("❌ Insert error:", err);
    res.status(500).json({ error: "Failed to save summary" });
  }
});

app.get("/data", async (req, res) => {
  try {
    const data = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

/* ---------------- BOOT ---------------- */
startServer();

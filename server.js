const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 🔐 MongoDB connection string
const MONGO_URI =
  "mongodb+srv://inforecyclestore_db_user:Rw3rC14S4r5nGbHM@ai-summarizer.gqwena9.mongodb.net/?appName=ai-summarizer";

const DB_NAME = "ai_summarizer";
const COLLECTION_NAME = "summaries";

let collection;

// 🔌 Connect to MongoDB ONCE
async function connectMongo() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log("✅ MongoDB connected");

    const db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}

connectMongo();

/* ---------------- HOME ---------------- */
app.get("/", (req, res) => {
  res.send("AI Summarizer Backend is Running (MongoDB Mode) ✅");
});

/* ---------------- SAVE SUMMARY ---------------- */
app.post("/summarize", async (req, res) => {
  const { content, url } = req.body;

  if (!content) {
    return res.status(400).json({ error: "No summary received" });
  }

  try {
    const doc = {
      pageUrl: url,
      summary: content,          // FULL summary (no truncation)
      createdAt: new Date()
    };

    await collection.insertOne(doc);

    console.log("📦 Summary saved to MongoDB");

    res.json({
      success: true,
      summary: content
    });
  } catch (err) {
    console.error("❌ MongoDB insert error:", err);
    res.status(500).json({ error: "Failed to save summary" });
  }
});

/* ---------------- GET ALL DATA ---------------- */
app.get("/data", async (req, res) => {
  try {
    const data = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json(data);
  } catch (err) {
    console.error("❌ MongoDB fetch error:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

/* ---------------- START SERVER ---------------- */
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://<db_username>:<db_password>@summarizer-cluster.bm0ieqb.mongodb.net/?appName=summarizer-cluster";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: "ai_summarizer_db"
})
.then(() => console.log("✅ MongoDB Connected Successfully"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// MongoDB Schema
const summarySchema = new mongoose.Schema({
  url: { type: String, required: true },
  title: { type: String, default: "" },
  summary: { type: String, required: true },
  summaryType: { type: String, default: "brief" },
  timestamp: { type: Date, default: Date.now },
  contentLength: { type: Number, default: 0 }
});

const Summary = mongoose.model("Summary", summarySchema);

/* ---------------- HOME PAGE ---------------- */
app.get("/", (req, res) => {
  res.send(`
    <style>
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
      h2 { color: #333; }
      .endpoint { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
      code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
    </style>
    <h2>🚀 AI Summarizer Backend is Running</h2>
    <p>Connected to MongoDB ✅</p>
    
    <div class="endpoint">
      <strong>POST /api/summarize</strong>
      <p>Save summary to database</p>
      <code>{ "url": "...", "title": "...", "summary": "...", "summaryType": "brief|detailed|bullets" }</code>
    </div>
    
    <div class="endpoint">
      <strong>GET /api/summaries</strong>
      <p>Get all saved summaries</p>
    </div>
    
    <div class="endpoint">
      <strong>GET /api/summaries/latest</strong>
      <p>Get latest summaries (limit 50)</p>
    </div>
    
    <div class="endpoint">
      <strong>DELETE /api/summaries/:id</strong>
      <p>Delete a specific summary</p>
    </div>
    
    <div class="endpoint">
      <strong>GET /api/health</strong>
      <p>Check API health and MongoDB connection</p>
    </div>
  `);
});

/* ---------------- HEALTH CHECK ---------------- */
app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    const summaryCount = await Summary.countDocuments();
    
    res.json({
      status: "healthy",
      mongodb: dbStatus,
      summaryCount: summaryCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ---------------- SAVE SUMMARY ---------------- */
app.post("/api/summarize", async (req, res) => {
  try {
    const { url, title, summary, summaryType = "brief" } = req.body;

    if (!url || !summary) {
      return res.status(400).json({ 
        error: "URL and summary are required" 
      });
    }

    const newSummary = new Summary({
      url,
      title: title || url,
      summary,
      summaryType,
      contentLength: summary.length,
      timestamp: new Date()
    });

    const savedSummary = await newSummary.save();

    console.log(`✅ Summary saved for: ${url.substring(0, 50)}...`);
    
    res.status(201).json({
      success: true,
      message: "Summary saved successfully",
      id: savedSummary._id,
      summary: savedSummary.summary,
      timestamp: savedSummary.timestamp
    });
  } catch (error) {
    console.error("❌ Error saving summary:", error);
    res.status(500).json({ error: "Failed to save summary" });
  }
});

/* ---------------- GET ALL SUMMARIES ---------------- */
app.get("/api/summaries", async (req, res) => {
  try {
    const summaries = await Summary.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .select('-__v');
    
    res.json({
      count: summaries.length,
      summaries: summaries
    });
  } catch (error) {
    console.error("❌ Error fetching summaries:", error);
    res.status(500).json({ error: "Failed to fetch summaries" });
  }
});

/* ---------------- GET LATEST SUMMARIES ---------------- */
app.get("/api/summaries/latest", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const summaries = await Summary.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('-__v');
    
    res.json(summaries);
  } catch (error) {
    console.error("❌ Error fetching latest summaries:", error);
    res.status(500).json({ error: "Failed to fetch summaries" });
  }
});

/* ---------------- DELETE SUMMARY ---------------- */
app.delete("/api/summaries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await Summary.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({ error: "Summary not found" });
    }
    
    res.json({
      success: true,
      message: "Summary deleted successfully"
    });
  } catch (error) {
    console.error("❌ Error deleting summary:", error);
    res.status(500).json({ error: "Failed to delete summary" });
  }
});

/* ---------------- ERROR HANDLING ---------------- */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

/* ---------------- START SERVER ---------------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 MongoDB: ${MONGODB_URI.split('@')[1]}`);
});


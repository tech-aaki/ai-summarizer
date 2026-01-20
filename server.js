const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;

// MongoDB Connection - UPDATE WITH YOUR CONNECTION STRING
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://summarizer_user:Aaki4321@summarizer-cluster.bm0ieqb.mongodb.net/summarizer_db?retryWrites=true&w=majority&appName=summarizer-cluster";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ MongoDB Connected Successfully!");
  console.log("📁 Database: summarizer_db");
  console.log("🗂️ Collection: summaries");
})
.catch(err => {
  console.error("❌ MongoDB Connection Error:", err);
  process.exit(1);
});

// Define Schema for Summaries
const summarySchema = new mongoose.Schema({
  url: { 
    type: String, 
    required: true,
    index: true 
  },
  pageTitle: { 
    type: String, 
    default: "" 
  },
  summaryText: { 
    type: String, 
    required: true 
  },
  summaryType: { 
    type: String, 
    enum: ['brief', 'detailed', 'bullets'],
    default: 'brief' 
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  extensionVersion: { 
    type: String, 
    default: "1.3" 
  },
  userAgent: { 
    type: String, 
    default: "" 
  },
  language: { 
    type: String, 
    default: "" 
  },
  contentLength: { 
    type: Number, 
    default: 0 
  },
  summaryLength: { 
    type: Number, 
    default: 0 
  },
  isArchived: { 
    type: Boolean, 
    default: false 
  },
  tags: [{ 
    type: String 
  }]
}, {
  timestamps: true
});

// Create indexes
summarySchema.index({ url: 1, timestamp: -1 });
summarySchema.index({ timestamp: -1 });
summarySchema.index({ summaryType: 1 });

const Summary = mongoose.model("Summary", summarySchema, "summaries");

/* ---------------- HOME PAGE ---------------- */
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          max-width: 900px; 
          margin: 0 auto; 
          padding: 30px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          padding: 30px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        h1 { 
          margin-top: 0; 
          display: flex;
          align-items: center;
          gap: 15px;
        }
        h1:before {
          content: "📝";
          font-size: 2em;
        }
        .endpoint {
          background: rgba(255, 255, 255, 0.15);
          padding: 20px;
          border-radius: 10px;
          margin: 15px 0;
          border-left: 5px solid #667eea;
        }
        code {
          background: rgba(0, 0, 0, 0.3);
          padding: 8px 12px;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          display: block;
          margin: 10px 0;
          overflow-x: auto;
        }
        a {
          color: #ffd54f;
          text-decoration: none;
          font-weight: bold;
        }
        a:hover {
          text-decoration: underline;
        }
        .btn {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          margin: 10px 5px;
          transition: all 0.3s;
        }
        .btn:hover {
          background: #764ba2;
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 AI Summarizer Backend API</h1>
        <p>Connected to MongoDB: <strong>${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}</strong></p>
        
        <h2>📊 Quick Links:</h2>
        <p>
          <a href="/data" class="btn">📋 View All Data</a>
          <a href="/api/health" class="btn">🩺 Health Check</a>
          <a href="/api/summaries" class="btn">🔗 JSON API</a>
        </p>
        
        <h2>🔧 Available Endpoints:</h2>
        
        <div class="endpoint">
          <h3>💾 Save Summary</h3>
          <p>POST <code>/api/summaries</code></p>
          <code>Content-Type: application/json</code>
          <code>{ "url": "...", "summaryText": "...", "summaryType": "brief" }</code>
        </div>
        
        <div class="endpoint">
          <h3>📋 Get All Summaries</h3>
          <p>GET <code>/api/summaries</code></p>
          <p>Query: <code>?page=1&limit=20&sort=-timestamp</code></p>
        </div>
        
        <div class="endpoint">
          <h3>📈 View Data Dashboard</h3>
          <p>GET <code>/data</code></p>
          <p>Beautiful web interface to view all saved summaries</p>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
          <p>Version 1.3 | Chrome Extension Backend</p>
          <p>Database: <strong>summarizer_db</strong> | Collection: <strong>summaries</strong></p>
        </div>
      </div>
    </body>
    </html>
  `);
});

/* ---------------- DATA DASHBOARD PAGE ---------------- */
app.get("/data", async (req, res) => {
  try {
    const summaries = await Summary.find()
      .sort({ timestamp: -1 })
      .select('-__v')
      .lean();
    
    const totalSummaries = summaries.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySummaries = summaries.filter(s => 
      new Date(s.timestamp) >= today
    ).length;
    
    const typeCounts = {};
    summaries.forEach(s => {
      typeCounts[s.summaryType] = (typeCounts[s.summaryType] || 0) + 1;
    });
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Summarizer - All Saved Data</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
            padding: 20px;
          }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { 
            background: rgba(255, 255, 255, 0.95); 
            padding: 30px; 
            border-radius: 15px; 
            margin-bottom: 30px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
            text-align: center; 
          }
          .header h1 { 
            color: #764ba2; 
            margin-bottom: 10px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 15px; 
          }
          .header h1:before { content: "📊"; font-size: 2em; }
          .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
          }
          .stat-card { 
            background: white; 
            padding: 20px; 
            border-radius: 10px; 
            box-shadow: 0 5px 15px rgba(0,0,0,0.08); 
            text-align: center; 
          }
          .stat-card .number { 
            font-size: 2.5em; 
            font-weight: bold; 
            color: #667eea; 
            margin-bottom: 5px; 
          }
          .stat-card .label { color: #666; font-size: 0.9em; }
          .controls { 
            display: flex; 
            gap: 15px; 
            justify-content: center; 
            margin-bottom: 30px; 
            flex-wrap: wrap; 
          }
          .btn { 
            padding: 12px 25px; 
            border: none; 
            border-radius: 8px; 
            background: #667eea; 
            color: white; 
            font-weight: 600; 
            cursor: pointer; 
            transition: all 0.3s; 
            display: flex; 
            align-items: center; 
            gap: 8px; 
            text-decoration: none; 
            font-size: 14px; 
          }
          .btn:hover { 
            background: #764ba2; 
            transform: translateY(-2px); 
            box-shadow: 0 5px 15px rgba(0,0,0,0.2); 
          }
          .btn-refresh { background: #4CAF50; }
          .btn-json { background: #FF9800; }
          .btn-back { background: #9C27B0; }
          .summaries-container { 
            background: white; 
            border-radius: 15px; 
            padding: 30px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
            margin-bottom: 30px; 
          }
          .summary-list { display: grid; gap: 20px; }
          .summary-card { 
            background: #f8f9fa; 
            border-radius: 10px; 
            padding: 20px; 
            border-left: 5px solid #667eea; 
            transition: all 0.3s; 
          }
          .summary-card:hover { 
            transform: translateY(-3px); 
            box-shadow: 0 5px 15px rgba(0,0,0,0.1); 
          }
          .summary-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 15px; 
            flex-wrap: wrap; 
            gap: 10px; 
          }
          .summary-title { 
            font-weight: bold; 
            color: #333; 
            font-size: 1.1em; 
            flex: 1; 
            min-width: 200px; 
          }
          .summary-url { 
            color: #667eea; 
            text-decoration: none; 
            font-size: 0.9em; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            max-width: 300px; 
            white-space: nowrap; 
          }
          .summary-url:hover { text-decoration: underline; }
          .summary-meta { 
            display: flex; 
            gap: 15px; 
            margin-bottom: 15px; 
            flex-wrap: wrap; 
          }
          .meta-item { 
            display: flex; 
            align-items: center; 
            gap: 5px; 
            background: rgba(102, 126, 234, 0.1); 
            padding: 5px 10px; 
            border-radius: 20px; 
            font-size: 0.85em; 
            color: #667eea; 
          }
          .summary-text { 
            background: white; 
            padding: 15px; 
            border-radius: 8px; 
            border: 1px solid #e0e0e0; 
            line-height: 1.6; 
            white-space: pre-wrap; 
            word-wrap: break-word; 
            max-height: 200px; 
            overflow-y: auto; 
            margin-top: 10px; 
            cursor: pointer; 
          }
          .type-badge { 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 0.8em; 
            font-weight: 600; 
            text-transform: uppercase; 
            margin-left: 10px; 
          }
          .type-brief { background: #E3F2FD; color: #1976D2; }
          .type-detailed { background: #E8F5E9; color: #388E3C; }
          .type-bullets { background: #FFF3E0; color: #F57C00; }
          .no-data { 
            text-align: center; 
            padding: 50px; 
            color: #666; 
          }
          .no-data-icon { font-size: 3em; margin-bottom: 20px; opacity: 0.5; }
          .timestamp { color: #666; font-size: 0.85em; }
          .copy-btn { 
            background: #2196F3; 
            color: white; 
            border: none; 
            padding: 5px 10px; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 0.8em; 
            margin-left: 10px; 
            transition: all 0.3s; 
          }
          .copy-btn:hover { background: #1976D2; }
          .copy-success { background: #4CAF50 !important; }
          footer { 
            text-align: center; 
            color: white; 
            padding: 20px; 
            opacity: 0.8; 
          }
          @media (max-width: 768px) {
            .header, .summaries-container { padding: 20px; }
            .summary-header { flex-direction: column; }
            .summary-url { max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AI Summarizer - All Saved Data</h1>
            <p>View all summaries saved from Chrome Extension</p>
          </div>
          
          <div class="stats">
            <div class="stat-card">
              <div class="number">${totalSummaries}</div>
              <div class="label">Total Summaries</div>
            </div>
            <div class="stat-card">
              <div class="number">${todaySummaries}</div>
              <div class="label">Today</div>
            </div>
            <div class="stat-card">
              <div class="number">${typeCounts.brief || 0}</div>
              <div class="label">Brief</div>
            </div>
            <div class="stat-card">
              <div class="number">${typeCounts.detailed || 0}</div>
              <div class="label">Detailed</div>
            </div>
            <div class="stat-card">
              <div class="number">${typeCounts.bullets || 0}</div>
              <div class="label">Bullet Points</div>
            </div>
          </div>
          
          <div class="controls">
            <button class="btn btn-refresh" onclick="location.reload()">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
            <a href="/api/summaries" target="_blank" class="btn btn-json">
              <i class="fas fa-code"></i> View JSON
            </a>
            <a href="/" class="btn btn-back">
              <i class="fas fa-home"></i> Home
            </a>
          </div>
          
          <div class="summaries-container">
            ${summaries.length === 0 ? `
              <div class="no-data">
                <div class="no-data-icon">📭</div>
                <h3>No summaries yet</h3>
                <p>Use the Chrome Extension to save your first summary!</p>
                <p style="margin-top: 20px; color: #667eea;">
                  <i class="fas fa-extension"></i> Install extension & start summarizing
                </p>
              </div>
            ` : `
              <h2 style="margin-bottom: 20px; color: #333;">Saved Summaries (${totalSummaries})</h2>
              <div class="summary-list">
                ${summaries.map((summary, index) => `
                  <div class="summary-card">
                    <div class="summary-header">
                      <div class="summary-title">
                        ${summary.pageTitle || 'Untitled Summary'}
                        <span class="type-badge type-${summary.summaryType || 'brief'}">
                          ${summary.summaryType || 'brief'}
                        </span>
                      </div>
                      <a href="${summary.url}" target="_blank" class="summary-url" title="${summary.url}">
                        <i class="fas fa-external-link-alt"></i> 
                        ${summary.url.length > 40 ? summary.url.substring(0, 40) + '...' : summary.url}
                      </a>
                    </div>
                    
                    <div class="summary-meta">
                      <span class="meta-item">
                        <i class="far fa-calendar"></i>
                        ${new Date(summary.timestamp).toLocaleDateString()}
                      </span>
                      <span class="meta-item">
                        <i class="far fa-clock"></i>
                        ${new Date(summary.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <span class="meta-item">
                        <i class="fas fa-ruler"></i>
                        ${summary.summaryLength || summary.summaryText.length} chars
                      </span>
                    </div>
                    
                    <div style="position: relative;">
                      <div class="summary-text" id="text-${summary._id}">
                        ${summary.summaryText}
                      </div>
                      <button class="copy-btn" onclick="copyText('${summary._id}')" id="copy-btn-${summary._id}">
                        <i class="far fa-copy"></i> Copy
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
        
        <footer>
          <p>AI Summarizer v1.3 | Database: summarizer_db | Powered by MongoDB & Render</p>
          <p style="font-size: 0.9em;">Data automatically saves from Chrome Extension</p>
        </footer>
        
        <script>
          function copyText(summaryId) {
            const textElement = document.getElementById('text-' + summaryId);
            const copyBtn = document.getElementById('copy-btn-' + summaryId);
            const text = textElement.textContent || textElement.innerText;
            
            navigator.clipboard.writeText(text).then(() => {
              const originalHtml = copyBtn.innerHTML;
              copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
              copyBtn.classList.add('copy-success');
              
              setTimeout(() => {
                copyBtn.innerHTML = originalHtml;
                copyBtn.classList.remove('copy-success');
              }, 2000);
            });
          }
          
          document.querySelectorAll('.summary-text').forEach(element => {
            element.addEventListener('click', function() {
              this.style.maxHeight = this.style.maxHeight === 'none' ? '200px' : 'none';
            });
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><style>body{font-family:Arial;text-align:center;padding:50px;}</style></head>
      <body>
        <h1>Error Loading Data</h1>
        <p>${error.message}</p>
        <a href="/">Go Home</a>
      </body>
      </html>
    `);
  }
});

/* ---------------- HEALTH CHECK ---------------- */
app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const statusText = {0:'disconnected',1:'connected',2:'connecting',3:'disconnecting'}[dbStatus];
    const summaryCount = await Summary.countDocuments();
    
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        name: mongoose.connection.db.databaseName,
        status: statusText,
        collections: (await mongoose.connection.db.listCollections().toArray()).map(c => c.name)
      },
      summaryCount: summaryCount,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ status: "unhealthy", error: error.message });
  }
});

/* ---------------- SAVE SUMMARY ---------------- */
app.post("/api/summaries", async (req, res) => {
  try {
    const { url, pageTitle = "", summaryText, summaryType = "brief", userAgent = "" } = req.body;
    
    if (!url || !summaryText) {
      return res.status(400).json({ error: "URL and summary text are required" });
    }
    
    const newSummary = new Summary({
      url: url,
      pageTitle: pageTitle || url,
      summaryText: summaryText.trim(),
      summaryType: summaryType,
      userAgent: userAgent,
      summaryLength: summaryText.length,
      tags: extractTags(summaryText)
    });
    
    const savedSummary = await newSummary.save();
    
    res.status(201).json({
      success: true,
      message: "Summary saved successfully",
      data: {
        id: savedSummary._id,
        url: savedSummary.url,
        summaryType: savedSummary.summaryType,
        timestamp: savedSummary.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to save summary" });
  }
});

/* ---------------- GET ALL SUMMARIES ---------------- */
app.get("/api/summaries", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const [summaries, total] = await Promise.all([
      Summary.find().sort('-timestamp').skip(skip).limit(limit).select('-__v').lean(),
      Summary.countDocuments()
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      pagination: { page, limit, total, totalPages },
      data: summaries
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch summaries" });
  }
});

/* ---------------- GET LATEST SUMMARIES ---------------- */
app.get("/api/summaries/latest", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const summaries = await Summary.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('url pageTitle summaryText summaryType timestamp')
      .lean();
    
    res.json({
      success: true,
      count: summaries.length,
      data: summaries
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch summaries" });
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
    
    res.json({ success: true, message: "Summary deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete" });
  }
});

/* ---------------- HELPER FUNCTIONS ---------------- */
function extractTags(text) {
  const tags = [];
  const words = text.toLowerCase().split(/\s+/);
  const keywordTags = ['ai', 'tech', 'news', 'article', 'research', 'business'];
  
  keywordTags.forEach(tag => {
    if (text.toLowerCase().includes(tag)) tags.push(tag);
  });
  
  return tags.slice(0, 3);
}

/* ---------------- START SERVER ---------------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Web Dashboard: http://localhost:${PORT}/data`);
  console.log(`📊 View all data: http://localhost:${PORT}/data`);
});

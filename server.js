const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://summarizer_user:Aaki4321@summarizer-cluster.bm0ieqb.mongodb.net/summarizer_db?retryWrites=true&w=majority&appName=summarizer-cluster";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ MongoDB Connected Successfully!");
  console.log("📁 Database: summarizer_db");
  console.log("🗂️ Collections: summaries, voice_sessions");
})
.catch(err => {
  console.error("❌ MongoDB Connection Error:", err);
  process.exit(1);
});

// ============= UPDATED SCHEMA FOR VOICE & SUMMARY DATA =============

// Main summary schema (existing)
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
    enum: ['brief', 'detailed', 'bullets', 'voice_and_summary'],
    default: 'brief' 
  },
  // NEW FIELDS for voice data
  voiceText: {
    type: String,
    default: ""
  },
  voiceLength: {
    type: Number,
    default: 0
  },
  sessionType: {
    type: String,
    enum: ['summary_only', 'voice_only', 'dual'],
    default: 'summary_only'
  },
  sessionDuration: {
    type: Number,
    default: 0
  },
  // END NEW FIELDS
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  extensionVersion: { 
    type: String, 
    default: "1.1" 
  },
  userAgent: { 
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
summarySchema.index({ sessionType: 1 }); // NEW INDEX

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
          content: "🤖🎤";
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
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .stat-box {
          background: rgba(255, 255, 255, 0.15);
          padding: 15px;
          border-radius: 10px;
          text-align: center;
        }
        .stat-number {
          font-size: 2em;
          font-weight: bold;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖🎤 AI Voice & Summary Backend</h1>
        <p>Connected to MongoDB: <strong>${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}</strong></p>
        
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-number" id="totalCount">Loading...</div>
            <div>Total Sessions</div>
          </div>
          <div class="stat-box">
            <div class="stat-number" id="voiceCount">Loading...</div>
            <div>Voice Sessions</div>
          </div>
          <div class="stat-box">
            <div class="stat-number" id="todayCount">Loading...</div>
            <div>Today</div>
          </div>
        </div>
        
        <h2>📊 Quick Links:</h2>
        <p>
          <a href="/data" class="btn">📋 View All Data</a>
          <a href="/api/health" class="btn">🩺 Health Check</a>
          <a href="/api/summaries" class="btn">🔗 JSON API</a>
          <a href="/api/voice-sessions" class="btn">🎤 Voice Data</a>
        </p>
        
        <h2>🔧 Available Endpoints:</h2>
        
        <div class="endpoint">
          <h3>💾 Save Voice & Summary Session</h3>
          <p>POST <code>/api/summaries</code></p>
          <code>Content-Type: application/json</code>
          <code>{ 
  "url": "...", 
  "summaryText": "...", 
  "voiceText": "...",
  "summaryType": "voice_and_summary",
  "sessionType": "dual"
}</code>
        </div>
        
        <div class="endpoint">
          <h3>📋 Get All Sessions</h3>
          <p>GET <code>/api/summaries</code></p>
          <p>Query: <code>?page=1&limit=20&type=dual</code></p>
        </div>
        
        <div class="endpoint">
          <h3>🎤 Get Voice Sessions Only</h3>
          <p>GET <code>/api/summaries/voice</code></p>
          <p>Filter sessions with voice data</p>
        </div>
        
        <div class="endpoint">
          <h3>📈 View Data Dashboard</h3>
          <p>GET <code>/data</code></p>
          <p>Beautiful web interface to view all saved data</p>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
          <p>Version 1.1 | Chrome Extension Backend</p>
          <p>Database: <strong>summarizer_db</strong> | Collection: <strong>summaries</strong></p>
          <p>Now supports: 🤖 AI Summary + 🎤 Voice Typing</p>
        </div>
      </div>
      
      <script>
        // Load stats
        async function loadStats() {
          try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            document.getElementById('totalCount').textContent = data.totalSessions || 0;
            document.getElementById('voiceCount').textContent = data.voiceSessions || 0;
            document.getElementById('todayCount').textContent = data.todaySessions || 0;
          } catch (error) {
            console.error('Stats load error:', error);
          }
        }
        
        loadStats();
      </script>
    </body>
    </html>
  `);
});

/* ---------------- DATA DASHBOARD PAGE ---------------- */
app.get("/data", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const [sessions, total] = await Promise.all([
      Summary.find()
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      Summary.countDocuments()
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySessions = sessions.filter(s => 
      new Date(s.timestamp) >= today
    ).length;
    
    const voiceSessions = sessions.filter(s => 
      s.sessionType === 'dual' || s.sessionType === 'voice_only' || s.voiceText
    ).length;
    
    const summarySessions = sessions.filter(s => 
      s.sessionType === 'summary_only'
    ).length;
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Voice & Summary - All Saved Data</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
            color: #e8eaed;
            min-height: 100vh;
            padding: 20px;
          }
          .container { max-width: 1400px; margin: 0 auto; }
          .header { 
            background: rgba(255, 255, 255, 0.1); 
            padding: 30px; 
            border-radius: 15px; 
            margin-bottom: 30px; 
            text-align: center; 
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .header h1 { 
            color: #8ab4f8; 
            margin-bottom: 10px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 15px; 
          }
          .header h1:before { content: "🤖🎤"; font-size: 2em; }
          .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
          }
          .stat-card { 
            background: rgba(255, 255, 255, 0.1); 
            padding: 20px; 
            border-radius: 10px; 
            text-align: center; 
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(5px);
          }
          .stat-card .number { 
            font-size: 2.5em; 
            font-weight: bold; 
            color: #8ab4f8; 
            margin-bottom: 5px; 
          }
          .stat-card .label { color: #bdc1c6; font-size: 0.9em; }
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
            background: #4285f4; 
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
            background: #3367d6; 
            transform: translateY(-2px); 
          }
          .btn-voice { background: #ea4335; }
          .btn-voice:hover { background: #d93025; }
          .btn-summary { background: #34a853; }
          .btn-summary:hover { background: #2e7d32; }
          .btn-json { background: #fbbc05; color: #202124; }
          .btn-json:hover { background: #f57c00; }
          
          .sessions-container { 
            background: rgba(255, 255, 255, 0.05); 
            border-radius: 15px; 
            padding: 30px; 
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 30px; 
          }
          .session-list { display: grid; gap: 20px; }
          .session-card { 
            background: rgba(41, 42, 45, 0.9); 
            border-radius: 10px; 
            padding: 20px; 
            border-left: 5px solid #4285f4; 
            transition: all 0.3s; 
            border: 1px solid #5f6368;
          }
          .session-card.voice-session { border-left-color: #ea4335; }
          .session-card.summary-session { border-left-color: #34a853; }
          .session-card.dual-session { border-left-color: #9c27b0; }
          .session-card:hover { 
            transform: translateY(-3px); 
            box-shadow: 0 5px 15px rgba(0,0,0,0.3); 
          }
          .session-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 15px; 
            flex-wrap: wrap; 
            gap: 10px; 
          }
          .session-title { 
            font-weight: bold; 
            color: #e8eaed; 
            font-size: 1.1em; 
            flex: 1; 
            min-width: 200px; 
          }
          .session-url { 
            color: #8ab4f8; 
            text-decoration: none; 
            font-size: 0.9em; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            max-width: 300px; 
            white-space: nowrap; 
          }
          .session-url:hover { text-decoration: underline; }
          .session-meta { 
            display: flex; 
            gap: 15px; 
            margin-bottom: 15px; 
            flex-wrap: wrap; 
          }
          .meta-item { 
            display: flex; 
            align-items: center; 
            gap: 5px; 
            background: rgba(66, 133, 244, 0.1); 
            padding: 5px 10px; 
            border-radius: 20px; 
            font-size: 0.85em; 
            color: #8ab4f8; 
          }
          .meta-item.voice { background: rgba(234, 67, 53, 0.1); color: #f28b82; }
          .meta-item.summary { background: rgba(52, 168, 83, 0.1); color: #81c995; }
          .session-content { display: grid; gap: 15px; }
          .content-section { 
            background: #202124; 
            padding: 15px; 
            border-radius: 8px; 
            border: 1px solid #5f6368; 
          }
          .content-section h4 { 
            margin: 0 0 10px 0; 
            color: #8ab4f8; 
            display: flex; 
            align-items: center; 
            gap: 8px; 
          }
          .content-text { 
            line-height: 1.6; 
            white-space: pre-wrap; 
            word-wrap: break-word; 
            max-height: 150px; 
            overflow-y: auto; 
            font-size: 0.9em; 
            cursor: pointer; 
            transition: max-height 0.3s;
          }
          .content-text.expanded { max-height: none; }
          .type-badge { 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 0.8em; 
            font-weight: 600; 
            text-transform: uppercase; 
            margin-left: 10px; 
          }
          .type-voice_only { background: #5c2b29; color: #f28b82; }
          .type-summary_only { background: #1e3a24; color: #81c995; }
          .type-dual { background: #4a235a; color: #d7aefb; }
          .copy-btn { 
            background: #4285f4; 
            color: white; 
            border: none; 
            padding: 5px 10px; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 0.8em; 
            margin-top: 10px; 
            transition: all 0.3s; 
          }
          .copy-btn:hover { background: #3367d6; }
          .copy-success { background: #34a853 !important; }
          .pagination { 
            display: flex; 
            justify-content: center; 
            gap: 10px; 
            margin-top: 20px; 
          }
          .page-btn { 
            padding: 8px 15px; 
            background: #5f6368; 
            color: white; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
          }
          .page-btn.active { background: #4285f4; }
          .page-btn:hover { background: #3367d6; }
          footer { 
            text-align: center; 
            color: #9aa0a6; 
            padding: 20px; 
            opacity: 0.8; 
          }
          
          @media (max-width: 768px) {
            .header, .sessions-container { padding: 20px; }
            .session-header { flex-direction: column; }
            .session-url { max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AI Voice & Summary - All Saved Sessions</h1>
            <p>View all sessions saved from Chrome Extension</p>
          </div>
          
          <div class="stats">
            <div class="stat-card">
              <div class="number">${total}</div>
              <div class="label">Total Sessions</div>
            </div>
            <div class="stat-card">
              <div class="number">${voiceSessions}</div>
              <div class="label">Voice Sessions</div>
            </div>
            <div class="stat-card">
              <div class="number">${summarySessions}</div>
              <div class="label">Summary Only</div>
            </div>
            <div class="stat-card">
              <div class="number">${todaySessions}</div>
              <div class="label">Today</div>
            </div>
          </div>
          
          <div class="controls">
            <button class="btn" onclick="location.reload()">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
            <a href="/api/summaries" target="_blank" class="btn btn-json">
              <i class="fas fa-code"></i> JSON API
            </a>
            <a href="/" class="btn">
              <i class="fas fa-home"></i> Home
            </a>
            <button class="btn btn-voice" onclick="filterSessions('voice')">
              <i class="fas fa-microphone"></i> Voice Only
            </button>
            <button class="btn btn-summary" onclick="filterSessions('summary')">
              <i class="fas fa-file-alt"></i> Summary Only
            </button>
          </div>
          
          <div class="sessions-container">
            ${sessions.length === 0 ? `
              <div style="text-align: center; padding: 50px; color: #9aa0a6;">
                <div style="font-size: 3em; margin-bottom: 20px;">📭</div>
                <h3>No sessions yet</h3>
                <p>Use the Chrome Extension to save your first session!</p>
              </div>
            ` : `
              <h2 style="margin-bottom: 20px; color: #e8eaed;">
                <i class="fas fa-history"></i> Recent Sessions (${sessions.length} of ${total})
              </h2>
              
              ${sessions.map((session, index) => {
                const sessionClass = session.sessionType === 'dual' ? 'dual-session' : 
                                    session.sessionType === 'voice_only' ? 'voice-session' : 'summary-session';
                const typeText = session.sessionType === 'dual' ? 'Voice + Summary' : 
                                session.sessionType === 'voice_only' ? 'Voice Only' : 'Summary Only';
                const typeClass = session.sessionType === 'dual' ? 'type-dual' : 
                                 session.sessionType === 'voice_only' ? 'type-voice_only' : 'type-summary_only';
                
                return `
                  <div class="session-card ${sessionClass}" id="session-${session._id}">
                    <div class="session-header">
                      <div class="session-title">
                        ${session.pageTitle || 'Untitled Session'}
                        <span class="type-badge ${typeClass}">
                          ${typeText}
                        </span>
                      </div>
                      <a href="${session.url}" target="_blank" class="session-url" title="${session.url}">
                        <i class="fas fa-external-link-alt"></i> 
                        ${session.url.length > 40 ? session.url.substring(0, 40) + '...' : session.url}
                      </a>
                    </div>
                    
                    <div class="session-meta">
                      <span class="meta-item">
                        <i class="far fa-calendar"></i>
                        ${new Date(session.timestamp).toLocaleDateString()}
                      </span>
                      <span class="meta-item">
                        <i class="far fa-clock"></i>
                        ${new Date(session.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      ${session.voiceLength > 0 ? `
                        <span class="meta-item voice">
                          <i class="fas fa-microphone"></i>
                          ${session.voiceLength} chars
                        </span>
                      ` : ''}
                      ${session.summaryLength > 0 ? `
                        <span class="meta-item summary">
                          <i class="fas fa-file-alt"></i>
                          ${session.summaryLength} chars
                        </span>
                      ` : ''}
                      ${session.sessionDuration > 0 ? `
                        <span class="meta-item">
                          <i class="fas fa-hourglass-half"></i>
                          ${Math.round(session.sessionDuration / 1000)}s
                        </span>
                      ` : ''}
                    </div>
                    
                    <div class="session-content">
                      ${session.summaryText ? `
                        <div class="content-section">
                          <h4><i class="fas fa-file-alt"></i> AI Summary</h4>
                          <div class="content-text" id="summary-${session._id}">
                            ${session.summaryText}
                          </div>
                          <button class="copy-btn" onclick="copyText('summary-${session._id}', this)">
                            <i class="far fa-copy"></i> Copy Summary
                          </button>
                        </div>
                      ` : ''}
                      
                      ${session.voiceText ? `
                        <div class="content-section">
                          <h4><i class="fas fa-microphone"></i> Voice Text</h4>
                          <div class="content-text" id="voice-${session._id}">
                            ${session.voiceText}
                          </div>
                          <button class="copy-btn" onclick="copyText('voice-${session._id}', this)">
                            <i class="far fa-copy"></i> Copy Voice
                          </button>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
              
              ${totalPages > 1 ? `
                <div class="pagination">
                  ${Array.from({length: totalPages}, (_, i) => i + 1)
                    .map(pageNum => `
                      <button class="page-btn ${pageNum === page ? 'active' : ''}" 
                              onclick="window.location.href='/data?page=${pageNum}&limit=${limit}'">
                        ${pageNum}
                      </button>
                    `).join('')}
                </div>
              ` : ''}
            `}
          </div>
        </div>
        
        <footer>
          <p>AI Voice & Summary v1.1 | Database: summarizer_db | Powered by MongoDB & Render</p>
          <p style="font-size: 0.9em;">Data saves automatically from Chrome Extension</p>
        </footer>
        
        <script>
          function copyText(elementId, button) {
            const textElement = document.getElementById(elementId);
            const text = textElement.textContent || textElement.innerText;
            
            navigator.clipboard.writeText(text).then(() => {
              const originalHtml = button.innerHTML;
              button.innerHTML = '<i class="fas fa-check"></i> Copied!';
              button.classList.add('copy-success');
              
              setTimeout(() => {
                button.innerHTML = originalHtml;
                button.classList.remove('copy-success');
              }, 2000);
            });
          }
          
          document.querySelectorAll('.content-text').forEach(element => {
            element.addEventListener('click', function() {
              this.classList.toggle('expanded');
            });
          });
          
          function filterSessions(type) {
            window.location.href = '/api/summaries?sessionType=' + 
              (type === 'voice' ? 'voice_only,dual' : 
               type === 'summary' ? 'summary_only' : '');
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><style>body{font-family:Arial;text-align:center;padding:50px;background:#f1f3f4;}</style></head>
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
    const totalSessions = await Summary.countDocuments();
    const voiceSessions = await Summary.countDocuments({ 
      $or: [
        { sessionType: 'voice_only' },
        { sessionType: 'dual' },
        { voiceText: { $ne: "" } }
      ] 
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySessions = await Summary.countDocuments({ timestamp: { $gte: today } });
    
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        name: mongoose.connection.db.databaseName,
        status: statusText,
        collections: (await mongoose.connection.db.listCollections().toArray()).map(c => c.name)
      },
      statistics: {
        totalSessions: totalSessions,
        voiceSessions: voiceSessions,
        todaySessions: todaySessions
      },
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ status: "unhealthy", error: error.message });
  }
});

/* ---------------- STATS ENDPOINT ---------------- */
app.get("/api/stats", async (req, res) => {
  try {
    const totalSessions = await Summary.countDocuments();
    const voiceSessions = await Summary.countDocuments({ 
      $or: [
        { sessionType: 'voice_only' },
        { sessionType: 'dual' },
        { voiceText: { $ne: "" } }
      ] 
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySessions = await Summary.countDocuments({ timestamp: { $gte: today } });
    
    res.json({
      success: true,
      totalSessions: totalSessions,
      voiceSessions: voiceSessions,
      todaySessions: todaySessions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ---------------- SAVE SESSION ---------------- */
app.post("/api/summaries", async (req, res) => {
  try {
    const { 
      url, 
      pageTitle = "", 
      summaryText, 
      voiceText = "",
      summaryType = "brief", 
      sessionType = "summary_only",
      userAgent = "",
      sessionDuration = 0,
      voiceLength = 0,
      summaryLength = 0
    } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    
    // Determine session type if not provided
    let finalSessionType = sessionType;
    if (!sessionType) {
      if (voiceText && summaryText) {
        finalSessionType = 'dual';
      } else if (voiceText) {
        finalSessionType = 'voice_only';
      } else {
        finalSessionType = 'summary_only';
      }
    }
    
    const newSession = new Summary({
      url: url,
      pageTitle: pageTitle || url,
      summaryText: summaryText || "",
      voiceText: voiceText || "",
      summaryType: summaryType,
      sessionType: finalSessionType,
      userAgent: userAgent,
      voiceLength: voiceLength || (voiceText ? voiceText.length : 0),
      summaryLength: summaryLength || (summaryText ? summaryText.length : 0),
      sessionDuration: sessionDuration || 0,
      tags: extractTags(summaryText, voiceText)
    });
    
    const savedSession = await newSession.save();
    
    res.status(201).json({
      success: true,
      message: "Session saved successfully",
      data: {
        id: savedSession._id,
        url: savedSession.url,
        sessionType: savedSession.sessionType,
        timestamp: savedSession.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to save session: " + error.message });
  }
});

/* ---------------- GET ALL SESSIONS ---------------- */
app.get("/api/summaries", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const sessionType = req.query.sessionType;
    
    // Build query
    const query = {};
    if (sessionType) {
      const types = sessionType.split(',');
      if (types.length === 1) {
        query.sessionType = types[0];
      } else {
        query.sessionType = { $in: types };
      }
    }
    
    const [sessions, total] = await Promise.all([
      Summary.find(query)
        .sort('-timestamp')
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      Summary.countDocuments(query)
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      pagination: { page, limit, total, totalPages },
      data: sessions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch sessions" });
  }
});

/* ---------------- GET VOICE SESSIONS ---------------- */
app.get("/api/summaries/voice", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const sessions = await Summary.find({
      $or: [
        { sessionType: 'voice_only' },
        { sessionType: 'dual' },
        { voiceText: { $ne: "" } }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('url pageTitle summaryText voiceText sessionType timestamp')
    .lean();
    
    res.json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch voice sessions" });
  }
});

/* ---------------- GET LATEST SESSIONS ---------------- */
app.get("/api/summaries/latest", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const sessions = await Summary.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('url pageTitle summaryText voiceText sessionType timestamp summaryLength voiceLength')
      .lean();
    
    res.json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch sessions" });
  }
});

/* ---------------- DELETE SESSION ---------------- */
app.delete("/api/summaries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Summary.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    res.json({ success: true, message: "Session deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete" });
  }
});

/* ---------------- HELPER FUNCTIONS ---------------- */
function extractTags(summaryText, voiceText) {
  const tags = [];
  const fullText = (summaryText || "") + " " + (voiceText || "");
  const keywordTags = ['ai', 'voice', 'summary', 'article', 'research', 'tech', 'news'];
  
  keywordTags.forEach(tag => {
    if (fullText.toLowerCase().includes(tag)) tags.push(tag);
  });
  
  return tags.slice(0, 3);
}

/* ---------------- START SERVER ---------------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Web Dashboard: http://localhost:${PORT}/data`);
  console.log(`🤖🎤 Now supports Voice & Summary sessions!`);
  console.log(`📊 View all data: http://localhost:${PORT}/data`);
  console.log(`🔗 JSON API: http://localhost:${PORT}/api/summaries`);
});

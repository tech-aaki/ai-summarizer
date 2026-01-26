import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration for Chrome extension
app.use(cors({
  origin: [
    'chrome-extension://*', // Allow all Chrome extensions
    'https://ai-summarizer-5tdj.onrender.com' // Your Render domain
  ],
  credentials: true
}));

app.use(express.json());

const HISTORY_FILE = path.join(__dirname, 'history.json');

// Initialize history
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, '[]');
}

let historyCache = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8') || '[]');

// Save history
const saveHistory = () => {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyCache, null, 2));
};

// Add to history
const addToHistory = (sessionId, question, answer) => {
  const newEntry = {
    sessionId,
    question,
    answer,
    time: new Date().toISOString()
  };
  historyCache.push(newEntry);
  
  // Keep only last 1000 entries to prevent large file
  if (historyCache.length > 1000) {
    historyCache = historyCache.slice(-500);
  }
  
  saveHistory();
  return newEntry;
};

// Get session history
const getSessionHistory = (sessionId) => {
  return historyCache.filter(entry => entry.sessionId === sessionId);
};

// Clear session history
const clearSessionHistory = (sessionId) => {
  const initialCount = historyCache.length;
  historyCache = historyCache.filter(entry => entry.sessionId !== sessionId);
  saveHistory();
  return initialCount - historyCache.length;
};

// SMART RESPONSE FUNCTION
const getSmartResponse = (question) => {
  const lowerQ = question.toLowerCase();
  
  // Common questions with smart responses
  const responses = {
    greetings: /hello|hi|hey|greetings/i,
    howareyou: /how are you|how do you do/i,
    name: /your name|who are you/i,
    capabilities: /what can you do|your capabilities|your functions/i,
    javascript: /javascript|js/i,
    python: /python/i,
    html: /html/i,
    css: /css/i,
    time: /time|date|current time/i,
    joke: /joke|funny/i,
    goodbye: /bye|goodbye|see you/i,
    thanks: /thank|thanks/i,
    help: /help|support/i
  };

  if (responses.greetings.test(lowerQ)) {
    return "Hello! 👋 I'm your AI Assistant Chrome Extension. How can I help you today?";
  }
  
  if (responses.howareyou.test(lowerQ)) {
    return "I'm doing great! Always ready to help you. How about you?";
  }
  
  if (responses.name.test(lowerQ)) {
    return "I'm AI Chrome Assistant! You can call me ChatBot. 🤖";
  }
  
  if (responses.capabilities.test(lowerQ)) {
    return "I can:\n• Answer questions\n• Summarize web pages\n• Explain concepts\n• Help with coding\n• Provide web assistance\n• Chat with you anywhere!";
  }
  
  if (responses.javascript.test(lowerQ)) {
    return "JavaScript is a programming language for web development. It makes websites interactive and dynamic! 🚀";
  }
  
  if (responses.time.test(lowerQ)) {
    return `Current time: ${new Date().toLocaleTimeString()} | Date: ${new Date().toDateString()}`;
  }
  
  if (responses.joke.test(lowerQ)) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
      "Why did the developer go broke? Because he used up all his cache! 💰",
      "What's a programmer's favorite hangout place? The Foo Bar! 🍻"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  
  if (responses.goodbye.test(lowerQ)) {
    return "Goodbye! Have a wonderful day! 👋";
  }
  
  if (responses.thanks.test(lowerQ)) {
    return "You're welcome! 😊 Happy to help!";
  }
  
  if (responses.help.test(lowerQ)) {
    return "I can help with:\n• Answering questions\n• Explaining concepts\n• Coding help\n• Summarization\n• General knowledge\nJust ask me anything!";
  }
  
  // If question starts with what/how/why
  if (lowerQ.match(/^(what|how|why|when|where|who)\s/i)) {
    const topic = question.split(' ').slice(0, 3).join(' ');
    return `That's an interesting question about "${topic}". I can help explain this to you. Would you like more details?`;
  }
  
  // Default response
  return `I understand you're asking about "${question}". That's a great question! I'm here to help. Could you be more specific or ask about something else?`;
};

// Try to use Groq API, fallback to smart responses
const getAIResponse = async (question) => {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant in a Chrome extension. Keep responses concise and friendly. 2-3 sentences maximum.'
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': 'Bearer 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',
          'Content-Type': 'application/json'
        },
        timeout: 8000
      }
    );
    
    console.log('✅ Groq API Success!');
    return response.data.choices[0].message.content.trim();
    
  } catch (error) {
    console.log('❌ Groq API failed, using smart response');
    return getSmartResponse(question);
  }
};

// API Endpoints
app.get('/', (req, res) => {
  res.json({
    status: '✅ AI ChatBot Backend is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      chat: 'POST /chat',
      history: 'GET /history/:sessionId',
      clearHistory: 'DELETE /history/:sessionId',
      health: 'GET /health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    historyCount: historyCache.length,
    message: 'AI ChatBot Backend is ready!'
  });
});

app.get('/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionHistory = getSessionHistory(sessionId);
    res.json({
      success: true,
      count: sessionHistory.length,
      history: sessionHistory
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.delete('/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const clearedCount = clearSessionHistory(sessionId);
    res.json({
      success: true,
      cleared: clearedCount,
      message: `Cleared ${clearedCount} messages`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// MAIN CHAT ENDPOINT
app.post('/chat', async (req, res) => {
  try {
    const { question, sessionId = 'default' } = req.body;
    
    if (!question || question.trim() === '') {
      return res.json({
        success: false,
        reply: 'Please type a question.'
      });
    }
    
    const cleanQuestion = question.trim();
    console.log(`💬 Question from ${sessionId}: "${cleanQuestion}"`);
    
    // Get response
    const reply = await getAIResponse(cleanQuestion);
    console.log(`🤖 Response sent`);
    
    // Save to history
    addToHistory(sessionId, cleanQuestion, reply);
    
    res.json({
      success: true,
      reply: reply,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.json({
      success: true,
      reply: getSmartResponse(req.body?.question || 'Hello'),
      sessionId: req.body?.sessionId || 'default'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║     🤖 AI CHAT BOT BACKEND           ║
╠══════════════════════════════════════╣
║ 🚀 PORT: ${PORT}                     ║
║ 🌐 URL: https://ai-summarizer-5tdj.onrender.com ║
║ ✅ Status: RUNNING                   ║
║ 💬 Endpoint: POST /chat              ║
╚══════════════════════════════════════╝
`);
});
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ==================== SINGLE API KEY DECLARATION ====================
const GROQ_API_KEY = process.env.GROQ_API_KEY;
console.log('🔑 Groq API Key Status:', GROQ_API_KEY ? '✓ Loaded' : '✗ Missing');

// ==================== CONFIGURATION ====================
const PORT = process.env.PORT || 3000;
const HISTORY_FILE = path.join(__dirname, 'history.json');

// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for Chrome extension
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== MEDICAL KNOWLEDGE BASE ====================
const MEDICAL_KNOWLEDGE = {
  fever: {
    symptoms: [
      "Elevated body temperature (above 100.4°F or 38°C)",
      "Chills and shivering",
      "Headache",
      "Muscle aches",
      "Loss of appetite",
      "Dehydration",
      "General weakness",
      "Sweating"
    ],
    treatment: [
      "Rest and get plenty of sleep",
      "Drink fluids to stay hydrated",
      "Take fever reducers like acetaminophen or ibuprofen",
      "Use cool compresses",
      "Wear lightweight clothing",
      "Take lukewarm baths"
    ],
    emergency: [
      "Fever above 103°F (39.4°C)",
      "Fever lasting more than 3 days",
      "Severe headache",
      "Stiff neck",
      "Confusion",
      "Difficulty breathing"
    ]
  },
  headache: {
    types: ["Tension", "Migraine", "Cluster", "Sinus"],
    remedies: ["Rest in dark room", "Hydration", "Cold compress", "Pain relievers"],
    warning: ["Sudden severe headache", "Headache after injury", "Fever with headache"]
  },
  cough: {
    types: ["Dry", "Wet/Productive", "Chronic"],
    remedies: ["Honey", "Steam inhalation", "Hydration", "Cough drops"],
    duration: "See doctor if cough lasts >3 weeks"
  }
};

// ==================== CAR KNOWLEDGE BASE ====================
const CAR_KNOWLEDGE = {
  bmw_m8: {
    engine: "4.4-liter Twin-Turbo V8",
    horsepower: "617-625 hp",
    torque: "553 lb-ft",
    acceleration: "0-60 mph in 3.0 seconds",
    top_speed: "155-190 mph",
    transmission: "8-speed automatic",
    price: "$133,000 - $160,000",
    features: [
      "M xDrive all-wheel drive",
      "Carbon fiber roof",
      "M Sport exhaust system",
      "20-inch alloy wheels",
      "Merino leather interior"
    ]
  }
};

// ==================== HISTORY MANAGEMENT ====================
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, '[]');
}

let historyCache = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8') || '[]');

const saveHistory = () => {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyCache, null, 2));
};

const addToHistory = (sessionId, question, answer) => {
  const newEntry = {
    sessionId,
    question,
    answer,
    time: new Date().toISOString()
  };
  historyCache.push(newEntry);
  
  if (historyCache.length > 1000) {
    historyCache = historyCache.slice(-500);
  }
  
  saveHistory();
  return newEntry;
};

const getSessionHistory = (sessionId) => {
  return historyCache.filter(entry => entry.sessionId === sessionId);
};

const clearSessionHistory = (sessionId) => {
  const initialCount = historyCache.length;
  historyCache = historyCache.filter(entry => entry.sessionId !== sessionId);
  saveHistory();
  return initialCount - historyCache.length;
};

// ==================== LOCAL RESPONSE GENERATOR ====================
const getLocalResponse = (question) => {
  const lowerQ = question.toLowerCase().trim();
  
  // Medical queries
  if (lowerQ.includes('fever')) {
    if (lowerQ.includes('symptom')) {
      return `🤒 **Fever Symptoms:**\n${MEDICAL_KNOWLEDGE.fever.symptoms.map(s => `• ${s}`).join('\n')}\n\n⚠️ **Emergency signs:**\n${MEDICAL_KNOWLEDGE.fever.emergency.map(e => `• ${e}`).join('\n')}`;
    }
    return `🌡️ **Fever Treatment:**\n${MEDICAL_KNOWLEDGE.fever.treatment.map(t => `• ${t}`).join('\n')}\n\n*I'm an AI assistant, not a doctor. For medical advice, consult a healthcare professional.*`;
  }
  
  if (lowerQ.includes('headache')) {
    return `🤕 **Headache Info:**\n**Types:** ${MEDICAL_KNOWLEDGE.headache.types.join(', ')}\n\n**Remedies:**\n${MEDICAL_KNOWLEDGE.headache.remedies.map(r => `• ${r}`).join('\n')}`;
  }
  
  if (lowerQ.includes('cough')) {
    return `🤧 **Cough Info:**\n**Types:** ${MEDICAL_KNOWLEDGE.cough.types.join(', ')}\n\n**Remedies:**\n${MEDICAL_KNOWLEDGE.cough.remedies.map(r => `• ${r}`).join('\n')}\n\n${MEDICAL_KNOWLEDGE.cough.duration}`;
  }
  
  // Car queries
  if (lowerQ.includes('bmw') && lowerQ.includes('m8')) {
    const car = CAR_KNOWLEDGE.bmw_m8;
    return `🏎️ **BMW M8:**\n• Engine: ${car.engine}\n• Power: ${car.horsepower}\n• 0-60: ${car.acceleration}\n• Price: ${car.price}\n• Features: ${car.features.slice(0, 3).join(', ')}`;
  }
  
  // Greetings
  if (/hello|hi|hey/i.test(lowerQ)) {
    return "Hello! 👋 I'm your MediCar Assistant 🏥🚗\n\nI specialize in:\n• Medical information (fever, headache, cough)\n• Car specifications (BMW M8)\n• General questions\n\nHow can I help?";
  }
  
  if (/how are you/i.test(lowerQ)) {
    return "I'm doing great! Ready to provide medical info or answer questions. How about you?";
  }
  
  if (/your name|who are you/i.test(lowerQ)) {
    return "I'm **MediCar Assistant**! 🤖 I combine medical knowledge with car expertise.";
  }
  
  if (/what can you do/i.test(lowerQ)) {
    return "**I can help with:**\n🏥 Medical Info: Fever, headache, cough\n🚗 Car Details: BMW M8 specs\n💬 General Questions\n📝 Web page summarization\n\nTry: 'fever symptoms' or 'BMW M8 engine'";
  }
  
  return `I understand you're asking about "${question}".\n\nI specialize in medical information and car details. Could you be more specific?`;
};

// ==================== GROQ API CALLER (USES SINGLE API KEY) ====================
const callGroqAPI = async (question) => {
  // Only one place in backend where we use GROQ_API_KEY
  if (!GROQ_API_KEY) {
    console.log('⚠️ Groq API key not available, using local response');
    return null;
  }
  
  try {
    console.log('🌐 Calling Groq API...');
    
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are MediCar Assistant, specialized in medical information and car details.
            
            MEDICAL EXPERTISE:
            - Provide accurate medical information with disclaimers
            - Never diagnose, only inform
            - Include emergency warnings when relevant
            - Use simple, clear language
            
            CAR EXPERTISE:
            - Provide technical specifications accurately
            - Compare features when asked
            - Give practical advice
            
            GENERAL:
            - Be friendly and helpful
            - Use bullet points for lists
            - Add relevant emojis
            - Keep responses under 300 words`
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`, // Single API key usage
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    
    console.log('✅ Groq API Success');
    return response.data.choices[0].message.content.trim();
    
  } catch (error) {
    console.error('❌ Groq API Error:', error.message);
    return null;
  }
};

// ==================== MAIN RESPONSE HANDLER ====================
const getAIResponse = async (question) => {
  const lowerQ = question.toLowerCase();
  
  // Check if query is medical or car related
  const isMedical = /fever|headache|cough|pain|symptom|medical|doctor|health/i.test(lowerQ);
  const isCar = /bmw|car|vehicle|engine|horsepower|speed|transmission/i.test(lowerQ);
  
  // For specific queries, try Groq API first
  if (GROQ_API_KEY && (isMedical || isCar || lowerQ.length > 20)) {
    const apiResponse = await callGroqAPI(question);
    if (apiResponse) {
      return apiResponse;
    }
  }
  
  // Fallback to local response
  return getLocalResponse(question);
};

// ==================== API ENDPOINTS ====================
app.get('/', (req, res) => {
  res.json({
    status: '✅ MediCar Assistant Backend',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: ['Medical Info', 'Car Details', 'Groq AI', 'Local Knowledge'],
    endpoints: ['POST /chat', 'GET /health', 'GET /history/:sessionId']
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    api_key_available: !!GROQ_API_KEY,
    history_count: historyCache.length,
    timestamp: new Date().toISOString()
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
    res.status(500).json({ success: false, error: error.message });
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== MAIN CHAT ENDPOINT ====================
app.post('/chat', async (req, res) => {
  try {
    const { question, sessionId = 'default' } = req.body;
    
    if (!question || question.trim() === '') {
      return res.json({
        success: false,
        reply: 'Please type a question. I can help with medical or car information.'
      });
    }
    
    const cleanQuestion = question.trim();
    console.log(`💬 [${sessionId.substring(0, 8)}...] Q: "${cleanQuestion.substring(0, 50)}${cleanQuestion.length > 50 ? '...' : ''}"`);
    
    const startTime = Date.now();
    const reply = await getAIResponse(cleanQuestion);
    const responseTime = Date.now() - startTime;
    
    console.log(`🤖 Response generated in ${responseTime}ms`);
    
    addToHistory(sessionId, cleanQuestion, reply);
    
    res.json({
      success: true,
      reply: reply,
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      response_time: responseTime
    });
    
  } catch (error) {
    console.error('🚨 Chat endpoint error:', error);
    res.json({
      success: true,
      reply: getLocalResponse(req.body?.question || 'Hello'),
      sessionId: req.body?.sessionId || 'default',
      timestamp: new Date().toISOString(),
      error: 'Using local knowledge base'
    });
  }
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('🚨 Server Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'Please try again later.',
    local_response: getLocalResponse('help')
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: ['GET /', 'GET /health', 'POST /chat', 'GET /history/:sessionId']
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     🤖 MEDICAR ASSISTANT BACKEND v2.0     ║
╠════════════════════════════════════════════╣
║ 🚀 PORT: ${PORT}                           ║
║ 🔑 API Key: ${GROQ_API_KEY ? '✓ Loaded' : '✗ Missing'}                    ║
║ 🏥 Mode: Medical + Car Specialist         ║
║ ✅ Status: RUNNING                        ║
╚════════════════════════════════════════════╝
`);
});
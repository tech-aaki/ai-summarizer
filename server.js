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
  origin: '*',
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== ENHANCED MEDICAL KNOWLEDGE BASE ====================
const MEDICAL_KNOWLEDGE = {
  fever: {
    description: "Fever is a temporary increase in body temperature, often a sign your body is fighting an illness.",
    red_flags: [
      "Fever above 103°F (39.4°C)",
      "Fever lasting more than 3 days",
      "Severe headache with stiff neck",
      "Confusion or disorientation",
      "Difficulty breathing or chest pain",
      "Seizures or convulsions",
      "Skin rash that doesn't fade when pressed",
      "Severe vomiting or inability to keep fluids down"
    ],
    medicine_suggestion: [
      "Acetaminophen (Tylenol) - 500-1000mg every 4-6 hours (max 3000mg/day)",
      "Ibuprofen (Advil, Motrin) - 200-400mg every 6-8 hours (max 1200mg/day)",
      "Aspirin - 325-650mg every 4-6 hours (not for children under 16)",
      "Naproxen (Aleve) - 220mg every 8-12 hours"
    ],
    lab_tests: [
      "Complete Blood Count (CBC)",
      "Blood culture if fever persists >48 hours",
      "Urinalysis for urinary tract infection",
      "Chest X-ray if respiratory symptoms present",
      "Throat swab for strep test"
    ]
  },
  headache: {
    description: "Headache refers to pain in any region of the head, ranging from mild to severe.",
    red_flags: [
      "Sudden, severe headache (thunderclap headache)",
      "Headache after head injury",
      "Fever with headache and stiff neck",
      "Confusion, seizures, or loss of consciousness",
      "Weakness or numbness on one side of body",
      "Visual disturbances or double vision",
      "Worsening headache despite treatment",
      "New headache in someone over 50 years old"
    ],
    medicine_suggestion: [
      "Acetaminophen - 500-1000mg as needed",
      "Ibuprofen - 200-400mg every 6-8 hours",
      "Aspirin - 325-650mg as needed",
      "Naproxen - 220-500mg every 8-12 hours",
      "Sumatriptan (for migraines) - 50-100mg at onset",
      "Preventive: Propranolol, Amitriptyline (for chronic headaches)"
    ],
    lab_tests: [
      "Blood pressure measurement",
      "CT scan of head (if red flags present)",
      "MRI brain (for chronic or unusual headaches)",
      "Blood tests: CBC, ESR, C-reactive protein",
      "Lumbar puncture (if meningitis suspected)"
    ]
  },
  cough: {
    description: "Cough is a reflex action to clear your airways of mucus and irritants.",
    red_flags: [
      "Coughing up blood (hemoptysis)",
      "Shortness of breath or wheezing",
      "Fever >101°F (38.3°C)",
      "Weight loss without trying",
      "Chest pain with coughing",
      "Night sweats",
      "Cough lasting more than 3 weeks",
      "Hoarseness lasting more than 2 weeks"
    ],
    medicine_suggestion: [
      "Dextromethorphan (Robitussin DM) - 10-30mg every 4-8 hours",
      "Guaifenesin (Mucinex) - 200-400mg every 4 hours",
      "Benzonatate (Tessalon Perles) - 100-200mg three times daily",
      "Codeine cough syrup (prescription only)",
      "Honey - 1-2 teaspoons as needed (for children over 1)",
      "Inhalers: Albuterol (for asthma-related cough)"
    ],
    lab_tests: [
      "Chest X-ray",
      "Sputum culture if productive cough",
      "Pulmonary function tests",
      "Allergy testing if allergic cause suspected",
      "CT scan of chest (if chronic cough)"
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
  
  // Fever queries
  if (lowerQ.includes('fever')) {
    const knowledge = MEDICAL_KNOWLEDGE.fever;
    return `
${knowledge.description}

🔴 **# Red Flags (Seek Immediate Medical Attention):**
${knowledge.red_flags.map(item => `• ${item}`).join('\n')}

💊 **# Medicine Suggestion:**
${knowledge.medicine_suggestion.map(item => `• ${item}`).join('\n')}

🔬 **# Lab Tests (if needed):**
${knowledge.lab_tests.map(item => `• ${item}`).join('\n')}

*I'm an AI assistant, not a doctor. For medical advice, consult a healthcare professional.*`;
  }
  
  // Headache queries
  if (lowerQ.includes('headache')) {
    const knowledge = MEDICAL_KNOWLEDGE.headache;
    return `
${knowledge.description}

🔴 **# Red Flags (Seek Immediate Medical Attention):**
${knowledge.red_flags.map(item => `• ${item}`).join('\n')}

💊 **# Medicine Suggestion:**
${knowledge.medicine_suggestion.map(item => `• ${item}`).join('\n')}

🔬 **# Lab Tests (if needed):**
${knowledge.lab_tests.map(item => `• ${item}`).join('\n')}

*I'm an AI assistant, not a doctor. For medical advice, consult a healthcare professional.*`;
  }
  
  // Cough queries
  if (lowerQ.includes('cough')) {
    const knowledge = MEDICAL_KNOWLEDGE.cough;
    return `
${knowledge.description}

🔴 **# Red Flags (Seek Immediate Medical Attention):**
${knowledge.red_flags.map(item => `• ${item}`).join('\n')}

💊 **# Medicine Suggestion:**
${knowledge.medicine_suggestion.map(item => `• ${item}`).join('\n')}

🔬 **# Lab Tests (if needed):**
${knowledge.lab_tests.map(item => `• ${item}`).join('\n')}

*I'm an AI assistant, not a doctor. For medical advice, consult a healthcare professional.*`;
  }
  
  // Greetings
  if (/hello|hi|hey/i.test(lowerQ)) {
    return "🩺 **Hello! I'm Sanjeevani AI**\n\nI'm your dedicated medical assistant here to provide health information and guidance.\n\nI specialize in:\n• Symptom explanation and guidance\n• Red flag identification\n• Medicine suggestions (over-the-counter)\n• Recommended lab tests\n\nPlease describe your symptoms or health concerns.";
  }
  
  if (/how are you/i.test(lowerQ)) {
    return "I'm here and ready to help with your health questions! How can I assist you today?";
  }
  
  if (/your name|who are you/i.test(lowerQ)) {
    return "I'm **Sanjeevani AI**! 🩺 A medical assistance chatbot designed to provide health information, identify warning signs, and suggest when to seek medical care.";
  }
  
  if (/what can you do/i.test(lowerQ)) {
    return "**I can help with:**\n🩺 Symptom explanation and guidance\n⚠️ Red flag identification (when to seek emergency care)\n💊 Medicine suggestions (over-the-counter options)\n🔬 Recommended lab tests\n📋 General health information\n\n*Note: I provide information only, not medical diagnosis. Always consult a doctor for medical advice.*";
  }
  
  // General medical queries
  if (/pain|symptom|disease|illness|sick|medical|health|doctor|hospital|medicine|test/i.test(lowerQ)) {
    return `I understand you're asking about "${question}".\n\nAs Sanjeevani AI, I can provide information about symptoms, red flags, medicine suggestions, and lab tests.\n\nCould you please describe:\n1. Your main symptom(s)\n2. How long you've had them\n3. Any other symptoms you're experiencing\n\nThis will help me provide more specific guidance.`;
  }
  
  return `I understand you're asking about "${question}".\n\nI'm Sanjeevani AI, a medical assistance chatbot. I specialize in health-related information, symptom guidance, and identifying when to seek medical care.\n\nPlease ask me about any health concerns or symptoms you're experiencing.`;
};

// ==================== GROQ API CALLER ====================
const callGroqAPI = async (question) => {
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
            content: `You are Sanjeevani AI, a medical assistance chatbot. Your responses MUST ALWAYS include these three sections at the end:

# Red Flags (critical warning signs that need immediate medical attention)
# Medicine Suggestion (over-the-counter medications with dosages)
# Lab Tests (if needed for diagnosis)

GUIDELINES:
1. First provide clear explanation/guidance about the condition
2. Then include the three required sections
3. Use proper medical terminology but explain clearly
4. Always include disclaimers about consulting doctors
5. Never diagnose - only provide information
6. For serious conditions, emphasize seeking immediate care
7. Format with clear section headers and bullet points
8. Use emojis for visual clarity
9. Focus on symptoms mentioned by user

IMPORTANT: EVERY RESPONSE MUST END WITH THE THREE SECTIONS.`
          },
          {
            role: 'user',
            content: `As Sanjeevani AI, please provide information about: ${question}\n\nInclude explanation first, then the three required sections.`
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
        top_p: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
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
  
  // Check if query is medical related
  const isMedical = /fever|headache|cough|pain|symptom|medical|doctor|health|disease|illness|sick|medicine|test|blood|heart|lung|stomach|skin|eye|ear|nose|throat|bone|joint|muscle|nerve|mental|anxiety|depression|stress|allergy|infection|virus|bacteria|cancer|diabetes|pressure|cholesterol|asthma|arthritis|migraine|nausea|vomit|diarrhea|constipation|rash|itch|swell|inflam|injury|wound|burn|fracture|break|sprain|strain|fatigue|weakness|dizzy|vertigo|sleep|insomnia|appetite|weight|urine|bladder|kidney|liver|lung|breath|chest|back|neck|shoulder|arm|hand|leg|foot|toe|finger/i.test(lowerQ);
  
  // For medical queries, try Groq API first
  if (GROQ_API_KEY && isMedical) {
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
    status: '✅ Sanjeevani AI Backend',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    features: ['Medical Information', 'Red Flag Identification', 'Medicine Suggestions', 'Lab Test Recommendations'],
    endpoints: ['POST /chat', 'GET /health', 'GET /history/:sessionId']
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    api_key_available: !!GROQ_API_KEY,
    history_count: historyCache.length,
    timestamp: new Date().toISOString(),
    service: 'Sanjeevani AI Medical Assistant'
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
        reply: 'Please describe your symptoms or health concern. I\'m here to help as Sanjeevani AI.'
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
      error: 'Using local medical knowledge base'
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
║       🩺 SANJEEVANI AI BACKEND v3.0       ║
╠════════════════════════════════════════════╣
║ 🚀 PORT: ${PORT}                           ║
║ 🔑 API Key: ${GROQ_API_KEY ? '✓ Loaded' : '✗ Missing'}                    ║
║ 🏥 Mode: Medical Assistance Only          ║
║ ✅ Status: RUNNING                        ║
╚════════════════════════════════════════════╝
`);
});

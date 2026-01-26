import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration
app.use(cors({
  origin: '*', // Allow all for testing
  credentials: true
}));

app.use(express.json());

const HISTORY_FILE = path.join(__dirname, 'history.json');

// Medical knowledge base
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
    causes: [
      "Viral infections (flu, COVID-19, cold)",
      "Bacterial infections",
      "Inflammatory conditions",
      "Heat exhaustion",
      "Certain medications"
    ],
    treatment: [
      "Rest and get plenty of sleep",
      "Drink fluids to stay hydrated",
      "Take fever reducers like acetaminophen or ibuprofen",
      "Use cool compresses",
      "Wear lightweight clothing",
      "Take lukewarm baths"
    ],
    when_to_see_doctor: [
      "Fever above 103°F (39.4°C)",
      "Fever lasting more than 3 days",
      "Severe headache",
      "Stiff neck",
      "Confusion",
      "Difficulty breathing",
      "Persistent vomiting",
      "Seizures"
    ]
  },
  headache: {
    types: ["Tension", "Migraine", "Cluster", "Sinus"],
    remedies: ["Rest", "Hydration", "Cold compress", "Pain relievers"],
    warning_signs: ["Sudden severe headache", "Headache after injury", "Fever with headache"]
  },
  cough: {
    types: ["Dry", "Wet/Productive", "Chronic"],
    remedies: ["Honey", "Steam inhalation", "Hydration", "Cough drops"],
    duration_warning: "See doctor if cough lasts >3 weeks"
  }
};

// Car knowledge base
const CAR_KNOWLEDGE = {
  bmw_m8: {
    engine: "4.4-liter Twin-Turbo V8",
    horsepower: "617-625 hp",
    torque: "553 lb-ft",
    acceleration: "0-60 mph in 3.0 seconds",
    top_speed: "155-190 mph (electronically limited)",
    transmission: "8-speed automatic",
    drive_type: "All-wheel drive (xDrive)",
    fuel_economy: "15-17 mpg city / 21-25 mpg highway",
    price: "$133,000 - $160,000",
    features: [
      "M xDrive all-wheel drive",
      "Active M Differential",
      "Carbon fiber roof",
      "M Sport exhaust system",
      "20-inch M light alloy wheels",
      "Merino leather interior",
      "BMW Live Cockpit Professional",
      "Bowers & Wilkins Diamond Surround Sound"
    ],
    variants: ["M8 Coupe", "M8 Gran Coupe", "M8 Convertible", "M8 Competition"]
  }
};

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

// SMART RESPONSE FUNCTION with Medical & Car Knowledge
const getSmartResponse = (question) => {
  const lowerQ = question.toLowerCase().trim();
  
  // Medical queries
  if (lowerQ.includes('fever')) {
    if (lowerQ.includes('symptom')) {
      return `🤒 **Fever Symptoms:**\n${MEDICAL_KNOWLEDGE.fever.symptoms.map(s => `• ${s}`).join('\n')}\n\n**When to see a doctor:**\n${MEDICAL_KNOWLEDGE.fever.when_to_see_doctor.map(s => `• ${s}`).join('\n')}\n\n*Note: I'm an AI assistant, not a doctor. For medical advice, please consult a healthcare professional.*`;
    }
    if (lowerQ.includes('what to do') || lowerQ.includes('treatment')) {
      return `💊 **Fever Treatment:**\n${MEDICAL_KNOWLEDGE.fever.treatment.map(t => `• ${t}`).join('\n')}\n\n**Causes:**\n${MEDICAL_KNOWLEDGE.fever.causes.map(c => `• ${c}`).join('\n')}\n\n⚠️ **Seek immediate medical attention if:**\n• Fever >103°F (39.4°C)\n• Lasts >3 days\n• Difficulty breathing\n• Severe headache\n• Confusion or seizures`;
    }
    return `🌡️ **About Fever:**\nA fever is a temporary increase in body temperature, often due to an illness. Normal body temperature is around 98.6°F (37°C).\n\n**Common symptoms:** ${MEDICAL_KNOWLEDGE.fever.symptoms.slice(0, 3).join(', ')}\n\n**Ask me about:**\n• Fever symptoms\n• Fever treatment\n• When to see a doctor`;
  }
  
  if (lowerQ.includes('headache')) {
    return `🤕 **Headache Information:**\n**Types:** ${MEDICAL_KNOWLEDGE.headache.types.join(', ')}\n\n**Home remedies:**\n${MEDICAL_KNOWLEDGE.headache.remedies.map(r => `• ${r}`).join('\n')}\n\n⚠️ **Warning signs requiring medical attention:**\n${MEDICAL_KNOWLEDGE.headache.warning_signs.map(s => `• ${s}`).join('\n')}`;
  }
  
  if (lowerQ.includes('cough')) {
    return `🤧 **Cough Information:**\n**Types:** ${MEDICAL_KNOWLEDGE.cough.types.join(', ')}\n\n**Natural remedies:**\n${MEDICAL_KNOWLEDGE.cough.remedies.map(r => `• ${r}`).join('\n')}\n\n${MEDICAL_KNOWLEDGE.cough.duration_warning}`;
  }
  
  // Medical general queries
  if (lowerQ.includes('medical') || lowerQ.includes('doctor') || lowerQ.includes('health')) {
    return `🏥 **Medical Assistant Mode Activated**\nI can provide general health information about:\n• Fever symptoms & treatment\n• Headache types & remedies\n• Cough information\n• First aid basics\n• When to seek medical help\n\n*Disclaimer: I provide general information only. For medical emergencies, call emergency services immediately.*`;
  }
  
  // Car queries - BMW M8
  if (lowerQ.includes('bmw') && lowerQ.includes('m8')) {
    const car = CAR_KNOWLEDGE.bmw_m8;
    
    if (lowerQ.includes('engine') || lowerQ.includes('power')) {
      return `🚗 **BMW M8 Engine Details:**\n• **Engine:** ${car.engine}\n• **Horsepower:** ${car.horsepower}\n• **Torque:** ${car.torque}\n• **0-60 mph:** ${car.acceleration}\n• **Top Speed:** ${car.top_speed}`;
    }
    
    if (lowerQ.includes('detail') || lowerQ.includes('important') || lowerQ.includes('10')) {
      return `🏎️ **BMW M8 - Top 10 Important Details:**\n1. **Engine:** ${car.engine}\n2. **Power:** ${car.horsepower}\n3. **Torque:** ${car.torque}\n4. **Acceleration:** ${car.acceleration}\n5. **Transmission:** ${car.transmission}\n6. **Drive Type:** ${car.drive_type}\n7. **Price Range:** ${car.price}\n8. **Fuel Economy:** ${car.fuel_economy}\n9. **Top Variants:** ${car.variants.join(', ')}\n10. **Key Feature:** ${car.features[0]}`;
    }
    
    if (lowerQ.includes('feature') || lowerQ.includes('spec')) {
      return `🔧 **BMW M8 Features:**\n${car.features.map((f, i) => `${i+1}. ${f}`).join('\n')}\n\n**Variants:** ${car.variants.join(', ')}`;
    }
    
    return `🌟 **BMW M8 Overview:**\nThe BMW M8 is a high-performance luxury grand tourer. **Key specs:**\n• ${car.engine} engine\n• ${car.horsepower}\n• ${car.acceleration}\n• Price: ${car.price}\n\nAsk about: engine power, features, or specifications!`;
  }
  
  // General car queries
  if (lowerQ.includes('car') || lowerQ.includes('vehicle') || lowerQ.includes('automobile')) {
    return `🚘 **Car Information:**\nI can provide details about various cars. Currently, I have detailed information about:\n• BMW M8 (ask about engine, features, specs)\n\nFor other cars, try asking specific questions!`;
  }
  
  // Common questions
  if (/hello|hi|hey|greetings/i.test(lowerQ)) {
    return "Hello! 👋 I'm your AI Assistant with **medical knowledge**. I can help with:\n• Medical information (fever, headache, etc.)\n• Car details (BMW M8, etc.)\n• General questions\n\nHow can I assist you today?";
  }
  
  if (/how are you/i.test(lowerQ)) {
    return "I'm doing great! Ready to provide medical information or answer any questions. How about you?";
  }
  
  if (/your name|who are you/i.test(lowerQ)) {
    return "I'm **MediCar Assistant**! 🤖 I specialize in medical information and car details. What would you like to know?";
  }
  
  if (/what can you do/i.test(lowerQ)) {
    return "**I can help with:**\n🏥 **Medical Info:** Fever, headache, cough symptoms & treatment\n🚗 **Car Details:** BMW M8 specifications & features\n💬 **General Questions:** Anything you'd like to ask\n📝 **Summarization:** Web content summary\n\nTry: 'Tell me fever symptoms' or 'BMW M8 engine details'";
  }
  
  if (/time|date/i.test(lowerQ)) {
    return `⏰ **Current Time:** ${new Date().toLocaleTimeString()}\n📅 **Date:** ${new Date().toDateString()}`;
  }
  
  if (/joke/i.test(lowerQ)) {
    const jokes = [
      "Why did the doctor carry a red pen? In case they needed to draw blood! 🩸",
      "Why don't cars get sick? Because they have auto-immunity! 🚗💨",
      "What do you call a doctor who fixes websites? A URLologist! 💻"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  
  if (/bye|goodbye/i.test(lowerQ)) {
    return "Goodbye! 👋 Stay healthy and drive safe!";
  }
  
  if (/thank/i.test(lowerQ)) {
    return "You're welcome! 😊 Take care and feel free to ask more!";
  }
  
  // If question starts with what/how/why
  if (/^(what|how|why|when|where|who)\s/i.test(lowerQ)) {
    const topic = question.split(' ').slice(0, 3).join(' ');
    return `That's an interesting question about "${topic}"! I specialize in:\n• Medical information\n• Car specifications\n• General knowledge\n\nCould you specify which area you're interested in?`;
  }
  
  // Default enhanced response
  return `I understand you're asking about "${question}".\n\n**I specialize in:**\n🏥 Medical information (fever, headache, cough)\n🚗 Car details (BMW M8 specifications)\n💬 General knowledge\n\n**Try asking:**\n• "What are fever symptoms?"\n• "Tell me about BMW M8 engine"\n• "Help with headache remedies"`;
};

// Try to use Groq API, fallback to enhanced smart responses
const getAIResponse = async (question) => {
  try {
    console.log('🔍 Analyzing question for specialized response...');
    
    // Check if it's a medical or car query for specialized response
    const lowerQ = question.toLowerCase();
    const isMedical = /fever|headache|cough|pain|symptom|medical|doctor|health|illness|sick/i.test(lowerQ);
    const isCar = /bmw|car|vehicle|engine|horsepower|speed|transmission/i.test(lowerQ);
    
    if (isMedical || isCar) {
      console.log('📋 Using specialized knowledge base');
      return getSmartResponse(question);
    }
    
    // For other queries, try Groq API
    console.log('🌐 Trying Groq API...');
    
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are MediCar Assistant, a helpful AI that specializes in medical information and car details.
            
            MEDICAL KNOWLEDGE:
            - Fever: Symptoms include elevated temperature, chills, headache, muscle aches
            - Treatment: Rest, hydration, fever reducers
            - Always add disclaimer: "I'm an AI assistant, not a doctor. For medical advice, consult a healthcare professional."
            
            CAR KNOWLEDGE:
            - BMW M8: 4.4L V8 Twin-Turbo, 617-625 hp, 0-60 in 3.0s
            - Be specific about technical details
            
            GENERAL:
            - Keep responses concise but informative
            - Use bullet points for lists
            - Add relevant emojis
            - Be friendly and helpful`
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
        top_p: 0.9
      },
      {
        headers: {
          'Authorization': 'Bearer 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',
          'Content-Type': 'application/json'
        },
        timeout: 10000  // 10 seconds timeout
      }
    );
    
    console.log('✅ Groq API Success!');
    return response.data.choices[0].message.content.trim();
    
  } catch (error) {
    console.log('❌ Groq API failed, using enhanced smart response');
    console.log('Error details:', error.message);
    
    // Enhanced fallback with better context
    return getSmartResponse(question);
  }
};

// API Endpoints
app.get('/', (req, res) => {
  res.json({
    status: '✅ MediCar Assistant Backend is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: [
      'Medical information (fever, headache, cough)',
      'Car specifications (BMW M8)',
      'Groq AI integration',
      'Local knowledge base',
      'Chat history'
    ],
    endpoints: {
      chat: 'POST /chat',
      health: 'GET /health',
      knowledge: 'GET /knowledge/:topic'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    historyCount: historyCache.length,
    mode: 'MediCar Assistant v2.0',
    message: 'Specialized in medical & car information'
  });
});

app.get('/knowledge/:topic', (req, res) => {
  const { topic } = req.params;
  const lowerTopic = topic.toLowerCase();
  
  if (MEDICAL_KNOWLEDGE[lowerTopic]) {
    res.json({
      topic: topic,
      type: 'medical',
      data: MEDICAL_KNOWLEDGE[lowerTopic]
    });
  } else if (CAR_KNOWLEDGE[lowerTopic]) {
    res.json({
      topic: topic,
      type: 'car',
      data: CAR_KNOWLEDGE[lowerTopic]
    });
  } else {
    res.json({
      topic: topic,
      message: 'No specialized knowledge found',
      available_topics: ['fever', 'headache', 'cough', 'bmw_m8']
    });
  }
});

// MAIN CHAT ENDPOINT - ENHANCED
app.post('/chat', async (req, res) => {
  try {
    const { question, sessionId = 'default' } = req.body;
    
    if (!question || question.trim() === '') {
      return res.json({
        success: false,
        reply: 'Please type a question. I can help with medical information or car details!'
      });
    }
    
    const cleanQuestion = question.trim();
    console.log(`💬 [${sessionId}] Question: "${cleanQuestion}"`);
    
    // Get response (tries API, falls back to smart response)
    const reply = await getAIResponse(cleanQuestion);
    console.log(`🤖 Response length: ${reply.length} characters`);
    
    // Save to history
    addToHistory(sessionId, cleanQuestion, reply);
    
    res.json({
      success: true,
      reply: reply,
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      response_type: 'enhanced'
    });
    
  } catch (error) {
    console.error('Server error:', error);
    
    // Even on server error, provide a helpful response
    const fallbackReply = getSmartResponse(req.body?.question || 'Hello');
    
    res.json({
      success: true,
      reply: fallbackReply,
      sessionId: req.body?.sessionId || 'default',
      timestamp: new Date().toISOString(),
      response_type: 'fallback'
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: 'The server encountered an error. Please try again.',
    fallback_response: getSmartResponse('help')
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found',
    available_endpoints: ['GET /', 'GET /health', 'POST /chat', 'GET /knowledge/:topic']
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     🤖 MEDICAR ASSISTANT BACKEND v2.0     ║
╠════════════════════════════════════════════╣
║ 🚀 PORT: ${PORT}                           ║
║ 🌐 URL: http://localhost:${PORT}           ║
║ 🏥 Mode: Medical + Car Assistant          ║
║ ✅ Status: READY & ENHANCED               ║
║ 💬 Endpoint: POST /chat                   ║
║ 📚 Knowledge: fever, headache, bmw_m8     ║
╚════════════════════════════════════════════╝
`);
});

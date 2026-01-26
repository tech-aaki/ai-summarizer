import axios from 'axios';

async function testGroqAPI() {
  const apiKey = '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';
  
  console.log('🔍 Testing Groq API...');
  console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');
  
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant.'
          },
          {
            role: 'user',
            content: 'What are symptoms of malaria?'
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('✅ Groq API Test SUCCESS!');
    console.log('Response:', response.data.choices[0].message.content);
    return true;
    
  } catch (error) {
    console.log('❌ Groq API Test FAILED!');
    console.log('Error message:', error.message);
    console.log('Error response:', error.response?.data || 'No response data');
    console.log('Status:', error.response?.status);
    return false;
  }
}

testGroqAPI();


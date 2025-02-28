/**
 * Gemini AI Configuration and Utilities
 * This module provides enhanced configuration and error handling for the Gemini API
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { config } = require('./environment-config');

// Get the API key from config 
let API_KEY = config.geminiApiKey;
const MODEL_NAME = 'gemini-pro';

// Check if API key is available
console.log('Gemini API Key status:', API_KEY ? 'Available' : 'Missing');
if (!API_KEY) {
  console.error('⚠️ Gemini API Key is not configured. AI functionality will be limited.');
}

// Initialize Gemini with API key from environment variables
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Model configurations for different use cases
const modelConfigs = {
  // Creative responses with higher temperature
  creative: {
    model: "gemini-pro",
    temperature: 0.8,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 1024,
    safetySettings: safetySettings,
  },
  
  // Balanced responses (default)
  balanced: {
    model: "gemini-pro",
    temperature: 0.4,
    topP: 0.8,
    topK: 30,
    maxOutputTokens: 1024,
    safetySettings: safetySettings,
  },
  
  // Precise responses with lower temperature
  precise: {
    model: "gemini-pro",
    temperature: 0.1,
    topP: 0.7,
    topK: 20,
    maxOutputTokens: 1024,
    safetySettings: safetySettings,
  },
  
  // Negotiation-specialized configuration
  negotiation: {
    model: "gemini-pro",
    temperature: 0.35,
    topP: 0.85,
    topK: 30,
    maxOutputTokens: 2048, // Allow longer responses for negotiations
    safetySettings: safetySettings,
  }
};

/**
 * Get a configured Gemini model instance
 * @param {string} configType - Type of configuration to use (creative, balanced, precise, negotiation)
 * @returns {object} Configured model instance
 */
function getConfiguredModel(configType = 'balanced') {
  const config = modelConfigs[configType] || modelConfigs.balanced;
  return new GoogleGenerativeAI(API_KEY).getGenerativeModel(config);
}

/**
 * Get the configured Gemini model
 * @returns {object|null} The configured model or null if there's an error
 */
function getGeminiModel() {
  try {
    // Reload config to ensure we have the latest API key
    delete require.cache[require.resolve('./environment-config')];
    const refreshedConfig = require('./environment-config');
    // Use the refreshed API key
    const currentApiKey = refreshedConfig.config.geminiApiKey;
    
    console.log('DEBUG - Using Gemini API Key:', currentApiKey ? `${currentApiKey.substring(0, 8)}...${currentApiKey.substring(currentApiKey.length-5)}` : 'NOT AVAILABLE');
    
    if (!currentApiKey) {
      console.error('⚠️ Cannot initialize Gemini: Missing API Key');
      return null;
    }
    
    console.log('DEBUG - Creating GoogleGenerativeAI instance');
    const genAI = new GoogleGenerativeAI(currentApiKey);
    console.log('DEBUG - Getting generative model');
    return genAI.getGenerativeModel({ model: MODEL_NAME, safetySettings });
  } catch (error) {
    console.error('Error getting Gemini model:', error);
    return null;
  }
}

/**
 * Generate content with robust error handling
 * @param {object} model - The configured model instance
 * @param {string} prompt - The prompt to send
 * @param {function} onError - Optional custom error handler callback
 * @returns {string} The generated text or error message
 */
async function generateContentSafely(model, prompt, onError) {
  console.log('DEBUG - Sending prompt to Gemini API:', prompt.substring(0, 100) + '...');
  
  try {
    if (!model) {
      console.error('DEBUG - Model is null, cannot generate content');
      return 'عذرًا، حدث خطأ في الاتصال بالذكاء الاصطناعي. الرجاء المحاولة مرة أخرى.';
    }
    
    console.log('DEBUG - Calling Gemini API...');
    const result = await model.generateContent(prompt);
    console.log('DEBUG - Received response from Gemini API');
    const response = await result.response;
    const text = response.text();
    console.log('DEBUG - Extracted text from response:', text.substring(0, 100) + '...');
    return text;
  } catch (error) {
    console.error('DEBUG - Gemini API Error:', error);
    
    // Handle specific error types
    if (error.message?.includes('rate limit')) {
      const message = 'عذرًا، تجاوزنا الحد الأقصى لعدد الطلبات. الرجاء المحاولة مرة أخرى بعد قليل.';
      if (onError) onError(message, error);
      return message;
    }
    
    if (error.message?.includes('token limit')) {
      const message = 'عذرًا، المحتوى طويل جدًا للمعالجة. يرجى تقصير الرسالة وإعادة المحاولة.';
      if (onError) onError(message, error);
      return message;
    }
    
    if (error.message?.includes('safety')) {
      const message = 'عذرًا، لا يمكنني تقديم استجابة لهذا المحتوى بسبب إعدادات السلامة.';
      if (onError) onError(message, error);
      return message;
    }
    
    // Default error message
    const defaultMessage = 'عذرًا، حدث خطأ في معالجة طلبك. الرجاء المحاولة مرة أخرى.';
    if (onError) onError(defaultMessage, error);
    return defaultMessage;
  }
}

/**
 * Generate improved real estate negotiation prompts
 * @param {string} situation - The user's situation
 * @returns {string} Enhanced prompt
 */
function createNegotiationPrompt(situation) {
  return `
  أنت مساعد متخصص في التفاوض على العقارات، مع خبرة 20 عامًا في السوق العقاري السعودي.
  
  معلومات عن الموقف:
  ${situation}
  
  يرجى تقديم:
  1. تحليل موجز للموقف
  2. استراتيجية تفاوض مناسبة
  3. نقاط قوة يمكن استخدامها
  4. نقاط ضعف يجب الانتباه لها
  5. عبارات واقتراحات محددة يمكن استخدامها في المحادثة
  
  قدم إجابة مختصرة ومفيدة، مع التركيز على الجوانب العملية للتفاوض واستخدم لغة سهلة الفهم.
  `;
}

/**
 * Generate improved property analysis prompts
 * @param {object} propertyDetails - Details of the property
 * @returns {string} Enhanced prompt
 */
function createPropertyAnalysisPrompt(propertyDetails) {
  return `
  أنت خبير عقاري متخصص في تحليل العقارات وكشف العيوب المحتملة في صفقات العقارات.
  
  معلومات العقار:
  - النوع: ${propertyDetails.type || 'غير محدد'}
  - الموقع: ${propertyDetails.location || 'غير محدد'}
  - السعر: ${propertyDetails.price || 'غير محدد'}
  - المساحة: ${propertyDetails.area || 'غير محدد'}
  - وصف إضافي: ${propertyDetails.description || 'لا يوجد'}
  
  يرجى تقديم:
  1. تقييم موجز للسعر مقارنة بسوق العقارات في المنطقة
  2. العيوب المحتملة التي يجب الانتباه لها
  3. النقاط التي تحتاج إلى تحقق وفحص إضافي
  4. نصائح للتفاوض على السعر
  
  قدم تحليلًا موضوعيًا ومفيدًا مع التركيز على كشف أي مشكلات محتملة في الصفقة.
  `;
}

module.exports = {
  getConfiguredModel,
  generateContentSafely,
  getGeminiModel,
  createNegotiationPrompt,
  createPropertyAnalysisPrompt,
  safetySettings,
  modelConfigs,
  ...require('./environment-config')
};

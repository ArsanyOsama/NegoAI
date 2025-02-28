const natural = require('natural');
const compromise = require('compromise');
const TfIdf = require('natural').TfIdf;
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY');

// Initialize NLP tools
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const tfidf = new TfIdf();

// Add real estate fraud detection corpus
const fraudPatterns = [
  "price too low compared to market",
  "urgent sale pressure",
  "request for payment before viewing",
  "seller refuses to meet in person",
  "no property inspection allowed",
  "incomplete or vague property details",
  "non-standard payment methods",
  "inconsistent property descriptions",
  "property without official documents",
  "hidden fees or unusual charges"
];

// Add these patterns to TF-IDF
fraudPatterns.forEach(pattern => {
  tfidf.addDocument(pattern);
});

// Real estate terminology in Arabic
const realEstateTerms = {
  'عقار': 'property',
  'شقة': 'apartment',
  'فيلا': 'villa',
  'أرض': 'land',
  'إيجار': 'rent',
  'بيع': 'sale',
  'رهن': 'mortgage',
  'سند': 'deed',
  'صك': 'title deed',
  'عقد': 'contract',
  'وسيط': 'broker',
  'سمسار': 'real estate agent',
  'مطور': 'developer',
  'تثمين': 'valuation',
  'منطقة': 'area',
  'حي': 'neighborhood',
  'مخطط': 'plan',
  'تشطيب': 'finishing',
  'متر مربع': 'square meter',
  'واجهة': 'facade'
};

// Sentiment analysis for Arabic text
const analyzeSentiment = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
    قم بتحليل المشاعر في النص التالي وصنفه إلى إيجابي، سلبي، أو محايد. أعط درجة من 1 إلى 10 لمستوى الإيجابية أو السلبية.
    
    النص: "${text}"
    
    الرجاء الإجابة بتنسيق JSON فقط بالشكل التالي:
    {"sentiment": "positive/negative/neutral", "score": 7, "explanation": "شرح مختصر للتصنيف"}
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().trim();
    
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON from sentiment analysis:", e);
      return { sentiment: "neutral", score: 5, explanation: "تعذر تحليل المشاعر" };
    }
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return { sentiment: "neutral", score: 5, explanation: "حدث خطأ في التحليل" };
  }
};

// Detect potential fraud in real estate descriptions
const detectFraud = (text) => {
  const tokens = tokenizer.tokenize(text.toLowerCase());
  
  // Check for fraud indicators
  const fraudIndicators = [];
  
  // Price-related fraud indicators
  if (text.includes("أقل سعر") || text.includes("سعر منخفض جدًا") || text.includes("أرخص")) {
    fraudIndicators.push({
      type: "price_manipulation",
      confidence: 0.7,
      description: "تلاعب محتمل في السعر - السعر منخفض بشكل غير طبيعي"
    });
  }
  
  // Urgency red flags
  if (text.includes("فرصة لا تعوض") || text.includes("عرض لفترة محدودة") || 
      text.includes("يجب البيع الآن") || text.includes("فرصة نادرة")) {
    fraudIndicators.push({
      type: "urgency_pressure",
      confidence: 0.65,
      description: "ضغط بالإلحاح - محاولة لإجبار المشتري على اتخاذ قرار سريع"
    });
  }
  
  // Unusual payment methods
  if (text.includes("تحويل مباشر") || text.includes("دفع نقدي فقط") || 
      text.includes("تأمين مقدم") || text.includes("دفعة تأمين")) {
    fraudIndicators.push({
      type: "payment_methods",
      confidence: 0.75,
      description: "طرق دفع غير تقليدية قد تشير إلى احتيال"
    });
  }
  
  // Documentation issues
  if (text.includes("بدون أوراق") || text.includes("توثيق لاحقًا") || 
      text.includes("صك غير جاهز") || text.includes("أوراق تحت الإجراء")) {
    fraudIndicators.push({
      type: "documentation_issues",
      confidence: 0.85,
      description: "مشاكل في التوثيق أو ملكية العقار غير واضحة"
    });
  }
  
  // Calculate overall fraud risk
  let overallRisk = 0;
  if (fraudIndicators.length > 0) {
    const totalConfidence = fraudIndicators.reduce((sum, indicator) => sum + indicator.confidence, 0);
    overallRisk = totalConfidence / fraudIndicators.length * (Math.min(fraudIndicators.length, 3) / 3);
  }
  
  return {
    indicators: fraudIndicators,
    overallRisk: overallRisk,
    riskLevel: overallRisk > 0.7 ? "عالي" : overallRisk > 0.4 ? "متوسط" : "منخفض"
  };
};

// Extract entities from Arabic real estate text
const extractEntities = (text) => {
  const entities = {
    locations: [],
    prices: [],
    areas: [],
    propertyTypes: []
  };
  
  // Locations (neighborhoods/cities)
  const locationMatches = text.match(/في ([\u0600-\u06FF\s]+?)(?:\s|،|\.)/g);
  if (locationMatches) {
    entities.locations = locationMatches.map(match => 
      match.replace(/في /, '').trim().replace(/[،\.]$/, '')
    );
  }
  
  // Prices
  const priceMatches = text.match(/(\d[\d,.]*)(?:\s*)(ريال|الف|مليون|دينار|جنيه|درهم)/g);
  if (priceMatches) {
    entities.prices = priceMatches.map(match => match.trim());
  }
  
  // Areas (square meters)
  const areaMatches = text.match(/(\d[\d,.]*)(?:\s*)(متر مربع|م2|م٢|متر²)/g);
  if (areaMatches) {
    entities.areas = areaMatches.map(match => match.trim());
  }
  
  // Property types
  const propertyTypes = ['شقة', 'فيلا', 'أرض', 'عمارة', 'محل', 'مكتب', 'استديو', 'دور', 'منزل', 'قصر'];
  propertyTypes.forEach(type => {
    if (text.includes(type)) {
      entities.propertyTypes.push(type);
    }
  });
  
  return entities;
};

// Generate market insights based on property details
const generateMarketInsights = async (propertyDetails) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
    بناءً على التفاصيل التالية، قدم تحليلاً للسوق العقاري وتوقعات الأسعار:
    
    ${JSON.stringify(propertyDetails, null, 2)}
    
    قدم المعلومات التالية:
    1. تقييم السعر مقارنة بالسوق (أعلى/أقل/عادل)
    2. توقعات تغير الأسعار في هذه المنطقة
    3. نصائح للتفاوض بناء على ظروف السوق
    4. المخاطر المحتملة لهذا النوع من العقارات
    
    الرجاء تقديم الرد بتنسيق JSON فقط:
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().trim();
    
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse JSON from market insights:", e);
      return { error: "تعذر تحليل بيانات السوق" };
    }
  } catch (error) {
    console.error('Error generating market insights:', error);
    return { error: "حدث خطأ في تحليل السوق" };
  }
};

// Analyze negotiation tactics in a conversation
const analyzeNegotiationTactics = async (conversation) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
    صفتك خبير في تحليل المفاوضات. قم بتحليل المحادثة التالية بين بائع ومشتري عقار:
    
    ${conversation}
    
    قم بتحديد:
    1. التكتيكات التي استخدمها البائع
    2. التكتيكات التي استخدمها المشتري
    3. نقاط القوة والضعف لكل طرف
    4. اقتراحات لتحسين موقف المشتري
    5. الفرص الضائعة في المحادثة
    
    اجعل التحليل موجزًا ومفيدًا.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error analyzing negotiation tactics:', error);
    return "حدث خطأ في تحليل تكتيكات المفاوضة";
  }
};

module.exports = {
  analyzeSentiment,
  detectFraud,
  extractEntities,
  generateMarketInsights,
  analyzeNegotiationTactics
};

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY');

// Database of known fraud patterns in real estate
const fraudPatterns = [
  // Price anomalies
  {
    category: 'price_anomaly',
    priceTooLow: true,
    urgentSale: true,
    noDocuments: false,
    noInspection: false,
    hiddenFees: false,
    atypicalPaymentMethod: false
  },
  // Documentation issues
  {
    category: 'documentation_fraud',
    priceTooLow: false,
    urgentSale: false,
    noDocuments: true,
    noInspection: false,
    hiddenFees: false,
    atypicalPaymentMethod: false
  },
  // Inspection refusal
  {
    category: 'inspection_fraud',
    priceTooLow: false,
    urgentSale: true,
    noDocuments: false,
    noInspection: true,
    hiddenFees: false,
    atypicalPaymentMethod: false
  },
  // Payment fraud
  {
    category: 'payment_fraud',
    priceTooLow: false,
    urgentSale: true,
    noDocuments: false,
    noInspection: false,
    hiddenFees: true,
    atypicalPaymentMethod: true
  },
  // Combined fraud indicators
  {
    category: 'multiple_red_flags',
    priceTooLow: true,
    urgentSale: true,
    noDocuments: true,
    noInspection: true,
    hiddenFees: false,
    atypicalPaymentMethod: false
  }
];

// Convert fraud patterns to training data for machine learning
const trainingData = fraudPatterns.map(pattern => [
  pattern.priceTooLow ? 1 : 0,
  pattern.urgentSale ? 1 : 0,
  pattern.noDocuments ? 1 : 0, 
  pattern.noInspection ? 1 : 0,
  pattern.hiddenFees ? 1 : 0,
  pattern.atypicalPaymentMethod ? 1 : 0
]);

const labels = fraudPatterns.map(pattern => pattern.category);

// Create KNN model
// Fix the KNN implementation to use a different approach since the library may not be properly installed
// Instead of using the ml-knn library directly, we'll implement a simple version ourselves
function customKNN(testPoint, k = 3) {
  // Calculate distances to all training points
  const distances = trainingData.map((dataPoint, index) => {
    // Euclidean distance calculation
    const sum = dataPoint.reduce((acc, val, i) => {
      return acc + Math.pow(val - testPoint[i], 2);
    }, 0);
    return {
      distance: Math.sqrt(sum),
      label: labels[index]
    };
  });
  
  // Sort by distance and take k nearest
  const nearest = distances.sort((a, b) => a.distance - b.distance).slice(0, k);
  
  // Count occurrences of each label
  const labelCounts = nearest.reduce((counts, neighbor) => {
    counts[neighbor.label] = (counts[neighbor.label] || 0) + 1;
    return counts;
  }, {});
  
  // Find the most frequent label
  let maxCount = 0;
  let prediction = '';
  
  for (const label in labelCounts) {
    if (labelCounts[label] > maxCount) {
      maxCount = labelCounts[label];
      prediction = label;
    }
  }
  
  return prediction;
}

// Replace the knn variable with our custom function
const knn = {
  predict: function(testPoint) {
    return customKNN(testPoint);
  }
};

// Common price ranges for different property types and locations in Saudi Arabia
const marketPriceRanges = {
  'شقة': {
    'الرياض': { min: 300000, max: 2000000 },
    'جدة': { min: 350000, max: 2500000 },
    'الدمام': { min: 250000, max: 1500000 },
    'مكة': { min: 400000, max: 3000000 },
    'المدينة': { min: 300000, max: 1800000 },
    'الخُبر': { min: 280000, max: 1700000 },
    'الطائف': { min: 200000, max: 1200000 },
    'default': { min: 250000, max: 1500000 }
  },
  'فيلا': {
    'الرياض': { min: 1000000, max: 5000000 },
    'جدة': { min: 1200000, max: 7000000 },
    'الدمام': { min: 900000, max: 4000000 },
    'مكة': { min: 1500000, max: 8000000 },
    'المدينة': { min: 1000000, max: 5000000 },
    'الخُبر': { min: 1200000, max: 6000000 },
    'الطائف': { min: 800000, max: 3500000 },
    'default': { min: 1000000, max: 5000000 }
  },
  'أرض': {
    'الرياض': { min: 400000, max: 10000000 },
    'جدة': { min: 500000, max: 15000000 },
    'الدمام': { min: 350000, max: 8000000 },
    'مكة': { min: 800000, max: 20000000 },
    'المدينة': { min: 500000, max: 10000000 },
    'الخُبر': { min: 400000, max: 9000000 },
    'الطائف': { min: 300000, max: 5000000 },
    'default': { min: 400000, max: 8000000 }
  },
  'default': { min: 300000, max: 3000000 }
};

// Common fraud keywords in Arabic
const fraudKeywords = {
  urgency: ['فرصة لا تعوض', 'عرض لفترة محدودة', 'بيع سريع', 'يجب البيع الآن', 'فرصة نادرة'],
  documentation: ['بدون أوراق', 'توثيق لاحقًا', 'صك غير جاهز', 'أوراق تحت الإجراء'],
  inspection: ['لا يمكن المعاينة', 'معاينة محدودة', 'معاينة بعد الدفع', 'بدون معاينة'],
  payment: ['دفع كاش فقط', 'تحويل مباشر', 'تأمين مقدم', 'دفعة تأمين قبل المعاينة'],
  price: ['أقل سعر', 'سعر منخفض جدًا', 'أرخص من السوق']
};

// Analyze listing for price anomalies
const detectPriceAnomaly = (propertyType, location, price) => {
  // Default to default category if property type not found
  const propertyRanges = marketPriceRanges[propertyType] || marketPriceRanges.default;
  
  // Default to default location if specific location not found
  const locationRange = propertyRanges[location] || propertyRanges.default || marketPriceRanges.default;
  
  const { min, max } = locationRange;
  
  // Check if price is suspiciously low
  if (price < min * 0.7) {
    return {
      isAnomaly: true,
      reason: 'السعر منخفض بشكل مثير للريبة عن متوسط أسعار السوق',
      severity: 'عالي',
      marketMin: min,
      marketMax: max,
      percentageBelowMarket: Math.round(((min - price) / min) * 100)
    };
  }
  
  // Check if price is too high (less likely to be fraud, but still abnormal)
  if (price > max * 1.5) {
    return {
      isAnomaly: true,
      reason: 'السعر أعلى بكثير من متوسط أسعار السوق',
      severity: 'متوسط',
      marketMin: min,
      marketMax: max,
      percentageAboveMarket: Math.round(((price - max) / max) * 100)
    };
  }
  
  return {
    isAnomaly: false,
    reason: 'السعر ضمن النطاق الطبيعي لهذا النوع من العقارات في هذه المنطقة',
    marketMin: min,
    marketMax: max
  };
};

// Main fraud detection function
const detectFraud = (listing) => {
  const { description, price, propertyType, location, sellerInfo } = listing;
  
  // Initialize fraud indicators
  const indicators = [];
  
  // Check for price anomalies
  const priceAnalysis = detectPriceAnomaly(propertyType, location, price);
  const isPriceTooLow = priceAnalysis.isAnomaly && priceAnalysis.reason.includes('منخفض');
  
  if (isPriceTooLow) {
    indicators.push({
      type: 'price_anomaly',
      description: priceAnalysis.reason,
      severity: priceAnalysis.severity,
      details: priceAnalysis
    });
  }
  
  // Check for urgent sale language
  const hasUrgencyLanguage = fraudKeywords.urgency.some(keyword => description.includes(keyword));
  if (hasUrgencyLanguage) {
    indicators.push({
      type: 'urgency_pressure',
      description: 'يستخدم البائع لغة تحث على الإسراع في اتخاذ القرار',
      severity: 'متوسط'
    });
  }
  
  // Check for documentation issues
  const hasDocumentationIssues = fraudKeywords.documentation.some(keyword => description.includes(keyword));
  if (hasDocumentationIssues) {
    indicators.push({
      type: 'documentation_issues',
      description: 'توجد مشكلات محتملة في توثيق العقار أو ملكيته',
      severity: 'عالي'
    });
  }
  
  // Check for inspection limitations
  const hasInspectionLimitations = fraudKeywords.inspection.some(keyword => description.includes(keyword));
  if (hasInspectionLimitations) {
    indicators.push({
      type: 'inspection_limitations',
      description: 'البائع يمنع أو يحد من معاينة العقار بشكل طبيعي',
      severity: 'عالي'
    });
  }
  
  // Check for unusual payment methods
  const hasUnusualPaymentMethods = fraudKeywords.payment.some(keyword => description.includes(keyword));
  if (hasUnusualPaymentMethods) {
    indicators.push({
      type: 'payment_issues',
      description: 'البائع يطلب طرق دفع غير تقليدية أو دفعات مقدمة مثيرة للشك',
      severity: 'عالي'
    });
  }
  
  // Use KNN to classify the fraud type
  if (indicators.length > 0) {
    const features = [
      isPriceTooLow ? 1 : 0,
      hasUrgencyLanguage ? 1 : 0,
      hasDocumentationIssues ? 1 : 0,
      hasInspectionLimitations ? 1 : 0,
      false ? 1 : 0, // hiddenFees placeholder
      hasUnusualPaymentMethods ? 1 : 0
    ];
    
    const fraudCategory = knn.predict(features);
    
    // Calculate overall risk score (0-100)
    let riskScore = 0;
    indicators.forEach(indicator => {
      // Add points based on severity
      if (indicator.severity === 'عالي') riskScore += 30;
      else if (indicator.severity === 'متوسط') riskScore += 15;
      else riskScore += 5;
    });
    
    // Cap at 100
    riskScore = Math.min(riskScore, 100);
    
    return {
      isFraudulent: riskScore > 50,
      fraudCategory: fraudCategory,
      riskScore: riskScore,
      riskLevel: riskScore > 75 ? 'عالي جداً' : riskScore > 50 ? 'عالي' : riskScore > 25 ? 'متوسط' : 'منخفض',
      indicators: indicators
    };
  }
  
  return {
    isFraudulent: false,
    riskScore: 0,
    riskLevel: 'منخفض',
    indicators: []
  };
};

// Generate detailed fraud analysis report
const generateFraudReport = async (listing, fraudAnalysis) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
    أنت خبير في كشف الاحتيال العقاري. قم بتحليل العقار التالي وتقرير التحليل الآلي المرفق، ثم اكتب تقريراً مفصلاً عن المخاطر المحتملة:
    
    معلومات العقار:
    ${JSON.stringify(listing, null, 2)}
    
    نتائج تحليل الاحتيال الآلي:
    ${JSON.stringify(fraudAnalysis, null, 2)}
    
    في تقريرك، قم بتغطية:
    1. ملخص المخاطر المحتملة
    2. تحليل مفصل لكل مؤشر احتيال
    3. نصائح للمشتري للتعامل مع هذه المخاطر
    4. الخطوات المقترحة للتحقق من مصداقية العرض
    5. نصائح للتفاوض في حالة المضي قدمًا مع العرض
    
    اجعل التقرير مهنياً ودقيقاً وموجهاً بشكل خاص لسوق العقارات العربي.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating fraud report:', error);
    return "حدث خطأ في إنشاء تقرير الاحتيال";
  }
};

// Analyze seller reputation based on listing patterns
const analyzeSeller = async (sellerHistory) => {
  // Calculate risk score based on seller history
  let riskScore = 0;
  
  // Check if seller has multiple listings with similar issues
  const similarIssuesCount = sellerHistory.filter(listing => 
    listing.fraudAnalysis && listing.fraudAnalysis.isFraudulent
  ).length;
  
  if (similarIssuesCount > 3) {
    riskScore += 40;
  } else if (similarIssuesCount > 1) {
    riskScore += 20;
  }
  
  // Check for pattern of short ownership periods
  const shortOwnershipCount = sellerHistory.filter(listing => listing.ownershipPeriod < 6).length;
  if (shortOwnershipCount > 2) {
    riskScore += 30;
  }
  
  // Check for pattern of price anomalies
  const priceAnomalyCount = sellerHistory.filter(listing => 
    listing.fraudAnalysis && listing.fraudAnalysis.indicators.some(i => i.type === 'price_anomaly')
  ).length;
  
  if (priceAnomalyCount > 2) {
    riskScore += 25;
  }
  
  return {
    riskScore: Math.min(riskScore, 100),
    riskLevel: riskScore > 70 ? 'عالي جداً' : riskScore > 40 ? 'عالي' : riskScore > 20 ? 'متوسط' : 'منخفض',
    suspiciousListingsCount: similarIssuesCount,
    suspiciousPatterns: {
      shortOwnership: shortOwnershipCount > 1,
      priceAnomalies: priceAnomalyCount > 1,
      multipleListings: similarIssuesCount > 3
    }
  };
};

module.exports = {
  detectFraud,
  detectPriceAnomaly,
  generateFraudReport,
  analyzeSeller
};

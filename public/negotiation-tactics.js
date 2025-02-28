/**
 * Negotiation Tactics Module
 * Provides real-time analysis of negotiation tactics and counter-strategy recommendations
 */

// Negotiation tactics library
const NEGOTIATION_TACTICS = {
    // Price Anchoring Tactics
    anchoring: {
        id: 'anchoring',
        name: 'الترسيخ السعري',
        description: 'تقديم سعر أولي مرتفع أو منخفض جداً للتأثير على تصورات الطرف الآخر',
        examples: [
            'هذا العقار يستحق مليون ريال على الأقل',
            'لن أدفع أكثر من نصف المبلغ المطلوب'
        ],
        counterStrategies: [
            'استخدم معلومات السوق الموثوقة لتحديد القيمة الحقيقية',
            'قم بإعادة تأطير المحادثة حول القيمة وليس فقط السعر',
            'قدم عرضاً مضاداً مدعوماً بالحقائق والأرقام'
        ]
    },
    
    // Time Pressure Tactics
    timePressure: {
        id: 'timePressure',
        name: 'ضغط الوقت',
        description: 'خلق شعور بالإلحاح للضغط على الطرف الآخر لاتخاذ قرار سريع',
        examples: [
            'لدي مشتري آخر سيوقع العقد غداً',
            'هذا العرض صالح لمدة 24 ساعة فقط'
        ],
        counterStrategies: [
            'حافظ على هدوئك واطلب وقتاً للتفكير',
            'اطلب إثباتات على ادعاءات الإلحاح',
            'كن مستعداً للانسحاب إذا استمر الضغط غير المبرر'
        ]
    },
    
    // Strategic Silence
    strategicSilence: {
        id: 'strategicSilence',
        name: 'الصمت الاستراتيجي',
        description: 'استخدام فترات الصمت لجعل الطرف الآخر يشعر بعدم الارتياح ويقدم تنازلات',
        examples: [
            '...',
            'أحتاج لوقت للتفكير في هذا العرض'
        ],
        counterStrategies: [
            'لا تملأ الفراغ بتنازلات غير ضرورية',
            'استخدم الصمت كفرصة لإعادة تقييم موقفك',
            'اطرح أسئلة مفتوحة لاستئناف المحادثة'
        ]
    },
    
    // Emotional Appeal
    emotionalAppeal: {
        id: 'emotionalAppeal',
        name: 'النداء العاطفي',
        description: 'استخدام العواطف للتأثير على قرارات الطرف الآخر',
        examples: [
            'هذا المنزل سيكون مثالياً لأطفالك',
            'أحتاج حقاً لبيع هذا العقار بسبب ظروفي العائلية'
        ],
        counterStrategies: [
            'ركز على الحقائق والأرقام بدلاً من العواطف',
            'تعاطف مع الموقف دون تقديم تنازلات غير مبررة',
            'خذ وقتاً للتفكير بعيداً عن الضغط العاطفي'
        ]
    },
    
    // Limited Authority
    limitedAuthority: {
        id: 'limitedAuthority',
        name: 'السلطة المحدودة',
        description: 'الادعاء بالحاجة للرجوع لشخص آخر لاتخاذ القرار النهائي',
        examples: [
            'يجب أن أتحدث مع شريكي أولاً',
            'لا أستطيع تجاوز هذا السعر دون موافقة المالك'
        ],
        counterStrategies: [
            'اطلب التحدث مباشرة مع صاحب القرار',
            'قدم عرضاً نهائياً يتطلب إجابة محددة',
            'استخدم نفس التكتيك بقول أنك أيضاً تحتاج لمراجعة قرارك'
        ]
    },
    
    // Nibbling
    nibbling: {
        id: 'nibbling',
        name: 'طلبات متتالية صغيرة',
        description: 'طلب تنازلات صغيرة متتالية بعد الاتفاق المبدئي',
        examples: [
            'ما رأيك في تضمين الأثاث أيضاً بنفس السعر؟',
            'هل يمكن إضافة بند تسليم المفاتيح مبكراً؟'
        ],
        counterStrategies: [
            'حدد كل شروط الاتفاق مسبقاً وبشكل واضح',
            'اشترط تعويضات مقابل أي إضافات جديدة',
            'كن حازماً في رفض الطلبات غير المبررة'
        ]
    }
};

// Detect negotiation tactics in a conversation
function detectNegotiationTactics(text) {
    // This is a simplified client-side detection
    // The actual implementation would use the AI-powered backend
    
    const detectedTactics = [];
    
    // Simple keyword matching for demonstration
    Object.values(NEGOTIATION_TACTICS).forEach(tactic => {
        const score = calculateTacticScore(text, tactic);
        if (score > 30) {
            detectedTactics.push({
                id: tactic.id,
                name: tactic.name,
                confidence: score,
                description: tactic.description,
                examples: tactic.examples,
                counterStrategies: tactic.counterStrategies
            });
        }
    });
    
    return detectedTactics;
}

// Calculate a simple matching score for a tactic
function calculateTacticScore(text, tactic) {
    let score = 0;
    const textLower = text.toLowerCase();
    
    // Check examples for matches
    tactic.examples.forEach(example => {
        if (textLower.includes(example.toLowerCase())) {
            score += 50;
        }
    });
    
    // Add additional heuristics here
    
    return Math.min(score, 100);
}

// Generate counter-strategy recommendations
function generateCounterStrategies(detectedTactics) {
    const strategies = [];
    
    detectedTactics.forEach(tactic => {
        const tacticInfo = NEGOTIATION_TACTICS[tactic.id];
        if (tacticInfo) {
            strategies.push({
                tacticName: tactic.name,
                strategies: tacticInfo.counterStrategies
            });
        }
    });
    
    return strategies;
}

// Display negotiation tactics analysis
function displayTacticsAnalysis(detectedTactics) {
    const counterStrategies = generateCounterStrategies(detectedTactics);
    
    let message = `
    <div class="ai-analysis tactics-analysis">
        <div class="analysis-header">
            <i class="fas fa-chess"></i>
            <h4>تحليل تكتيكات التفاوض</h4>
        </div>
        <div class="analysis-content">
            <div class="detected-tactics">
                <h5>التكتيكات المكتشفة:</h5>
                ${detectedTactics.length > 0 ? `
                <ul>
                    ${detectedTactics.map(tactic => `
                        <li>
                            <div class="tactic-header">
                                <strong>${tactic.name}</strong>
                                <span class="confidence">(${tactic.confidence}%)</span>
                            </div>
                            <p>${tactic.description}</p>
                        </li>
                    `).join('')}
                </ul>
                ` : '<p>لم يتم اكتشاف تكتيكات محددة في هذه المحادثة.</p>'}
            </div>
            
            ${counterStrategies.length > 0 ? `
            <div class="counter-strategies">
                <h5>استراتيجيات مضادة مقترحة:</h5>
                <ul>
                    ${counterStrategies.map(strategy => `
                        <li>
                            <strong>للرد على ${strategy.tacticName}:</strong>
                            <ul>
                                ${strategy.strategies.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
    </div>
    `;
    
    // Add the message to the chat
    addMessageToChat('العقارات نيجو', message, 'ai');
    
    // Scroll to the bottom
    scrollToBottom();
}

// Analyze text for negotiation tactics
function analyzeNegotiationTactics(text) {
    // For real implementation, this would call the server API
    fetch('/api/negotiation-tactics', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
    })
    .then(response => response.json())
    .then(data => {
        displayTacticsAnalysis(data.tactics);
    })
    .catch(error => {
        console.error('Error analyzing negotiation tactics:', error);
        // Fallback to client-side detection
        const detectedTactics = detectNegotiationTactics(text);
        displayTacticsAnalysis(detectedTactics);
    });
}

// Export module functions
window.negotiationTactics = {
    analyze: analyzeNegotiationTactics,
    detect: detectNegotiationTactics,
    getTacticInfo: (id) => NEGOTIATION_TACTICS[id]
};

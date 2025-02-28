const negotiationKnowledge = {
    greetings: {
        welcome: "مرحباً بك! أنا مساعدك في التفاوض والعقارات. كيف يمكنني مساعدتك اليوم؟",
        goodbye: "شكراً لك على التواصل. أتمنى أن أكون قد ساعدتك. إلى اللقاء!"
    },
    
    realEstate: {
        pricing: {
            question: "كيف أحدد السعر المناسب للعقار؟",
            answer: "لتحديد السعر المناسب للعقار، يجب مراعاة العوامل التالية:\n" +
                   "1. دراسة أسعار العقارات المماثلة في المنطقة\n" +
                   "2. موقع العقار وقربه من الخدمات\n" +
                   "3. مساحة العقار وحالته\n" +
                   "4. التسهيلات والمرافق المتوفرة\n" +
                   "5. معدل النمو في المنطقة\n" +
                   "6. جودة البناء ومواد التشطيب\n" +
                   "7. توجيه العقار والإطلالة"
        },
        negotiation: {
            question: "كيف أتفاوض على سعر العقار؟",
            answer: "نصائح للتفاوض الناجح:\n" +
                   "1. اجمع معلومات كافية عن السوق والأسعار\n" +
                   "2. حدد السعر الأقصى الذي يمكنك دفعه\n" +
                   "3. ابدأ بعرض أقل من السعر المطلوب بنسبة معقولة\n" +
                   "4. كن مستعداً للمساومة والحلول الوسط\n" +
                   "5. اطلب تقرير فحص فني للعقار\n" +
                   "6. ناقش شروط السداد والتقسيط\n" +
                   "7. وثق كل الاتفاقات كتابياً"
        },
        inspection: {
            question: "ما هي النقاط المهمة عند فحص العقار؟",
            answer: "النقاط الأساسية لفحص العقار:\n" +
                   "1. سلامة الهيكل الإنشائي\n" +
                   "2. جودة التمديدات الكهربائية والصحية\n" +
                   "3. وجود تشققات أو رطوبة\n" +
                   "4. حالة النوافذ والأبواب\n" +
                   "5. كفاءة نظام التكييف\n" +
                   "6. جودة العزل المائي والحراري\n" +
                   "7. وضع الخدمات المشتركة في المبنى"
        },
        documentation: {
            question: "ما هي الوثائق المطلوبة لشراء عقار؟",
            answer: "الوثائق الضرورية لشراء عقار:\n" +
                   "1. صك الملكية الأصلي\n" +
                   "2. مخطط العقار المعتمد\n" +
                   "3. تصريح البناء\n" +
                   "4. شهادة إتمام البناء\n" +
                   "5. براءة ذمة من الخدمات\n" +
                   "6. وثائق الهوية للبائع والمشتري\n" +
                   "7. عقد البيع الموثق"
        }
    },

    business: {
        deals: {
            question: "كيف أضمن نجاح الصفقة التجارية؟",
            answer: "لضمان نجاح الصفقة:\n" +
                   "1. وثق كل شيء كتابياً\n" +
                   "2. استشر محامي متخصص\n" +
                   "3. ادرس السوق جيداً\n" +
                   "4. تأكد من سلامة الإجراءات القانونية\n" +
                   "5. اطلب الضمانات المناسبة\n" +
                   "6. حدد جدول زمني واضح\n" +
                   "7. احتفظ بنسخ من جميع المستندات"
        },
        payment: {
            question: "ما هي أفضل طرق الدفع الآمنة؟",
            answer: "طرق الدفع الموصى بها:\n" +
                   "1. التحويل البنكي المباشر\n" +
                   "2. الشيكات المصدقة\n" +
                   "3. الدفع من خلال وسيط موثوق\n" +
                   "4. توثيق عملية الدفع رسمياً\n" +
                   "5. الضمان البنكي\n" +
                   "6. خطاب اعتماد مستندي\n" +
                   "7. التقسيط عبر البنوك المعتمدة"
        }
    },

    financing: {
        mortgage: {
            question: "كيف أحصل على تمويل عقاري؟",
            answer: "خطوات الحصول على تمويل عقاري:\n" +
                   "1. تحقق من أهليتك للتمويل\n" +
                   "2. اجمع المستندات المطلوبة\n" +
                   "3. قارن بين عروض البنوك\n" +
                   "4. احسب قدرتك على السداد\n" +
                   "5. ادرس الرسوم والفوائد\n" +
                   "6. اختر نوع التمويل المناسب\n" +
                   "7. استشر مستشار مالي"
        },
        investment: {
            question: "ما هي أفضل استراتيجيات الاستثمار العقاري؟",
            answer: "استراتيجيات الاستثمار العقاري:\n" +
                   "1. شراء وتأجير العقارات\n" +
                   "2. تطوير العقارات وإعادة بيعها\n" +
                   "3. الاستثمار في المشاريع التجارية\n" +
                   "4. الاستثمار في الأراضي\n" +
                   "5. المشاركة في الصناديق العقارية\n" +
                   "6. الاستثمار في العقارات المدرة للدخل\n" +
                   "7. التنويع في المحفظة العقارية"
        }
    }
};

// Function to get response based on query
function getResponse(query) {
    query = query.toLowerCase().trim();
    
    // Check for greetings
    if (query.includes("مرحبا") || query.includes("السلام عليكم")) {
        return negotiationKnowledge.greetings.welcome;
    }
    
    // Check for pricing related queries
    if (query.includes("سعر") || query.includes("تقييم") || query.includes("قيمة")) {
        return negotiationKnowledge.realEstate.pricing.answer;
    }
    
    // Check for negotiation related queries
    if (query.includes("تفاوض") || query.includes("مساومة")) {
        return negotiationKnowledge.realEstate.negotiation.answer;
    }
    
    // Check for inspection related queries
    if (query.includes("فحص") || query.includes("معاينة") || query.includes("تفتيش")) {
        return negotiationKnowledge.realEstate.inspection.answer;
    }
    
    // Check for documentation related queries
    if (query.includes("وثائق") || query.includes("مستندات") || query.includes("أوراق")) {
        return negotiationKnowledge.realEstate.documentation.answer;
    }
    
    // Check for financing related queries
    if (query.includes("تمويل") || query.includes("قرض") || query.includes("رهن")) {
        return negotiationKnowledge.financing.mortgage.answer;
    }
    
    // Check for investment related queries
    if (query.includes("استثمار") || query.includes("عائد") || query.includes("ربح")) {
        return negotiationKnowledge.financing.investment.answer;
    }
    
    // Default response
    return "عذراً، لم أفهم سؤالك. هل يمكنك إعادة صياغته بطريقة أخرى؟";
}

module.exports = { negotiationKnowledge, getResponse };

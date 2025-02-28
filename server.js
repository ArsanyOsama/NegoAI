const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { config, validateEnvironment } = require('./environment-config');
const geminiConfig = require('./gemini-config');

// Import Firebase and other services
let admin;
try {
    admin = require('firebase-admin');
} catch (error) {
    console.warn('Firebase admin SDK not available:', error.message);
}

// Import NLP and fraud detection modules (if available)
let nlpModule, fraudDetection;
try {
    nlpModule = require('./nlp-module');
    fraudDetection = require('./fraud-detection');
} catch (error) {
    console.warn('Some modules could not be loaded:', error.message);
}

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Load environment configuration 
const PORT = config.port || 3002;

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Data stores
const users = new Map(); // Socket ID -> User data
const chatRooms = new Map(); // Room ID -> Room data

// Validate environment variables
const envValidation = validateEnvironment();
if (!envValidation.valid) {
    console.error('Environment validation failed:');
    if (envValidation.missing && envValidation.missing.length > 0) {
        envValidation.missing.forEach(err => {
            console.error(`- Missing: ${err}`);
        });
    }
}

// Initialize Firebase if available
let db;
if (admin) {
    try {
        // Initialize Firebase admin with credential if not already initialized
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault()
            });
        }
        db = admin.firestore();
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

// Initialize chat rooms with AI personalities
const initializeChatRooms = () => {
    const rooms = [
        {
            id: 'general',
            name: 'General Chat',
            aiPersonality: 'friendly and helpful assistant'
        },
        {
            id: 'tech',
            name: 'Tech Support',
            aiPersonality: 'technical expert who helps solve computer and programming problems'
        },
        {
            id: 'creative',
            name: 'Creative Corner',
            aiPersonality: 'creative and artistic assistant who helps with design and creative ideas'
        },
        {
            id: 'business',
            name: 'Business Talk',
            aiPersonality: 'professional business consultant who helps with business strategy and advice'
        }
    ];

    rooms.forEach(room => {
        chatRooms.set(room.id, {
            ...room,
            messages: [],
            users: new Set()
        });
    });
};

initializeChatRooms();

// Get AI response using Gemini
async function getAIResponse(message, roomId) {
    const room = chatRooms.get(roomId);
    try {
        // Get the appropriate model configuration based on room personality
        let configType = 'balanced';
        if (room.aiPersonality.includes('creative') || room.aiPersonality.includes('مبدع')) {
            configType = 'creative';
        } else if (room.aiPersonality.includes('precise') || room.aiPersonality.includes('دقيق')) {
            configType = 'precise';
        } else if (room.aiPersonality.includes('negotiation') || room.aiPersonality.includes('تفاوض')) {
            configType = 'negotiation';
        }
        
        const model = geminiConfig.getConfiguredModel(configType);
        const prompt = `You are a ${room.aiPersonality}. Keep responses concise and relevant. User message: ${message}`;
        
        return await geminiConfig.generateContentSafely(model, prompt, (errorMessage) => {
            console.error('AI Response Error:', errorMessage);
        });
    } catch (error) {
        console.error('Error getting AI response:', error);
        return "Sorry, I couldn't process that request. Please try again.";
    }
}

// Create specialized negotiation assistant using Gemini AI
async function getNegotiationAdvice(situation) {
    try {
        console.log('DEBUG - getNegotiationAdvice called with situation:', situation);
        
        // Get the Gemini model directly instead of using getConfiguredModel
        const model = geminiConfig.getGeminiModel();
        
        if (!model) {
            console.error('DEBUG - Gemini model is null, cannot generate advice');
            return "عذرًا، حدث خطأ في الاتصال بالذكاء الاصطناعي. الرجاء المحاولة مرة أخرى.";
        }
        
        console.log('DEBUG - Creating negotiation prompt');
        const prompt = geminiConfig.createNegotiationPrompt(situation);
        
        console.log('DEBUG - Generating content with prompt');
        return await geminiConfig.generateContentSafely(model, prompt, (errorMessage) => {
            console.error('DEBUG - Negotiation Advice Error:', errorMessage);
        });
    } catch (error) {
        console.log (error);
        console.error('DEBUG - Error getting negotiation advice:', error);
        return "عذرًا، حدث خطأ في معالجة طلبك. الرجاء المحاولة مرة أخرى.";
    }
}

// Firebase Auth Middleware
const authenticateUser = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// API Routes
app.post('/api/messages', authenticateUser, async (req, res) => {
    try {
        const { message } = req.body;
        const { uid, name } = req.user;
        
        await db.collection('messages').add({
            text: message,
            userId: uid,
            username: name,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add specialized negotiation endpoint
app.post('/api/negotiation', async (req, res) => {
    try {
        const { situation } = req.body;
        
        if (!situation || situation.trim() === '') {
            return res.status(400).json({ 
                error: 'يرجى تقديم موقف للتحليل' 
            });
        }
        
        const advice = await getNegotiationAdvice(situation);
        
        res.status(200).json({ 
            success: true,
            advice: advice 
        });
    } catch (error) {
        console.error('Error in negotiation endpoint:', error);
        res.status(500).json({ 
            error: 'حدث خطأ في معالجة الطلب', 
            details: error.message 
        });
    }
});

// Add NLP and fraud detection endpoints
app.post('/api/analyze-sentiment', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'النص مطلوب للتحليل' });
        }
        
        const sentiment = await nlpModule.analyzeSentiment(text);
        res.status(200).json({ success: true, sentiment });
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        res.status(500).json({ error: 'حدث خطأ في تحليل المشاعر' });
    }
});

app.post('/api/detect-fraud', async (req, res) => {
    try {
        const { listing } = req.body;
        
        if (!listing || typeof listing !== 'object') {
            return res.status(400).json({ error: 'معلومات العقار مطلوبة للتحليل' });
        }
        
        const fraudAnalysis = fraudDetection.detectFraud(listing);
        
        // If high risk, generate detailed report
        let detailedReport = null;
        if (fraudAnalysis.riskScore > 50) {
            detailedReport = await fraudDetection.generateFraudReport(listing, fraudAnalysis);
        }
        
        res.status(200).json({ 
            success: true, 
            fraudAnalysis,
            detailedReport
        });
    } catch (error) {
        console.error('Error detecting fraud:', error);
        res.status(500).json({ error: 'حدث خطأ في تحليل الاحتيال' });
    }
});

app.post('/api/extract-entities', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'النص مطلوب لاستخراج الكيانات' });
        }
        
        const entities = nlpModule.extractEntities(text);
        res.status(200).json({ success: true, entities });
    } catch (error) {
        console.error('Error extracting entities:', error);
        res.status(500).json({ error: 'حدث خطأ في استخراج الكيانات' });
    }
});

app.post('/api/market-insights', async (req, res) => {
    try {
        const { propertyDetails } = req.body;
        
        if (!propertyDetails || typeof propertyDetails !== 'object') {
            return res.status(400).json({ error: 'تفاصيل العقار مطلوبة للتحليل' });
        }
        
        const insights = await nlpModule.generateMarketInsights(propertyDetails);
        res.status(200).json({ success: true, insights });
    } catch (error) {
        console.error('Error generating market insights:', error);
        res.status(500).json({ error: 'حدث خطأ في إنشاء تحليل السوق' });
    }
});

app.post('/api/analyze-negotiation', async (req, res) => {
    try {
        const { conversation } = req.body;
        
        if (!conversation || conversation.trim() === '') {
            return res.status(400).json({ error: 'نص المحادثة مطلوب للتحليل' });
        }
        
        const analysis = await nlpModule.analyzeNegotiationTactics(conversation);
        res.status(200).json({ success: true, analysis });
    } catch (error) {
        console.error('Error analyzing negotiation:', error);
        res.status(500).json({ error: 'حدث خطأ في تحليل المفاوضة' });
    }
});

// New API endpoints for market insights
app.get('/api/market-data', async (req, res) => {
    try {
        // This would typically come from a database or external API
        // Mocking response for demonstration
        const marketData = {
            locations: {
                'الرياض': {
                    averagePrice: 1200000,
                    yearlyChange: 5.2,
                    forecast: 3.1,
                    demand: 'high'
                },
                'جدة': {
                    averagePrice: 950000,
                    yearlyChange: 2.8,
                    forecast: 1.5,
                    demand: 'medium'
                },
                'الدمام': {
                    averagePrice: 850000,
                    yearlyChange: 3.5,
                    forecast: 2.0,
                    demand: 'medium-high'
                }
            },
            propertyTypes: {
                'شقة': {
                    averagePrice: 700000,
                    yearlyChange: 3.0,
                    forecast: 1.8,
                    demand: 'high'
                },
                'فيلا': {
                    averagePrice: 1800000,
                    yearlyChange: 4.2,
                    forecast: 2.5,
                    demand: 'medium-high'
                },
                'أرض': {
                    averagePrice: 1200000,
                    yearlyChange: 6.5,
                    forecast: 4.0,
                    demand: 'high'
                }
            },
            insights: [
                {
                    title: 'ارتفاع الطلب على الشقق في الرياض',
                    summary: 'شهدت شقق الرياض ارتفاعاً في الطلب بنسبة 12% خلال الربع الأخير'
                },
                {
                    title: 'تباطؤ نمو أسعار الفلل في جدة',
                    summary: 'انخفض معدل نمو أسعار الفلل في جدة إلى 1.8% مقارنة بـ 3.5% في العام السابق'
                }
            ]
        };
        
        res.json(marketData);
    } catch (error) {
        console.error('Error fetching market data:', error);
        res.status(500).json({ error: 'Error fetching market data' });
    }
});

app.post('/api/market-insights', async (req, res) => {
    try {
        const { location, propertyType } = req.body;
        
        // This would typically use the Gemini AI to generate insights
        // Mocking response for demonstration
        const insights = {
            summary: `سوق العقارات في ${location} للعقارات من نوع ${propertyType} يشهد نمواً مستقراً مع زيادة متوسطة في الطلب. الأسعار مستقرة مع توقعات بارتفاع طفيف في الأشهر القادمة.`,
            averagePrice: location === 'الرياض' ? 1200000 : (location === 'جدة' ? 950000 : 850000),
            yearlyChange: location === 'الرياض' ? 5.2 : (location === 'جدة' ? 2.8 : 3.5),
            forecast: location === 'الرياض' ? 3.1 : (location === 'جدة' ? 1.5 : 2.0),
            factors: [
                {
                    name: 'البنية التحتية الجديدة',
                    impact: '+5%'
                },
                {
                    name: 'المساحة',
                    impact: '+3%'
                },
                {
                    name: 'عمر العقار',
                    impact: '-2%'
                }
            ],
            negotiationTips: [
                `قيمة العقارات في ${location} تتأثر بشكل كبير بالقرب من المرافق الخدمية، استخدم ذلك في التفاوض`,
                'متوسط مدة عرض العقار في السوق 45 يوماً، يمكن استخدام هذه المعلومة للضغط على البائعين المستعجلين',
                'عقارات مماثلة تباع بخصم 5-8% عن السعر المعلن، استخدم هذا كنقطة انطلاق للتفاوض',
                'معظم البائعين مستعدون للتنازل عن 3-5% من السعر المبدئي'
            ]
        };
        
        res.json(insights);
    } catch (error) {
        console.error('Error generating market insights:', error);
        res.status(500).json({ error: 'Error generating market insights' });
    }
});

app.post('/api/price-prediction', async (req, res) => {
    try {
        const { location, propertyType, propertyDetails } = req.body;
        
        // This would typically use a machine learning model or AI
        // Mocking response for demonstration
        const prediction = {
            estimatedValue: location === 'الرياض' ? 1250000 : (location === 'جدة' ? 980000 : 870000),
            confidenceInterval: {
                min: location === 'الرياض' ? 1180000 : (location === 'جدة' ? 920000 : 820000),
                max: location === 'الرياض' ? 1320000 : (location === 'جدة' ? 1040000 : 920000)
            },
            similarProperties: [
                {
                    price: location === 'الرياض' ? 1230000 : (location === 'جدة' ? 960000 : 860000),
                    description: `${propertyType} في حي مشابه في ${location}`,
                    daysOnMarket: 32
                },
                {
                    price: location === 'الرياض' ? 1280000 : (location === 'جدة' ? 995000 : 885000),
                    description: `${propertyType} بمواصفات مماثلة في ${location}`,
                    daysOnMarket: 18
                }
            ],
            priceFactors: [
                {
                    factor: 'الموقع',
                    impact: '+5%'
                },
                {
                    factor: 'المساحة',
                    impact: '+3%'
                },
                {
                    factor: 'عمر العقار',
                    impact: '-2%'
                }
            ]
        };
        
        res.json(prediction);
    } catch (error) {
        console.error('Error generating price prediction:', error);
        res.status(500).json({ error: 'Error generating price prediction' });
    }
});

app.post('/api/market-trends', async (req, res) => {
    try {
        const { location, propertyType, timeframe } = req.body;
        
        // This would typically come from a database or external API
        // Mocking response for demonstration
        const basePrice = location === 'الرياض' ? 1200000 : (location === 'جدة' ? 950000 : 850000);
        const trendPoints = [];
        
        // Generate 12 months of data
        for (let i = 0; i < 12; i++) {
            // Add some variability to the trend
            const randomVariation = (Math.random() * 0.04) - 0.02; // -2% to +2%
            const month = new Date();
            month.setMonth(month.getMonth() - (11 - i));
            
            // Create an upward trend with slight randomness
            const price = basePrice * (1 + (0.003 * i) + randomVariation);
            
            trendPoints.push({
                date: month.toISOString().substring(0, 7), // YYYY-MM format
                price: Math.round(price)
            });
        }
        
        const trends = {
            trendPoints,
            overallChange: {
                percentage: ((trendPoints[11].price - trendPoints[0].price) / trendPoints[0].price * 100).toFixed(1),
                absolute: trendPoints[11].price - trendPoints[0].price
            },
            volatility: 'منخفضة',
            pricePerSquareMeter: Math.round(basePrice / 120), // Assuming 120 sq m average size
            comparisonToMarket: 'أعلى من متوسط السوق بنسبة 2.5%'
        };
        
        res.json(trends);
    } catch (error) {
        console.error('Error fetching market trends:', error);
        res.status(500).json({ error: 'Error fetching market trends' });
    }
});

app.post('/api/negotiation-tactics', async (req, res) => {
    try {
        const { text } = req.body;
        
        // This would typically use the Gemini AI for detection
        // For now, using the NLP module
        const tactics = await nlpModule.analyzeNegotiationTactics(text);
        
        res.json({ tactics });
    } catch (error) {
        console.error('Error analyzing negotiation tactics:', error);
        res.status(500).json({ error: 'Error analyzing negotiation tactics' });
    }
});

// Knowledge base for real estate and negotiations
const negotiationResponses = {
    pricing: "لتحديد السعر المناسب للعقار يجب مراعاة:\n1. موقع العقار\n2. المساحة والتشطيب\n3. أسعار العقارات المماثلة\n4. حالة السوق العقاري",
    negotiation: "نصائح للتفاوض الناجح:\n1. اجمع معلومات كافية\n2. حدد السعر المستهدف\n3. استمع جيداً للطرف الآخر\n4. كن مرناً في التفاوض",
    payment: "أفضل طرق الدفع الآمنة:\n1. التحويل البنكي\n2. الشيكات المصدقة\n3. التوثيق الرسمي للمعاملة",
    documents: "الوثائق المطلوبة للبيع والشراء:\n1. عقد البيع\n2. صك الملكية\n3. إثبات الهوية\n4. الموافقات الرسمية"
};

// Function to get response based on keywords
function getNegoResponse(message) {
    message = message.toLowerCase();
    if (message.includes('سعر') || message.includes('تكلفة') || message.includes('كام')) {
        return negotiationResponses.pricing;
    }
    if (message.includes('تفاوض') || message.includes('مساومة') || message.includes('اتفق')) {
        return negotiationResponses.negotiation;
    }
    if (message.includes('دفع') || message.includes('فلوس') || message.includes('الفلوس')) {
        return negotiationResponses.payment;
    }
    if (message.includes('وثائق') || message.includes('اوراق') || message.includes('ورق')) {
        return negotiationResponses.documents;
    }
    return null;
}

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('user_join', async (userData) => {
        try {
            console.log('User joined:', userData);
            
            // Store user data in the users Map
            users.set(socket.id, {
                username: userData.username || 'زائر',
                uid: userData.uid || 'guest',
                isGuest: userData.isAnonymous || false
            });
            
            socket.emit('connection_success', { message: 'Connected successfully' });
        } catch (error) {
            console.error('Error handling user join:', error);
            socket.emit('error', { message: 'Failed to join' });
        }
    });

    socket.on('join_room', async (data) => {
        try {
            // Handle both roomId string format and object format with room property
            const roomId = typeof data === 'string' ? data : data.room;
            const user = users.get(socket.id) || (data.user ? data.user : null);
            
            if (!user) {
                socket.emit('error', { message: 'User not authenticated' });
                return;
            }
            
            console.log(`User ${user.username} (${socket.id}) joining room: ${roomId}`);
            
            // Leave current rooms if any
            const currentRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
            for (const room of currentRooms) {
                socket.leave(room);
                console.log(`User ${user.username} left room: ${room}`);
            }
            
            // Join new room
            socket.join(roomId);
            
            // Get or create room
            let room = chatRooms.get(roomId);
            if (!room) {
                room = {
                    id: roomId,
                    name: roomId,
                    users: new Map(),
                    messages: [],
                    aiPersonality: 'friendly AI assistant specializing in real estate negotiation'
                };
                chatRooms.set(roomId, room);
            }
            
            // Add user to room
            room.users.set(socket.id, user);
            
            // Notify room of new user
            socket.to(roomId).emit('user_joined', {
                username: user.username,
                userId: socket.id,
                timestamp: new Date().toISOString()
            });
            
            // Send success event back to user
            socket.emit('room_joined', {
                room: roomId,
                timestamp: new Date().toISOString()
            });
            
            // Send welcome message
            socket.emit('new_message', {
                message: `مرحباً بك ${user.username} في Nego AI! يمكنك سؤالي عن العقارات والتفاوض باستخدام @nego`,
                sender: 'Nego AI',
                userId: 'nego-ai',
                timestamp: new Date().toISOString(),
                roomId
            });
            
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    socket.on('send_message', async (data) => {
        try {
            const { message, roomId } = data;
            const user = users.get(socket.id);
            
            if (!user) {
                socket.emit('error', { message: 'User not found' });
                return;
            }
            
            const username = user.username;
            console.log(`DEBUG - Received message from ${username}: ${message}`);

            // First, echo the message back to all clients in the room
            io.to(roomId).emit('new_message', {
                message,
                sender: username,
                userId: socket.id,
                timestamp: new Date().toISOString(),
                roomId
            });

            // Check for AI queries with prefixes
            if (message.includes('@gemini') || message.includes('@nego') || message.includes('@negotiate')) {
                try {
                    console.log('DEBUG - Processing message with AI prefix:', message);
                    
                    // Extract the query part
                    let query = message;
                    if (message.includes('@gemini')) {
                        query = message.substring(message.indexOf('@gemini') + 8).trim();
                    } else if (message.includes('@negotiate')) {
                        query = message.substring(message.indexOf('@negotiate') + 11).trim();
                    } else if (message.includes('@nego')) {
                        query = message.substring(message.indexOf('@nego') + 6).trim();
                    }
                    
                    console.log('DEBUG - Extracted query:', query);
                    
                    // If no query provided, send a default message
                    if (!query) {
                        io.to(roomId).emit('new_message', {
                            message: 'يرجى تقديم استفسار أو موقف تفاوضي بعد @nego أو @gemini',
                            sender: 'Nego AI',
                            userId: 'system',
                            timestamp: new Date().toISOString(),
                            roomId,
                            type: 'system'
                        });
                        return;
                    }
                    
                    // Get advice from AI
                    console.log('DEBUG - Getting negotiation advice');
                    const advice = await getNegotiationAdvice(query);
                    console.log('DEBUG - Received advice from AI');
                    
                    // Send the AI response
                    io.to(roomId).emit('new_message', {
                        message: advice,
                        sender: 'Nego AI',
                        userId: 'system',
                        timestamp: new Date().toISOString(),
                        roomId,
                        type: 'ai'
                    });
                    
                } catch (aiError) {
                    console.error('DEBUG - Error processing AI message:', aiError);
                    
                    // Send error message
                    socket.emit('new_message', {
                        message: 'حدث خطأ أثناء معالجة الرسالة. يرجى المحاولة مرة أخرى.',
                        sender: 'Nego AI',
                        userId: 'system',
                        timestamp: new Date().toISOString(),
                        roomId,
                        type: 'system'
                    });
                }
            }
            
            const messageData = {
                id: Date.now().toString(),
                userId: socket.id,
                username: username,
                message: message,
                timestamp: new Date().toISOString()
            };

            // Save message to room history
            const room = chatRooms.get(roomId);
            room.messages.push(messageData);
            if (room.messages.length > 100) {
                room.messages.shift(); // Keep only last 100 messages
            }

            // Get and send AI response
            const aiResponse = await getAIResponse(message, roomId);
            const aiMessageData = {
                id: Date.now().toString(),
                userId: 'ai',
                username: room.name + ' AI',
                message: aiResponse,
                timestamp: new Date().toISOString()
            };

            room.messages.push(aiMessageData);
            io.to(roomId).emit('new_message', {
                roomId,
                ...aiMessageData
            });

            // Save to Firebase
            try {
                if (db) {
                    await db.collection('chat_rooms').doc(roomId).collection('messages').add({
                        ...messageData,
                        aiResponse: aiMessageData
                    });
                }
            } catch (error) {
                console.error('Error saving to Firebase:', error);
            }

        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    socket.on('analyze_negotiation', async (data) => {
        try {
            const { situation, roomId } = data;
            const user = users.get(socket.id);
            
            if (!user) {
                socket.emit('error', { message: 'User not found' });
                return;
            }
            
            const username = user.username;
            console.log(`Received negotiation analysis request from ${username}: ${situation}`);

            // Process the negotiation situation using Gemini API
            try {
                console.log('Processing negotiation situation for analysis:', situation);
                
                // Get specialized negotiation advice
                const advice = await getNegotiationAdvice(situation);
                
                // Send the advice back to the client
                io.to(roomId).emit('new_message', {
                    message: advice,
                    sender: 'Nego AI',
                    userId: 'system',
                    timestamp: new Date().toISOString(),
                    roomId,
                    type: 'ai'
                });
                
                console.log('Sent negotiation advice to client');
            } catch (analysisError) {
                console.error('Error analyzing negotiation situation:', analysisError);
                
                // Send error message to client
                socket.emit('new_message', {
                    message: 'حدث خطأ أثناء تحليل موقف التفاوض. يرجى المحاولة مرة أخرى.',
                    sender: 'Nego AI',
                    userId: 'system',
                    timestamp: new Date().toISOString(),
                    roomId,
                    type: 'system'
                });
            }
        } catch (error) {
            console.error('Error handling negotiation analysis request:', error);
            socket.emit('error', { message: 'Failed to process negotiation situation' });
        }
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            // Remove user from all rooms
            chatRooms.forEach(room => {
                if (room.users.has(socket.id)) {
                    room.users.delete(socket.id);
                    io.to(room.id).emit('user_left_room', {
                        roomId: room.id,
                        userId: socket.id,
                        username: user.username
                    });
                }
            });
            users.delete(socket.id);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

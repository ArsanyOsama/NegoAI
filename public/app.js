// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messagesContainer = document.getElementById('messagesContainer');
    const currentUser = document.getElementById('currentUser');
    const userAvatar = document.getElementById('userAvatar');
    const logoutButton = document.getElementById('logoutButton');
    const messageContainer = document.getElementById('messages');
    const negotiationSituation = document.getElementById('negotiationSituation');
    const getNegotiationAdviceBtn = document.getElementById('getNegotiationAdvice');

    // Initialize Socket.io
    const socket = io();

    // State variables
    let currentRoom = 'general';
    let userData = null;

    // Update UI when user signs in
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            userData = {
                uid: user.uid,
                username: user.displayName || 'Anonymous',
                photoURL: user.photoURL
            };

            // Update user info
            currentUser.textContent = userData.username;
            
            if (userData.photoURL) {
                userAvatar.innerHTML = `<img src="${userData.photoURL}" alt="${userData.username}" style="width: 100%; height: 100%; border-radius: 50%;">`;
            } else {
                userAvatar.textContent = userData.username.charAt(0).toUpperCase();
            }

            // Join default room
            socket.emit('join_room', { room: currentRoom, user: userData });
        }
    });

    // Logout handler
    logoutButton.addEventListener('click', () => {
        firebase.auth().signOut();
    });

    // Send message function
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message && socket) {
            console.log('Sending message to server:', message);
            
            // Emit message to server
            socket.emit('send_message', {
                message: message,
                roomId: currentRoom || 'default',
                username: userData ? userData.username : 'زائر',
                userId: userData ? userData.uid : 'guest'
            });
            
            // Add user message to chat immediately for better UX
            appendMessage({
                message: message,
                username: userData ? userData.username : 'زائر',
                type: 'user'
            });
            
            // Clear input
            messageInput.value = '';
        } else {
            console.log('Cannot send message: empty message or socket not connected');
        }
    }

    // Send button click handler
    sendButton.addEventListener('click', sendMessage);

    // Enter key press handler
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Handle incoming messages
    socket.on('new_message', (data) => {
        console.log('Received message:', data);
        
        // Add missing properties to ensure messages display correctly
        if (!data.userId && data.sender === 'Nego AI') {
            data.userId = 'nego-ai';
        } else if (!data.userId && data.sender === 'Gemini AI') {
            data.userId = 'gemini-ai';
        }
        
        if (!data.roomId) {
            data.roomId = currentRoom;
        }
        
        appendMessage(data);
    });
    
    // Listen for errors
    socket.on('error', (data) => {
        console.error('Socket error:', data);
        appendMessage({
            message: `Error: ${data.message}`,
            sender: 'System',
            userId: 'system',
            timestamp: new Date().toISOString(),
            roomId: currentRoom
        });
    });

    // Append message to chat
    function appendMessage(message) {
        console.log('Appending message:', message); // Debug log
        
        const messageElement = document.createElement('div');
        const isOwnMessage = message.userId === userData?.uid;
        const isAI = message.sender === 'Nego AI' || message.sender === 'Gemini AI';
        
        // Set the appropriate class based on message sender
        messageElement.className = `message ${isOwnMessage ? 'sent' : isAI ? 'ai' : 'received'}`;
        
        // Create message content with correct neon styling
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="message-sender">${message.sender || 'Unknown'}</div>
                <div class="message-text">${message.message.replace(/\n/g, '<br>')}</div>
            </div>
        `;
        
        // Add message to container and scroll into view
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Ensure the message has the proper glow effect
        if (isOwnMessage) {
            messageElement.querySelector('.message-content').style.boxShadow = '0 0 15px var(--neon-green)';
        } else if (isAI) {
            messageElement.querySelector('.message-content').style.boxShadow = '0 0 15px var(--neon-violet)';
        } else {
            messageElement.querySelector('.message-content').style.boxShadow = '0 0 15px var(--neon-blue)';
        }
    }

    // Room click handlers
    document.querySelectorAll('.room-item').forEach(room => {
        room.addEventListener('click', () => {
            const roomId = room.getAttribute('data-room');
            if (roomId !== currentRoom) {
                socket.emit('leave_room', currentRoom);
                socket.emit('join_room', roomId);
                currentRoom = roomId;
                
                document.querySelectorAll('.room-item').forEach(r => r.classList.remove('active'));
                room.classList.add('active');
                
                messagesContainer.innerHTML = `
                    <div class="welcome-message">
                        مرحباً بك في Nego AI! يمكنك سؤالي عن العقارات والتفاوض باستخدام @nego
                    </div>
                `;
            }
        });
    });

    // Advanced Tools Toggle
    const advancedToolsToggle = document.querySelector('.advanced-tools-toggle');
    const advancedTools = document.querySelector('.advanced-tools');
    
    if (advancedToolsToggle && advancedTools) {
        advancedToolsToggle.addEventListener('click', function() {
            advancedTools.classList.toggle('hidden');
            const icon = advancedToolsToggle.querySelector('i');
            if (icon) {
                if (advancedTools.classList.contains('hidden')) {
                    icon.className = 'fas fa-chevron-down';
                } else {
                    icon.className = 'fas fa-chevron-up';
                }
            }
        });
    }
    
    // Initialize as hidden
    if (advancedTools) {
        advancedTools.classList.add('hidden');
    }
    
    // Fraud Detection Form
    const fraudDetectionForm = document.getElementById('fraud-detection-form');
    if (fraudDetectionForm) {
        fraudDetectionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const propertyDescription = document.getElementById('property-description').value;
            const price = document.getElementById('property-price').value;
            const location = document.getElementById('property-location').value;
            const sellerInfo = document.getElementById('seller-info').value;
            const propertyType = document.getElementById('property-type').value;
            
            // Show loading state
            const button = fraudDetectionForm.querySelector('button');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحليل...';
            button.disabled = true;
            
            // Call the fraud detection API
            fetch('/api/fraud-detection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    propertyDescription,
                    price,
                    location,
                    sellerInfo,
                    propertyType
                })
            })
            .then(response => response.json())
            .then(data => {
                // Reset button state
                button.innerHTML = originalText;
                button.disabled = false;
                
                // Show results in the chat
                const riskScore = data.riskScore;
                const riskLevel = data.riskLevel;
                const anomalies = data.anomalies;
                const recommendations = data.recommendations;
                
                // Format the response
                let message = `
                <div class="ai-analysis">
                    <div class="analysis-header">
                        <i class="fas fa-shield-alt"></i>
                        <h4>تحليل مخاطر الاحتيال</h4>
                    </div>
                    <div class="analysis-content">
                        <div class="risk-score">
                            <span class="label">درجة المخاطرة:</span>
                            <span class="score ${getRiskClass(riskScore)}">${riskScore}% - ${riskLevel}</span>
                        </div>
                        <div class="anomalies">
                            <h5>المؤشرات المشبوهة:</h5>
                            <ul>
                                ${anomalies.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="recommendations">
                            <h5>التوصيات:</h5>
                            <ul>
                                ${recommendations.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                `;
                
                // Add the message to the chat
                addMessageToChat('العقارات نيجو', message, 'ai');
                
                // Scroll to the bottom
                scrollToBottom();
            })
            .catch(error => {
                console.error('Error:', error);
                button.innerHTML = originalText;
                button.disabled = false;
                addMessageToChat('العقارات نيجو', 'حدث خطأ أثناء تحليل المخاطر. يرجى المحاولة مرة أخرى.', 'ai');
            });
        });
    }
    
    // Sentiment & Conversation Analysis Form
    const sentimentAnalysisForm = document.getElementById('sentiment-analysis-form');
    if (sentimentAnalysisForm) {
        sentimentAnalysisForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const conversationText = document.getElementById('conversation-text').value;
            
            // Show loading state
            const button = sentimentAnalysisForm.querySelector('button');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحليل...';
            button.disabled = true;
            
            // Call the NLP analysis API
            fetch('/api/nlp-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: conversationText
                })
            })
            .then(response => response.json())
            .then(data => {
                // Reset button state
                button.innerHTML = originalText;
                button.disabled = false;
                
                // Format the response
                let message = `
                <div class="ai-analysis nlp-analysis">
                    <div class="analysis-header">
                        <i class="fas fa-brain"></i>
                        <h4>تحليل المحادثة والمشاعر</h4>
                    </div>
                    <div class="analysis-content">
                        <div class="sentiment">
                            <h5>تحليل المشاعر:</h5>
                            <div class="sentiment-score">
                                <span class="label">الشعور العام:</span>
                                <span class="score ${getSentimentClass(data.sentiment.score)}">${data.sentiment.label}</span>
                            </div>
                            <p>${data.sentiment.explanation}</p>
                        </div>
                        
                        <div class="entities">
                            <h5>الكيانات المستخرجة:</h5>
                            <ul>
                                ${data.entities.map(entity => `<li><strong>${entity.type}:</strong> ${entity.text}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="tactics">
                            <h5>تكتيكات التفاوض المكتشفة:</h5>
                            <ul>
                                ${data.negotiationTactics.map(tactic => `
                                    <li>
                                        <strong>${tactic.name}:</strong> 
                                        <span class="confidence">(${tactic.confidence}%)</span>
                                        <p>${tactic.explanation}</p>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        
                        <div class="insights">
                            <h5>الرؤى والتوصيات:</h5>
                            <ul>
                                ${data.insights.map(insight => `<li>${insight}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                `;
                
                // Add the message to the chat
                addMessageToChat('العقارات نيجو', message, 'ai');
                
                // Scroll to the bottom
                scrollToBottom();
            })
            .catch(error => {
                console.error('Error:', error);
                button.innerHTML = originalText;
                button.disabled = false;
                addMessageToChat('العقارات نيجو', 'حدث خطأ أثناء تحليل المحادثة. يرجى المحاولة مرة أخرى.', 'ai');
            });
        });
    }

    // Market Insights Form
    const marketInsightsForm = document.getElementById('market-insights-form');
    const getMarketInsightsBtn = document.getElementById('get-market-insights');

    if (marketInsightsForm && getMarketInsightsBtn) {
        getMarketInsightsBtn.addEventListener('click', function() {
            const location = document.getElementById('market-location').value;
            const propertyType = document.getElementById('market-property-type').value;
            
            if (!location || !propertyType) {
                alert('الرجاء اختيار الموقع ونوع العقار');
                return;
            }
            
            // Show loading state
            const button = getMarketInsightsBtn;
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري جلب البيانات...';
            button.disabled = true;
            
            // Call the market insights function
            window.marketInsights.addToNegotiation(location, propertyType);
            
            // Reset button after a short delay
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 1000);
        });
    }

    // Handle negotiation advice button
    if (getNegotiationAdviceBtn) {
        getNegotiationAdviceBtn.addEventListener('click', function() {
            const situation = negotiationSituation.value.trim();
            if (situation) {
                // Show loading state
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="ri-loader-4-line spin"></i> جاري التحليل...';
                this.disabled = true;
                
                console.log('Sending negotiation situation for analysis:', situation);
                
                // Send to Gemini API via socket for analysis
                socket.emit('analyze_negotiation', {
                    situation: situation,
                    roomId: currentRoom,
                    username: userData ? userData.username : 'زائر',
                    userId: userData ? userData.uid : 'guest'
                });
                
                // Add user message to the chat
                appendMessage({
                    message: situation,
                    username: userData ? userData.username : 'زائر',
                    type: 'user'
                });
                
                // Reset textarea
                negotiationSituation.value = '';
                
                // Restore button after a delay (failsafe)
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 30000); // 30 seconds timeout
            }
        });
    }

    // Helper functions for styling
    function getRiskClass(score) {
        if (score < 30) return 'low-risk';
        if (score < 70) return 'medium-risk';
        return 'high-risk';
    }

    function getSentimentClass(score) {
        if (score < -0.3) return 'negative';
        if (score > 0.3) return 'positive';
        return 'neutral';
    }
});

// Add message to chat function
function addMessageToChat(sender, message, type) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    
    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-sender">${sender}</div>
            <div class="message-text">${message}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Scroll to bottom function
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Ensure compatibility with original advanced tools toggle
document.addEventListener('DOMContentLoaded', function() {
    // Find both old and new elements
    const advancedToolsToggle = document.querySelector('.advanced-tools-toggle');
    const advancedTools = document.querySelector('.advanced-tools');
    const originalAdvancedToolsBtn = document.querySelector('.advanced-tools-toggle');
    
    // Toggle function that works with both old and new UI
    function toggleAdvancedTools() {
        if (advancedTools) {
            if (advancedTools.classList.contains('hidden')) {
                advancedTools.classList.remove('hidden');
                const icon = advancedToolsToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-chevron-up';
                }
            } else {
                advancedTools.classList.add('hidden');
                const icon = advancedToolsToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-chevron-down';
                }
            }
        } else if (document.getElementById('advancedTools')) {
            // Legacy support for old UI
            const oldTools = document.getElementById('advancedTools');
            if (oldTools.style.display === 'none') {
                oldTools.style.display = 'block';
            } else {
                oldTools.style.display = 'none';
            }
        }
    }
    
    // Add event listeners for both old and new UI
    if (advancedToolsToggle) {
        advancedToolsToggle.addEventListener('click', toggleAdvancedTools);
    }
    
    if (originalAdvancedToolsBtn) {
        originalAdvancedToolsBtn.addEventListener('click', toggleAdvancedTools);
    }
    
    // Initialize as hidden
    if (advancedTools) {
        advancedTools.classList.add('hidden');
    }
    
    // Original analyze property functionality
    const analyzePropertyBtn = document.getElementById('analyzeProperty');
    if (analyzePropertyBtn) {
        analyzePropertyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const propertyDescription = document.getElementById('propertyDescription');
            const propertyType = document.getElementById('propertyType');
            const propertyLocation = document.getElementById('propertyLocation');
            const propertyPrice = document.getElementById('propertyPrice');
            
            if (propertyDescription && propertyType && propertyLocation && propertyPrice) {
                if (!propertyDescription.value || !propertyPrice.value) {
                    alert('الرجاء إكمال كافة الحقول المطلوبة');
                    return;
                }
                
                // Send message to chat instead of API call to preserve original functionality
                if (window.sendMessage) {
                    const message = `@negotiate تحليل العقار: ${propertyType.value} في ${propertyLocation.value} بسعر ${propertyPrice.value} ريال`;
                    window.sendMessage(message);
                } else {
                    // Fallback if sendMessage is not defined
                    const messageInput = document.getElementById('messageInput');
                    const sendButton = document.getElementById('sendButton');
                    if (messageInput && sendButton) {
                        messageInput.value = `@negotiate تحليل العقار: ${propertyType.value} في ${propertyLocation.value} بسعر ${propertyPrice.value} ريال`;
                        sendButton.click();
                    }
                }
            }
        });
    }
    
    // Original analyze conversation functionality
    const analyzeConversationBtn = document.getElementById('analyzeConversation');
    if (analyzeConversationBtn) {
        analyzeConversationBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const conversationText = document.getElementById('conversationText');
            
            if (conversationText) {
                if (!conversationText.value) {
                    alert('الرجاء إدخال نص المحادثة للتحليل');
                    return;
                }
                
                // Send message to chat instead of API call to preserve original functionality
                if (window.sendMessage) {
                    const message = `@negotiate تحليل محادثة التفاوض: ${conversationText.value.substring(0, 50)}...`;
                    window.sendMessage(message);
                } else {
                    // Fallback if sendMessage is not defined
                    const messageInput = document.getElementById('messageInput');
                    const sendButton = document.getElementById('sendButton');
                    if (messageInput && sendButton) {
                        messageInput.value = `@negotiate تحليل محادثة التفاوض: ${conversationText.value.substring(0, 50)}...`;
                        sendButton.click();
                    }
                }
            }
        });
    }
});

// Define sendMessage in the global scope for compatibility
window.sendMessage = function(message) {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    if (messageInput && sendButton) {
        messageInput.value = message;
        sendButton.click();
    }
};

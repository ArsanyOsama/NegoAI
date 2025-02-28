/**
 * Market Insights Module
 * Provides real estate market insights, trends analysis, and predictive intelligence
 */

// Global market data and insights cache
const marketDataCache = {
    locations: {},
    propertyTypes: {},
    lastUpdated: null,
    insights: []
};

// Initialize market insights module
function initMarketInsights() {
    // Load initial market data
    loadMarketData()
        .then(() => {
            console.log('Market insights module initialized');
        })
        .catch(error => {
            console.error('Error initializing market insights:', error);
        });
        
    // Set up refresh interval (every hour)
    setInterval(loadMarketData, 60 * 60 * 1000);
}

// Load market data from API
async function loadMarketData() {
    try {
        const response = await fetch('/api/market-data');
        const data = await response.json();
        
        // Update cache
        marketDataCache.locations = data.locations || {};
        marketDataCache.propertyTypes = data.propertyTypes || {};
        marketDataCache.lastUpdated = new Date();
        marketDataCache.insights = data.insights || [];
        
        // Trigger market insights update event
        document.dispatchEvent(new CustomEvent('marketInsightsUpdated', {
            detail: marketDataCache
        }));
        
        return marketDataCache;
    } catch (error) {
        console.error('Error fetching market data:', error);
        throw error;
    }
}

// Get market insights for a specific location
async function getMarketInsights(location, propertyType) {
    // If cache is empty or older than 1 hour, reload
    if (!marketDataCache.lastUpdated || 
        new Date() - marketDataCache.lastUpdated > 60 * 60 * 1000) {
        await loadMarketData();
    }
    
    try {
        const response = await fetch('/api/market-insights', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                location,
                propertyType
            })
        });
        
        const insights = await response.json();
        return insights;
    } catch (error) {
        console.error('Error fetching market insights:', error);
        throw error;
    }
}

// Get price predictions for a property
async function getPricePrediction(location, propertyType, propertyDetails) {
    try {
        const response = await fetch('/api/price-prediction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                location,
                propertyType,
                propertyDetails
            })
        });
        
        const prediction = await response.json();
        return prediction;
    } catch (error) {
        console.error('Error fetching price prediction:', error);
        throw error;
    }
}

// Get market trends for visualization
async function getMarketTrends(location, propertyType, timeframe = '1y') {
    try {
        const response = await fetch('/api/market-trends', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                location,
                propertyType,
                timeframe
            })
        });
        
        const trends = await response.json();
        return trends;
    } catch (error) {
        console.error('Error fetching market trends:', error);
        throw error;
    }
}

// Add market insights to a negotiation
function addMarketInsightsToNegotiation(location, propertyType) {
    getMarketInsights(location, propertyType)
        .then(insights => {
            // Format the insights for display
            let message = `
            <div class="ai-analysis market-insights">
                <div class="analysis-header">
                    <i class="fas fa-chart-line"></i>
                    <h4>تحليل السوق: ${location} - ${propertyType}</h4>
                </div>
                <div class="analysis-content">
                    <div class="market-summary">
                        <h5>ملخص السوق:</h5>
                        <p>${insights.summary}</p>
                    </div>
                    
                    <div class="price-trends">
                        <h5>اتجاهات الأسعار:</h5>
                        <div class="trend-info">
                            <span class="label">متوسط السعر:</span>
                            <span class="value">${insights.averagePrice} ريال</span>
                        </div>
                        <div class="trend-info">
                            <span class="label">التغير السنوي:</span>
                            <span class="value ${insights.yearlyChange > 0 ? 'positive' : 'negative'}">
                                ${insights.yearlyChange > 0 ? '+' : ''}${insights.yearlyChange}%
                            </span>
                        </div>
                        <div class="trend-info">
                            <span class="label">توقعات 6 أشهر:</span>
                            <span class="value ${insights.forecast > 0 ? 'positive' : 'negative'}">
                                ${insights.forecast > 0 ? '+' : ''}${insights.forecast}%
                            </span>
                        </div>
                    </div>
                    
                    <div class="market-factors">
                        <h5>العوامل المؤثرة:</h5>
                        <ul>
                            ${insights.factors.map(factor => `
                                <li>
                                    <strong>${factor.name}:</strong> 
                                    <span>${factor.impact}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div class="negotiation-tips">
                        <h5>نصائح للتفاوض:</h5>
                        <ul>
                            ${insights.negotiationTips.map(tip => `<li>${tip}</li>`).join('')}
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
            console.error('Error adding market insights:', error);
            addMessageToChat('العقارات نيجو', 'حدث خطأ أثناء جلب بيانات السوق. يرجى المحاولة مرة أخرى.', 'ai');
        });
}

// Export module functions
window.marketInsights = {
    init: initMarketInsights,
    getInsights: getMarketInsights,
    getPricePrediction: getPricePrediction,
    getMarketTrends: getMarketTrends,
    addToNegotiation: addMarketInsightsToNegotiation
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', initMarketInsights);

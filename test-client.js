/**
 * Test Client for Nego AI Real Estate Negotiation Platform
 * Tests all API endpoints and socket connections
 */

const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:3002';
const TEST_USER = {
    uid: 'test-user-id',
    username: 'Test User',
    photoURL: 'https://via.placeholder.com/50'
};

// Connect to Socket.IO server
const socket = io(SERVER_URL);

// Track test results
const testResults = {
    passed: 0,
    failed: 0,
    total: 0
};

// Helper function to log test results
function logResult(testName, success, error = null) {
    testResults.total++;
    if (success) {
        testResults.passed++;
        console.log(`✓ PASS: ${testName}`);
    } else {
        testResults.failed++;
        console.log(`✗ FAIL: ${testName}`);
        if (error) {
            console.log(`  Error: ${error.message || error}`);
        }
    }
}

// Test cases
async function runTests() {
    console.log('Starting Nego AI Platform Tests...');
    
    // Test 1: Socket Connection
    socket.on('connect', () => {
        logResult('Socket.IO Connection', true);
        
        // Proceed with socket-related tests after connection
        testJoinRoom();
        testSendMessage();
        testNegoQuery();
        testGeminiQuery();
    });
    
    socket.on('connect_error', (error) => {
        logResult('Socket.IO Connection', false, error);
    });
    
    // Test 2: Join Room
    function testJoinRoom() {
        try {
            socket.emit('join_room', { 
                room: 'test-room', 
                user: TEST_USER 
            });
            
            // Wait for join_room confirmation event
            socket.once('room_joined', (data) => {
                logResult('Join Room', data && data.room === 'test-room');
            });
            
            // Set a timeout in case the event never fires
            setTimeout(() => {
                if (testResults.total < 2) { // If join_room test hasn't been logged yet
                    logResult('Join Room', false, 'Timeout waiting for room_joined event');
                }
            }, 3000);
        } catch (error) {
            logResult('Join Room', false, error);
        }
    }
    
    // Test 3: Send Regular Message
    function testSendMessage() {
        try {
            const testMessage = {
                message: 'This is a test message',
                roomId: 'test-room',
                username: TEST_USER.username,
                userId: TEST_USER.uid
            };
            
            socket.emit('send_message', testMessage);
            
            // Listen for the message coming back
            socket.once('new_message', (data) => {
                const success = 
                    data.message === testMessage.message && 
                    data.roomId === testMessage.roomId;
                
                logResult('Send Regular Message', success);
            });
            
            // Set a timeout in case the event never fires
            setTimeout(() => {
                if (testResults.total < 3) { // If send_message test hasn't been logged yet
                    logResult('Send Regular Message', false, 'Timeout waiting for new_message event');
                }
            }, 3000);
        } catch (error) {
            logResult('Send Regular Message', false, error);
        }
    }
    
    // Test 4: Nego AI Query
    function testNegoQuery() {
        try {
            const negoQuery = {
                message: '@nego كيف يمكنني التفاوض على سعر منزل؟',
                roomId: 'test-room',
                username: TEST_USER.username,
                userId: TEST_USER.uid
            };
            
            console.log('Sending Nego AI query...');
            socket.emit('send_message', negoQuery);
            
            // Listen for the AI response
            socket.once('new_message', (data) => {
                if (data.sender === 'Nego AI') {
                    const success = data.message && data.message.length > 0;
                    logResult('Nego AI Query', success);
                    console.log('Nego AI Response:', data.message.substring(0, 100) + '...');
                }
            });
            
            // Set a timeout in case the event never fires
            setTimeout(() => {
                if (testResults.total < 4) { // If nego query test hasn't been logged yet
                    logResult('Nego AI Query', false, 'Timeout waiting for Nego AI response');
                }
            }, 10000); // Longer timeout for AI response
        } catch (error) {
            logResult('Nego AI Query', false, error);
        }
    }
    
    // Test 5: Gemini AI Query
    function testGeminiQuery() {
        try {
            const geminiQuery = {
                message: '@gemini what are good negotiation tactics?',
                roomId: 'test-room',
                username: TEST_USER.username,
                userId: TEST_USER.uid
            };
            
            console.log('Sending Gemini AI query...');
            socket.emit('send_message', geminiQuery);
            
            // Listen for the AI response
            socket.once('new_message', (data) => {
                if (data.sender === 'Gemini AI') {
                    const success = data.message && data.message.length > 0;
                    logResult('Gemini AI Query', success);
                    console.log('Gemini AI Response:', data.message.substring(0, 100) + '...');
                }
            });
            
            // Set a timeout in case the event never fires
            setTimeout(() => {
                if (testResults.total < 5) { // If gemini query test hasn't been logged yet
                    logResult('Gemini AI Query', false, 'Timeout waiting for Gemini AI response');
                }
            }, 10000); // Longer timeout for AI response
        } catch (error) {
            logResult('Gemini AI Query', false, error);
        }
    }
    
    // After all tests have run, output summary
    setTimeout(() => {
        console.log('\nTest Summary:');
        console.log(`Total Tests: ${testResults.total}`);
        console.log(`Passed: ${testResults.passed}`);
        console.log(`Failed: ${testResults.failed}`);
        
        // Close the socket connection
        socket.disconnect();
    }, 15000); // Wait for all tests to complete
}

// Run the tests
runTests();

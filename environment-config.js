/**
 * Environment Configuration Utility
 * Provides centralized management of environment variables
 */

// Force reload of dotenv to ensure changes are picked up
const dotenv = require('dotenv');
const path = require('path');
const envPath = path.resolve(process.cwd(), '.env');

// Force reload from actual file path
dotenv.config({ path: envPath, override: true });

console.log('Loading environment from:', envPath);
console.log('GEMINI_API_KEY loaded:', process.env.GEMINI_API_KEY ? 'YES' : 'NO');

const fs = require('fs');

// Default configuration
const defaultConfig = {
  port: 3002,
  environment: 'development',
  geminiApiKey: '',
  firebaseConfig: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: ''
  }
};

// Load environment variables
const config = {
  port: process.env.PORT || defaultConfig.port,
  environment: process.env.NODE_ENV || defaultConfig.environment,
  geminiApiKey: process.env.GEMINI_API_KEY || defaultConfig.geminiApiKey,
  firebaseConfig: {
    apiKey: process.env.FIREBASE_API_KEY || defaultConfig.firebaseConfig.apiKey,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || defaultConfig.firebaseConfig.authDomain,
    projectId: process.env.FIREBASE_PROJECT_ID || defaultConfig.firebaseConfig.projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || defaultConfig.firebaseConfig.storageBucket,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || defaultConfig.firebaseConfig.messagingSenderId,
    appId: process.env.FIREBASE_APP_ID || defaultConfig.firebaseConfig.appId,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || defaultConfig.firebaseConfig.measurementId
  }
};

/**
 * Validate required environment variables
 * @returns {object} Object containing validation results and missing variables
 */
function validateEnvironment() {
  const requiredVars = ['GEMINI_API_KEY', 'FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️ Missing required environment variables:', missingVars.join(', '));
    return {
      valid: false,
      missing: missingVars
    };
  }
  
  return {
    valid: true,
    missing: []
  };
}

// Validate on load
const validation = validateEnvironment();
if (!validation.valid) {
  console.warn(`
⚠️ Environment validation failed ⚠️
Missing variables: ${validation.missing.join(', ')}
Please check your .env file or environment setup.
  `);
}

module.exports = {
  config,
  validateEnvironment
};

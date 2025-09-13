// bot/fast2sms.js - Fast2SMS Integration for Indian SMS Services
import axios from 'axios';

const FAST2SMS_API_URL = 'https://www.fast2sms.com/dev/bulkV2';
let apiKey = null;
let isInitialized = false;

/**
 * Initialize Fast2SMS with API key
 */
export function initFast2SMS() {
  try {
    // Use provided API key or environment variable
    apiKey = process.env.FAST2SMS_API_KEY || 'Osoe4q1h3jHrSAl2XR0bPt6GQavW8DEY5TpIFzCkxfLMuwJKncHaVq5Bcs3obkTLeW1SJQANpuljnMv4';
    
    if (!apiKey || apiKey.length < 20) {
      console.log('⚠️ Fast2SMS API key not configured. Indian SMS features disabled.');
      return false;
    }
    
    isInitialized = true;
    console.log('✅ Fast2SMS initialized for Indian SMS delivery');
    console.log('📱 Free credits available for SMS notifications');
    
    return true;
  } catch (error) {
    console.error('❌ Fast2SMS initialization error:', error);
    return false;
  }
}

/**
 * Send SMS using Fast2SMS API
 */
export async function sendFast2SMS(phoneNumber, message) {
  if (!isInitialized) {
    console.log('⚠️ Fast2SMS not initialized - cannot send SMS');
    return false;
  }
  
  try {
    // Clean phone number (remove +91 prefix if present)
    const cleanNumber = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');
    
    if (cleanNumber.length !== 10) {
      console.error('❌ Invalid Indian phone number format:', phoneNumber);
      return false;
    }
    
    // Prepare SMS data
    const smsData = {
      variables_values: message.substring(0, 160), // SMS length limit
      route: 'q', // Quick route for fast delivery
      numbers: cleanNumber
    };
    
    const response = await axios.post(FAST2SMS_API_URL, smsData, {
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.return === true) {
      console.log(`✅ Fast2SMS sent to +91${cleanNumber}: ${response.data.request_id}`);
      return {
        success: true,
        messageId: response.data.request_id,
        cost: response.data.cost || 'Free credits used'
      };
    } else {
      console.error('❌ Fast2SMS failed:', response.data.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Fast2SMS send error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Send bulk SMS to multiple numbers
 */
export async function sendBulkFast2SMS(phoneNumbers, message) {
  if (!isInitialized) {
    console.log('⚠️ Fast2SMS not initialized - cannot send bulk SMS');
    return false;
  }
  
  try {
    // Clean and validate phone numbers
    const cleanNumbers = phoneNumbers
      .map(num => num.replace(/^\+91/, '').replace(/\D/g, ''))
      .filter(num => num.length === 10);
    
    if (cleanNumbers.length === 0) {
      console.error('❌ No valid Indian phone numbers provided');
      return false;
    }
    
    const smsData = {
      variables_values: message.substring(0, 160),
      route: 'q',
      numbers: cleanNumbers.join(',')
    };
    
    const response = await axios.post(FAST2SMS_API_URL, smsData, {
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.return === true) {
      console.log(`✅ Fast2SMS bulk sent to ${cleanNumbers.length} numbers: ${response.data.request_id}`);
      return {
        success: true,
        messageId: response.data.request_id,
        sent: cleanNumbers.length,
        cost: response.data.cost || 'Free credits used'
      };
    } else {
      console.error('❌ Fast2SMS bulk failed:', response.data.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Fast2SMS bulk send error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Check Fast2SMS account balance
 */
export async function getFast2SMSBalance() {
  if (!isInitialized) {
    return { error: 'Fast2SMS not initialized' };
  }
  
  try {
    const response = await axios.get('https://www.fast2sms.com/dev/wallet', {
      headers: {
        'authorization': apiKey
      }
    });
    
    return {
      success: true,
      balance: response.data.wallet,
      credits: response.data.credits || 'Free plan'
    };
  } catch (error) {
    console.error('❌ Fast2SMS balance check error:', error.response?.data || error.message);
    return { error: error.message };
  }
}

/**
 * Get Fast2SMS service status
 */
export function getFast2SMSStatus() {
  return {
    initialized: isInitialized,
    hasApiKey: !!apiKey,
    provider: 'Fast2SMS India',
    features: ['SMS delivery', 'Bulk SMS', 'Free credits', 'No setup fees'],
    coverage: 'India nationwide'
  };
}

/**
 * Format message for Indian SMS delivery
 */
export function formatIndianSMS(message) {
  // Add signature for health messages
  const signature = '\n- Odisha Health Alert';
  const maxLength = 160 - signature.length;
  
  if (message.length <= maxLength) {
    return message + signature;
  }
  
  return message.substring(0, maxLength - 3) + '...' + signature;
}
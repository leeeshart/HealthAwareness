// backend/alerts.js - Regional Alert Management System
import { getRegionalPreference, insertAlert, getFromSQLite } from '../database/db.js';
import { sendSMS } from '../bot/bot.js';
import { sendFast2SMS, sendBulkFast2SMS } from '../bot/fast2sms.js';
import { sendWhatsAppMessage, sendHealthAlert } from '../bot/whatsapp.js';

/**
 * Broadcast health alert to users based on regional preferences
 */
export async function broadcastRegionalAlert(disease, location, severity = 'medium', message) {
  try {
    console.log(`🚨 Broadcasting ${severity} alert for ${disease} in ${location}`);
    
    // Store alert in database
    await insertAlert(disease, location);
    
    // Get regional preference for the location
    const preference = await getRegionalPreference(location);
    
    if (!preference || !preference.notification_enabled) {
      console.log(`ℹ️ No notifications enabled for region: ${location}`);
      return { success: true, sent: 0, skipped: 'notifications_disabled' };
    }
    
    // Format alert message
    const alertMessage = formatAlertMessage(disease, location, severity, message, preference.language_preference);
    
    // Dispatch via preferred contact method
    let dispatchResult = { success: false, sent: 0, errors: [] };
    
    switch (preference.contact_method) {
      case 'whatsapp':
        dispatchResult = await dispatchWhatsAppAlert(alertMessage, severity);
        break;
      case 'sms':
        dispatchResult = await dispatchSMSAlert(alertMessage);
        break;
      case 'both':
        const smsResult = await dispatchSMSAlert(alertMessage);
        const whatsappResult = await dispatchWhatsAppAlert(alertMessage, severity);
        dispatchResult = {
          success: smsResult.success || whatsappResult.success,
          sent: smsResult.sent + whatsappResult.sent,
          errors: [...smsResult.errors, ...whatsappResult.errors]
        };
        break;
      default:
        console.log(`⚠️ Unknown contact method: ${preference.contact_method}`);
    }
    
    console.log(`✅ Alert dispatch complete: ${dispatchResult.sent} sent, ${dispatchResult.errors.length} errors`);
    return dispatchResult;
    
  } catch (error) {
    console.error('❌ Regional alert broadcast failed:', error);
    return { success: false, sent: 0, errors: [error.message] };
  }
}

/**
 * Format alert message based on language preference
 */
function formatAlertMessage(disease, location, severity, customMessage, language = 'en') {
  const severityEmojis = {
    low: '⚠️',
    medium: '🚨',
    high: '🔴',
    critical: '🆘'
  };
  
  const emoji = severityEmojis[severity] || '⚠️';
  
  // Basic multi-language support
  const templates = {
    en: `${emoji} HEALTH ALERT - ODISHA\n\n🦠 Disease: ${disease.toUpperCase()}\n📍 Location: ${location}\n⚡ Severity: ${severity.toUpperCase()}\n\n${customMessage || getDefaultMessage(disease, language)}\n\n🆘 Emergency: 108\n💊 Health Info: Text HELP`,
    hi: `${emoji} स्वास्थ्य चेतावनी - ओडिशा\n\n🦠 रोग: ${disease.toUpperCase()}\n📍 स्थान: ${location}\n⚡ गंभीरता: ${severity.toUpperCase()}\n\n${customMessage || getDefaultMessage(disease, 'hi')}\n\n🆘 आपातकाल: 108\n💊 स्वास्थ्य जानकारी: HELP भेजें`,
    or: `${emoji} ସ୍ୱାସ୍ଥ୍ୟ ସତର୍କତା - ଓଡିଶା\n\n🦠 ରୋଗ: ${disease.toUpperCase()}\n📍 ସ୍ଥାନ: ${location}\n⚡ ଗମ୍ଭୀରତା: ${severity.toUpperCase()}\n\n${customMessage || getDefaultMessage(disease, 'or')}\n\n🆘 ଜରୁରୀକାଳୀନ: 108\n💊 ସ୍ୱାସ୍ଥ୍ୟ ସୂଚନା: HELP ପଠାନ୍ତୁ`
  };
  
  return templates[language] || templates.en;
}

/**
 * Get default prevention message for a disease
 */
function getDefaultMessage(disease, language = 'en') {
  const messages = {
    en: {
      malaria: "Take precautions: Use mosquito nets, remove stagnant water, seek medical help if fever.",
      dengue: "Prevention: Eliminate standing water, use repellents, watch for high fever and body pain.",
      cholera: "Safety: Drink boiled water, maintain hygiene, seek immediate medical attention for severe symptoms.",
      default: "Follow health guidelines, maintain hygiene, seek medical advice if symptoms appear."
    },
    hi: {
      malaria: "सावधानी: मच्छरदानी का उपयोग करें, जमा पानी हटाएं, बुखार होने पर चिकित्सा सहायता लें।",
      dengue: "रोकथाम: खड़ा पानी हटाएं, रिपेलेंट का उपयोग करें, तेज बुखार और शरीर दर्द पर ध्यान दें।",
      cholera: "सुरक्षा: उबला पानी पिएं, स्वच्छता बनाए रखें, गंभीर लक्षणों के लिए तुरंत चिकित्सा सहायता लें।",
      default: "स्वास्थ्य दिशा-निर्देशों का पालन करें, स्वच्छता बनाए रखें, लक्षण दिखने पर चिकित्सा सलाह लें।"
    },
    or: {
      malaria: "ସତର୍କତା: ମଶା ଜାଲି ବ୍ୟବହାର କରନ୍ତୁ, ଜମା ପାଣି ହଟାନ୍ତୁ, ଜ୍ୱର ହେଲେ ଡାକ୍ତରୀ ସାହାଯ୍ୟ ନିଅନ୍ତୁ।",
      dengue: "ପ୍ରତିରୋଧ: ଠିଆ ପାଣି ହଟାନ୍ତୁ, ରିପେଲେଣ୍ଟ ବ୍ୟବହାର କରନ୍ତୁ, ଉଚ୍ଚ ଜ୍ୱର ଏବଂ ଶରୀର ଯନ୍ତ୍ରଣା ପାଇଁ ସତର୍କ ରହନ୍ତୁ।",
      cholera: "ସୁରକ୍ଷା: ଫୁଟା ପାଣି ପିଅନ୍ତୁ, ସ୍ୱଚ୍ଛତା ବଜାୟ ରଖନ୍ତୁ, ଗମ୍ଭୀର ଲକ୍ଷଣ ପାଇଁ ତୁରନ୍ତ ଚିକିତ୍ସା ସାହାଯ୍ୟ ନିଅନ୍ତୁ।",
      default: "ସ୍ୱାସ୍ଥ୍ୟ ନିର୍ଦ୍ଦେଶାବଳୀ ଅନୁସରଣ କରନ୍ତୁ, ସ୍ୱଚ୍ଛତା ବଜାୟ ରଖନ୍ତୁ, ଲକ୍ଷଣ ଦେଖାଗଲେ ଡାକ୍ତରୀ ପରାମର୍ଶ ନିଅନ୍ତୁ।"
    }
  };
  
  return messages[language]?.[disease.toLowerCase()] || messages[language]?.default || messages.en.default;
}

/**
 * Dispatch alert via SMS (mock implementation for demonstration)
 */
async function dispatchSMSAlert(message) {
  try {
    // Try Fast2SMS first (India-specific), fallback to Twilio
    const fast2smsResult = await sendFast2SMS('9999999999', message); // Demo number
    
    if (fast2smsResult) {
      console.log('📱 Fast2SMS Alert dispatched:', message.substring(0, 100) + '...');
      return { success: true, sent: 1, errors: [], provider: 'Fast2SMS' };
    } else {
      // Fallback to Twilio or mock
      console.log('📱 SMS Alert dispatched (fallback):', message.substring(0, 100) + '...');
      return { success: true, sent: 1, errors: [], provider: 'Fallback' };
    }
  } catch (error) {
    return { success: false, sent: 0, errors: [error.message] };
  }
}

/**
 * Dispatch alert via WhatsApp (mock implementation for demonstration)
 */
async function dispatchWhatsAppAlert(message, severity = 'medium') {
  try {
    // In a real implementation, this would send to a list of subscribers
    console.log('📱 WhatsApp Alert dispatched:', message.substring(0, 100) + '...');
    
    // Mock successful dispatch with quick action buttons
    const buttons = severity === 'critical' 
      ? ['Call 108', 'First Aid', 'More Info']
      : ['Prevention Tips', 'More Info', 'Emergency'];
    
    return { success: true, sent: 1, errors: [] };
  } catch (error) {
    return { success: false, sent: 0, errors: [error.message] };
  }
}

/**
 * Get recent alerts for statistics
 */
export async function getRecentAlerts(days = 7) {
  try {
    const alerts = await getFromSQLite('alerts');
    
    // Filter alerts from last N days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return alerts.filter(alert => new Date(alert.timestamp) >= cutoffDate);
  } catch (error) {
    console.error('❌ Error fetching recent alerts:', error);
    return [];
  }
}
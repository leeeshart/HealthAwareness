// bot/whatsapp.js - WhatsApp Business API Integration for Health Alert Bot
import axios from 'axios';

let isInitialized = false;
const GRAPH_API_VERSION = 'v16.0';
let phoneNumberId;
let accessToken;

/**
 * Initialize WhatsApp Business API
 */
export function initWhatsApp() {
  try {
    // Check for required environment variables
    if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.log('⚠️ WhatsApp credentials not found. WhatsApp features disabled.');
      console.log('💡 Add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID to enable WhatsApp');
      return false;
    }

    accessToken = process.env.WHATSAPP_TOKEN;
    phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    isInitialized = true;
    
    console.log('✅ WhatsApp Business API initialized (Official Meta Graph API)');
    console.log(`📱 Phone Number ID: ***${phoneNumberId.slice(-4)}`);
    
    return true;
  } catch (error) {
    console.error('❌ WhatsApp initialization error:', error);
    return false;
  }
}

/**
 * Handle incoming WhatsApp webhook data (called from Express endpoint)
 */
export function handleWhatsAppWebhook(body) {
  try {
    if (!body || !body.entry) return;
    
    body.entry.forEach(entry => {
      entry.changes?.forEach(change => {
        if (change.field === 'messages' && change.value.messages) {
          change.value.messages.forEach(message => {
            const contact = change.value.contacts?.[0];
            handleIncomingWhatsAppMessage(message, contact);
          });
        }
        
        // Handle message status updates
        if (change.field === 'messages' && change.value.statuses) {
          change.value.statuses.forEach(status => {
            console.log(`📱 WhatsApp message status: ${status.status} for ${status.id}`);
          });
        }
      });
    });
  } catch (error) {
    console.error('❌ WhatsApp webhook handling error:', error);
  }
}

/**
 * Handle incoming WhatsApp messages
 */
async function handleIncomingWhatsAppMessage(message, contact) {
  try {
    console.log(`📱 WhatsApp message from ${contact?.wa_id}: ${message.text?.body || 'Media message'}`);
    
    const userNumber = contact?.wa_id;
    if (!userNumber) return;
    
    let query = '';
    
    // Handle different message types
    switch (message.type) {
      case 'text':
        query = message.text.body;
        break;
        
      case 'audio':
        // Handle voice messages (future enhancement)
        await sendWhatsAppMessage(userNumber, "🎤 Voice messages are supported! However, this feature is coming soon. Please send text messages for now.");
        return;
        
      case 'image':
        await sendWhatsAppMessage(userNumber, "📸 Image received! I can help with health questions via text. Type HELP to see available commands.");
        return;
        
      default:
        await sendWhatsAppMessage(userNumber, "📱 I can help with health questions! Type HELP to see available commands.");
        return;
    }
    
    // Process health query (import the handler from main bot)
    const { handleIncomingSMS } = await import('./bot.js');
    const response = await handleIncomingSMS(userNumber, query);
    
    // Send response back to WhatsApp
    await sendWhatsAppMessage(userNumber, response);
    
  } catch (error) {
    console.error('❌ WhatsApp message handling error:', error);
    
    // Send error message to user
    if (contact?.wa_id) {
      await sendWhatsAppMessage(contact.wa_id, "❌ Sorry, I'm having technical difficulties. Please try again or call 108 for emergencies.");
    }
  }
}

/**
 * Send text message via WhatsApp
 */
export async function sendWhatsAppMessage(phoneNumber, message) {
  if (!isInitialized) {
    console.log('⚠️ WhatsApp not initialized - cannot send message');
    return false;
  }
  
  try {
    // Format message for WhatsApp (supports markdown)
    const formattedMessage = formatForWhatsApp(message);
    
    const response = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        text: { body: formattedMessage }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ WhatsApp message sent to ${phoneNumber}: ${response.data.messages?.[0]?.id}`);
    return response.data;
  } catch (error) {
    console.error('❌ WhatsApp send error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Send template message via WhatsApp
 */
export async function sendWhatsAppTemplate(phoneNumber, templateName, language = 'en_US', components = []) {
  if (!isInitialized) {
    console.log('⚠️ WhatsApp not initialized - cannot send template');
    return false;
  }
  
  try {
    const response = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: components
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ WhatsApp template sent to ${phoneNumber}: ${response.data.messages?.[0]?.id}`);
    return response.data;
  } catch (error) {
    console.error('❌ WhatsApp template send error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Send quick reply buttons via WhatsApp
 */
export async function sendWhatsAppQuickReplies(phoneNumber, message, buttons) {
  if (!isInitialized) {
    console.log('⚠️ WhatsApp not initialized - cannot send quick replies');
    return false;
  }
  
  try {
    const response = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: message },
          action: {
            buttons: buttons.slice(0, 3).map((button, index) => ({
              type: 'reply',
              reply: {
                id: `btn_${index}`,
                title: (button.title || button).substring(0, 20)
              }
            }))
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ WhatsApp quick replies sent to ${phoneNumber}`);
    return response.data;
  } catch (error) {
    console.error('❌ WhatsApp quick replies error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Send contact information via WhatsApp
 */
export async function sendWhatsAppContact(phoneNumber, contacts) {
  if (!isInitialized) {
    console.log('⚠️ WhatsApp not initialized - cannot send contact');
    return false;
  }
  
  try {
    const response = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'contacts',
        contacts: contacts
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ WhatsApp contact sent to ${phoneNumber}`);
    return response.data;
  } catch (error) {
    console.error('❌ WhatsApp contact send error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Format message for WhatsApp (preserve some formatting)
 */
function formatForWhatsApp(message) {
  // WhatsApp supports basic markdown formatting
  let formatted = message
    .replace(/━{10,}/g, '────────────') // Replace long lines with shorter ones
    .replace(/\*([^*]+)\*/g, '*$1*') // Keep bold formatting
    .trim();
  
  return formatted;
}

/**
 * Send emergency contacts as WhatsApp contact card
 */
export async function sendEmergencyContacts(phoneNumber) {
  const emergencyContacts = [
    {
      name: { formatted_name: "Ambulance - Odisha", first_name: "Ambulance" },
      phones: [{ phone: "+91108", type: "EMERGENCY" }]
    },
    {
      name: { formatted_name: "Police - Odisha", first_name: "Police" },
      phones: [{ phone: "+91100", type: "EMERGENCY" }]
    },
    {
      name: { formatted_name: "Fire Service - Odisha", first_name: "Fire Service" },
      phones: [{ phone: "+91101", type: "EMERGENCY" }]
    },
    {
      name: { formatted_name: "Health Helpline", first_name: "Health Helpline" },
      phones: [{ phone: "+91104", type: "EMERGENCY" }]
    },
    {
      name: { formatted_name: "Women Helpline", first_name: "Women Helpline" },
      phones: [{ phone: "+91181", type: "EMERGENCY" }]
    }
  ];
  
  return await sendWhatsAppContact(phoneNumber, emergencyContacts);
}

/**
 * Send health alert with quick action buttons
 */
export async function sendHealthAlert(phoneNumber, alertMessage, alertType = 'general') {
  const buttons = [];
  
  switch (alertType) {
    case 'outbreak':
      buttons.push('Get Prevention Tips', 'Find Nearest Hospital', 'Emergency Contacts');
      break;
    case 'emergency':
      buttons.push('Call 108', 'First Aid Guide', 'Nearest Hospital');
      break;
    default:
      buttons.push('More Info', 'Prevention Tips', 'Emergency Help');
  }
  
  return await sendWhatsAppQuickReplies(phoneNumber, alertMessage, buttons);
}

/**
 * Check WhatsApp system status
 */
export function getWhatsAppStatus() {
  return {
    initialized: isInitialized,
    hasCredentials: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? 
      `***${process.env.WHATSAPP_PHONE_NUMBER_ID.slice(-4)}` : 'Not configured',
    apiVersion: GRAPH_API_VERSION,
    apiProvider: 'Meta Graph API (Official)'
  };
}
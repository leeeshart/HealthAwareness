// sms/sms.js - SMS Handler for Health Alert Bot
import twilio from "twilio";
import { helpController, firstAidController, preventionController, alertController, statsController } from "../backend/controllers.js";

let twilioClient = null;

export function initTwilio(accountSid, authToken) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio SMS client initialized');
    return true;
  } catch (error) {
    console.error('❌ Twilio initialization failed:', error);
    return false;
  }
}

// Handle incoming SMS messages
export async function handleIncomingSMS(from, body) {
  const text = body.trim();
  let reply = "Unknown command. Reply HELP for assistance or call 108 for emergencies.";

  try {
    const parts = text.split(" ");
    const cmd = parts[0].toUpperCase();
    const arg = parts.slice(1).join(" ");

    console.log(`📱 SMS received from ${from}: ${text}`);

    if (cmd === "HELP") reply = await helpController();
    if (cmd === "FIRSTAID") reply = await firstAidController(arg);
    if (cmd === "PREVENT") reply = await preventionController(arg);
    if (cmd === "ALERT") reply = await alertController(arg);
    if (cmd === "STATS") reply = await statsController();

    // Format reply for SMS (160 char limit awareness)
    reply = formatForSMS(reply);

  } catch (err) {
    console.error("SMS Error:", err);
    reply = "Service temporarily unavailable. Emergency: 108";
  }

  return reply;
}

// Send SMS using Twilio
export async function sendSMS(to, message, from) {
  if (!twilioClient) {
    console.error('❌ Twilio client not initialized');
    return false;
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: from,
      to: to
    });
    console.log(`✅ SMS sent to ${to}: ${result.sid}`);
    return true;
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
    return false;
  }
}

// Format messages for SMS constraints
function formatForSMS(message) {
  // Remove excessive formatting and keep essential info
  let formatted = message
    .replace(/━{10,}/g, '---') // Replace long lines with shorter ones
    .replace(/[\*_]/g, '') // Remove markdown formatting
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();

  // For basic phone compatibility, create shorter responses
  if (formatted.length > 480) { // ~3 SMS segments
    // Extract key information for shorter response
    if (message.includes('FIRST AID') || message.includes('FIRSTAID')) {
      formatted = getShortFirstAid(message);
    } else if (message.includes('PREVENTION') || message.includes('PREVENT')) {
      formatted = getShortPrevention(message);
    } else if (message.includes('AVAILABLE COMMANDS') || message.includes('HELP')) {
      formatted = getShortHelp();
    } else {
      // General truncation with continuation
      formatted = formatted.substring(0, 450) + '... (Text HELP for more)';
    }
  }

  return formatted;
}

// Concise versions for basic phone users
function getShortHelp() {
  return `Health Alert - Odisha

Commands:
HELP - This menu
FIRSTAID burns - First aid 
PREVENT malaria - Prevention
ALERT cholera Bhubaneswar - Report outbreak

Emergency: 108 (Ambulance), 100 (Police), 104 (Health)`;
}

function getShortFirstAid(message) {
  if (message.toLowerCase().includes('burns')) {
    return `FIRST AID: BURNS
1. Cool with water 10-20 min
2. Remove jewelry before swelling
3. Cover with clean cloth
4. NO ice/butter/toothpaste
5. Call 108 if severe
Emergency: 108`;
  }
  // Add more conditions as needed
  return message.substring(0, 450) + '... (Text FIRSTAID for details)';
}

function getShortPrevention(message) {
  if (message.toLowerCase().includes('malaria')) {
    return `PREVENT MALARIA:
1. Use mosquito nets
2. Apply repellent
3. Remove stagnant water
4. Wear long sleeves evening
Symptoms: Fever, chills, headache
Emergency: 108`;
  }
  // Add more diseases as needed
  return message.substring(0, 450) + '... (Text PREVENT for details)';
}

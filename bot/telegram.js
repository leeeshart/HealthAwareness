// bot/telegram.js - Telegram Bot Integration for Health Alert Bot
import TelegramBot from 'node-telegram-bot-api';
import { handleIncomingSMS } from './bot.js';

let bot = null;
let isInitialized = false;

/**
 * Initialize Telegram Bot
 */
export function initTelegramBot() {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.log('⚠️ Telegram bot token not found. Telegram features disabled.');
      return false;
    }

    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    isInitialized = true;
    
    console.log('✅ Telegram Health Alert Bot initialized');
    console.log('📱 Bot ready to receive messages on Telegram');
    
    // Set up message handlers
    setupMessageHandlers();
    
    return true;
  } catch (error) {
    console.error('❌ Telegram bot initialization error:', error);
    return false;
  }
}

/**
 * Set up Telegram message handlers
 */
function setupMessageHandlers() {
  if (!bot) return;
  
  // Handle text messages
  bot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id;
      const messageText = msg.text;
      
      if (!messageText) return;
      
      console.log(`📱 Telegram message from ${chatId}: ${messageText}`);
      
      // Use existing SMS handler for consistency
      const response = await handleIncomingSMS(chatId.toString(), messageText);
      
      // Send response back to Telegram
      await sendTelegramMessage(chatId, response);
      
    } catch (error) {
      console.error('❌ Telegram message handling error:', error);
    }
  });
  
  // Handle bot commands
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `🏥 *HEALTH ALERT BOT - ODISHA*
    
Welcome! I'm your AI health assistant for Odisha.

*Available Commands:*
• HELP - Emergency contacts & commands
• FIRSTAID [condition] - First aid instructions
• PREVENT [disease] - Prevention guidelines
• ALERT [disease] [location] - Report outbreak
• STATS - View health statistics

*Emergency Services:*
🚨 Ambulance: 108
🚔 Police: 100
🔥 Fire: 101
👨‍⚕️ Health Helpline: 181
👶 Child Helpline: 1098

Type any command to get started!`;

    await sendTelegramMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  });
  
  // Handle callback queries from inline keyboards
  bot.on('callback_query', async (query) => {
    try {
      const chatId = query.message.chat.id;
      const data = query.data;
      
      // Process the callback data as a command
      const response = await handleIncomingSMS(chatId.toString(), data);
      
      // Edit the original message with the response
      await bot.editMessageText(response, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      });
      
      // Answer the callback query
      await bot.answerCallbackQuery(query.id);
      
    } catch (error) {
      console.error('❌ Telegram callback query error:', error);
      await bot.answerCallbackQuery(query.id, { text: 'Error processing request' });
    }
  });
}

/**
 * Send message to Telegram user
 */
export async function sendTelegramMessage(chatId, message, options = {}) {
  if (!isInitialized) {
    console.log('⚠️ Telegram bot not initialized - cannot send message');
    return false;
  }
  
  try {
    // Format message for Telegram (supports Markdown)
    const formattedMessage = formatForTelegram(message);
    
    const response = await bot.sendMessage(chatId, formattedMessage, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...options
    });
    
    console.log(`✅ Telegram message sent to ${chatId}: ${response.message_id}`);
    return response;
  } catch (error) {
    console.error('❌ Telegram send error:', error);
    return false;
  }
}

/**
 * Send message with quick reply buttons
 */
export async function sendTelegramQuickReplies(chatId, message, buttons) {
  if (!isInitialized) {
    console.log('⚠️ Telegram bot not initialized - cannot send quick replies');
    return false;
  }
  
  try {
    const keyboard = {
      inline_keyboard: buttons.map(button => [{
        text: typeof button === 'string' ? button : button.text,
        callback_data: typeof button === 'string' ? button : button.callback_data
      }])
    };
    
    const response = await bot.sendMessage(chatId, formatForTelegram(message), {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
    console.log(`✅ Telegram quick replies sent to ${chatId}`);
    return response;
  } catch (error) {
    console.error('❌ Telegram quick replies error:', error);
    return false;
  }
}

/**
 * Send health alert with emergency buttons
 */
export async function sendTelegramAlert(chatId, alertMessage, severity = 'medium') {
  const buttons = [
    [{ text: '🚨 Call Emergency (108)', callback_data: 'EMERGENCY_108' }],
    [{ text: '💊 First Aid Tips', callback_data: 'FIRSTAID general' }],
    [{ text: '📊 More Info', callback_data: 'STATS' }]
  ];
  
  if (severity === 'critical') {
    buttons.unshift([{ text: '🔴 URGENT: Call Now!', url: 'tel:108' }]);
  }
  
  return await bot.sendMessage(chatId, `🚨 *HEALTH ALERT*\n\n${alertMessage}`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

/**
 * Format message for Telegram
 */
function formatForTelegram(message) {
  if (!message) return '';
  
  // Convert common formatting to Telegram Markdown
  return message
    .replace(/\*\*(.*?)\*\*/g, '*$1*')  // Bold
    .replace(/__(.*?)__/g, '_$1_')      // Italic
    .replace(/`(.*?)`/g, '`$1`')        // Code
    .replace(/\[(.*?)\]\((.*?)\)/g, '[$1]($2)') // Links
    // Escape special characters
    .replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

/**
 * Get Telegram bot status
 */
export function getTelegramStatus() {
  return {
    initialized: isInitialized,
    hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
    provider: 'Telegram Bot API',
    features: ['Text messaging', 'Inline keyboards', 'Callback queries', 'Markdown support'],
    polling: isInitialized ? 'Active' : 'Inactive'
  };
}

/**
 * Get bot information
 */
export async function getTelegramBotInfo() {
  if (!isInitialized) {
    return { error: 'Bot not initialized' };
  }
  
  try {
    const botInfo = await bot.getMe();
    return {
      id: botInfo.id,
      username: botInfo.username,
      first_name: botInfo.first_name,
      is_bot: botInfo.is_bot,
      can_join_groups: botInfo.can_join_groups,
      can_read_all_group_messages: botInfo.can_read_all_group_messages,
      supports_inline_queries: botInfo.supports_inline_queries
    };
  } catch (error) {
    console.error('❌ Error getting bot info:', error);
    return { error: error.message };
  }
}

/**
 * Stop the Telegram bot
 */
export function stopTelegramBot() {
  if (bot && isInitialized) {
    bot.stopPolling();
    console.log('⏹️ Telegram bot stopped');
    isInitialized = false;
  }
}
// index.js
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { initSQLite, insertVoiceLog } from "./database/db.js";
import { helpController, firstAidController, preventionController, alertController, statsController } from "./backend/controllers.js";
import "./backend/cron.js"; // Load scheduled tasks
import { initTwilio, handleIncomingSMS, sendSMS } from "./bot/bot.js";
import { initFast2SMS, sendFast2SMS, getFast2SMSStatus, sendBulkFast2SMS } from "./bot/fast2sms.js";
import { initTelegramBot, sendTelegramMessage, getTelegramStatus, getTelegramBotInfo } from "./bot/telegram.js";
import { initWhatsApp, sendWhatsAppMessage, sendEmergencyContacts, sendHealthAlert, getWhatsAppStatus, handleWhatsAppWebhook } from "./bot/whatsapp.js";
import { initVoiceSystem, processVoiceHealthQuery, textToSpeech, cleanupTempFiles } from "./bot/voice.js";
import multer from "multer";
import fs from "fs";
import db from "./database/db.js" ;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from frontend directory
app.use(express.static('frontend'));

// Configure multer for file uploads (voice messages)
const upload = multer({
  dest: 'temp/',
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio format'), false);
    }
  }
});

// --- Initialize Databases ---
async function initDatabases() {
  try {
    await initSQLite();
    console.log("✅ SQLite initialized");

    // MongoDB is optional - try to connect if URI provided
    if (process.env.MONGO_URI) {
      try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB connected");
      } catch (mongoError) {
        console.log("⚠️ MongoDB not available, using SQLite only");
      }
    } else {
      console.log("⚠️ No MONGO_URI provided, using SQLite only");
    }
  } catch (err) {
    console.error("❌ Database init failed:", err);
  }
}

// --- API Routes (for frontend demo or testing) ---
app.get("/ping", (req, res) => res.send("Backend running ✅"));

// SMS webhook endpoint for receiving messages
app.use(express.urlencoded({ extended: false }));

app.post("/sms-webhook", async (req, res) => {
  const { From, Body } = req.body;
  
  try {
    console.log(`📱 Incoming SMS from ${From}: ${Body}`);
    const reply = await handleIncomingSMS(From, Body);
    
    // Escape XML characters to prevent TwiML parsing errors
    const escapedReply = reply
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    
    // Respond with properly escaped TwiML for Twilio
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Message>${escapedReply}</Message>
    </Response>`;
    
    res.type('text/xml');
    res.send(twimlResponse);
  } catch (error) {
    console.error('❌ SMS webhook error:', error);
    res.status(500).send('Error processing SMS');
  }
});

// SMS status page
app.get("/sms-status", (req, res) => {
  res.json({
    service: "SMS Health Alert Bot",
    status: "active",
    message: "Send SMS to configured Twilio number with commands like HELP, FIRSTAID burns, PREVENT malaria",
    timestamp: new Date().toISOString()
  });
});

app.get("/query/:command", async (req, res) => {
  const fullCommand = req.params.command;
  const parts = fullCommand.split(" ");
  const cmd = parts[0];
  const arg = parts.slice(1).join(" "); // Join all parts after the command
  let response = "🤖 Unknown command";

  try {
    if (cmd === "HELP") response = await helpController();
    if (cmd === "FIRSTAID") response = await firstAidController(arg);
    if (cmd === "PREVENT") response = await preventionController(arg);
    if (cmd === "ALERT") response = await alertController(arg);
    if (cmd === "STATS") response = await statsController();
  } catch (err) {
    console.error("❌ Error handling command:", err);
    response = "⚠️ Something went wrong. Please try again later.";
  }

  res.send(response);
});

// WhatsApp webhook endpoint for receiving messages
app.get("/whatsapp-webhook", (req, res) => {
  // Webhook verification
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'health_alert_bot_verify';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('❌ WhatsApp webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

app.post("/whatsapp-webhook", express.json(), async (req, res) => {
  try {
    console.log('📱 WhatsApp webhook received');
    
    // Handle the webhook data using our WhatsApp module
    await handleWhatsAppWebhook(req.body);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ WhatsApp webhook processing error:', error);
    res.status(500).send('Error');
  }
});

// Voice query endpoint for audio processing
app.post("/voice-query", upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio file provided',
        supportedFormats: ['mp3', 'wav', 'mp4', 'webm', 'ogg']
      });
    }
    
    console.log(`🎤 Processing voice query from file: ${req.file.originalname}`);
    
    // Process voice query using OpenAI
    const startTime = Date.now();
    const result = await processVoiceHealthQuery(req.file.path, async (text) => {
      // Use existing SMS handler for consistency
      return await handleIncomingSMS('voice_user', text);
    });
    
    // Log voice interaction to database
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    try {
      await insertVoiceLog(
        req.ip || 'unknown', // Use IP as user identifier
        result.transcription,
        result.textResponse,
        result.language,
        duration
      );
    } catch (logError) {
      console.log('⚠️ Failed to log voice interaction:', logError.message);
    }
    
    // Send audio response
    res.json({
      success: true,
      transcription: result.transcription,
      textResponse: result.textResponse,
      audioResponse: result.audioResponse ? `http://localhost:${PORT}/audio/${path.basename(result.audioResponse)}` : null,
      language: result.language,
      processingTime: duration
    });
    
    // Clean up uploaded file
    if (req.file.path) {
      setTimeout(() => {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.log('File already cleaned:', e.message);
        }
      }, 1000);
    }
    
  } catch (error) {
    console.error('❌ Voice query error:', error);
    res.status(500).json({ 
      error: 'Voice processing failed', 
      message: error.message 
    });
  }
});

// Serve generated audio files
app.use("/audio", express.static('temp'));

// Voice TTS endpoint for text-to-speech conversion
app.post("/voice-tts", express.json(), async (req, res) => {
  try {
    const { text, language = 'en' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    console.log(`🔊 Converting text to speech: "${text.substring(0, 50)}..."`);
    
    const audioPath = await textToSpeech(text, language);
    const audioUrl = `http://localhost:${PORT}/audio/${path.basename(audioPath)}`;
    
    res.json({
      success: true,
      audioUrl: audioUrl,
      language: language
    });
    
  } catch (error) {
    console.error('❌ TTS error:', error);
    res.status(500).json({ 
      error: 'Text-to-speech failed', 
      message: error.message 
    });
  }
});

// System status endpoint
app.get("/status", (req, res) => {
  
  res.json({
    service: "AI Health Alert Bot - Odisha",
    channels: {
      sms: {
        fast2sms: getFast2SMSStatus(),
        twilio: {
          available: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
          endpoint: "/sms-webhook"
        }
      },
      whatsapp: getWhatsAppStatus(),
      telegram: getTelegramStatus(),
      voice: {
        available: !!process.env.OPENAI_API_KEY,
        endpoint: "/voice-query"
      },
      web: {
        available: true,
        endpoint: "/query"
      }
    },
    features: [
      "Multi-channel communication (SMS, WhatsApp, Telegram, Voice, Web)",
      "Voice recognition and text-to-speech",
      "Regional health alerts for Odisha",
      "Emergency contact integration",
      "First aid guidance",
      "Disease prevention tips",
      "Outbreak reporting and tracking"
    ],
    timestamp: new Date().toISOString()
  });
});

// --- Start Server + All Bots ---
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 SMS Webhook: http://localhost:${PORT}/sms-webhook`);
  console.log(`📊 SMS Status: http://localhost:${PORT}/sms-status`);
  await initDatabases();

  // Initialize all communication channels
  
  // SMS Services
  const fast2smsReady = initFast2SMS();
  const twilioReady = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? 
    initTwilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : false;
  
  if (fast2smsReady) {
    console.log('✅ Fast2SMS (India) Health Alert Bot ready');
    console.log('🇮🇳 Free SMS credits available for Indian numbers');
  } else if (twilioReady) {
    console.log('✅ SMS Health Alert Bot ready');
    console.log('📱 Configure Twilio webhook to point to /sms-webhook');
  } else {
    console.log('⚠️ No SMS service configured. SMS features disabled.');
    console.log('💡 Add Fast2SMS API key or Twilio credentials to enable SMS');
  }
  
  // WhatsApp Business API
  if (initWhatsApp()) {
    console.log('✅ WhatsApp Health Alert Bot ready');
    console.log('📱 Configure WhatsApp webhook to point to /whatsapp-webhook');
  }
  
  // Telegram Bot
  if (initTelegramBot()) {
    console.log('✅ Telegram Health Alert Bot ready');
    console.log('📱 Bot is polling for messages on Telegram');
  }
  
  // Voice Recognition System
  if (process.env.OPENAI_API_KEY) {
    initVoiceSystem();
    console.log('✅ Voice Recognition System ready');
    console.log('🎤 Voice processing available at /voice-query');
    
    // Start cleanup job for temporary audio files
    setInterval(cleanupTempFiles, 60 * 60 * 1000); // Every hour
  } else {
    console.log('⚠️ OpenAI credentials not found. Voice features disabled.');
    console.log('💡 Add OPENAI_API_KEY to enable voice recognition');
  }
}) 

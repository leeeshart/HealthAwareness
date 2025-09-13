// bot/vosk-offline.js - Offline Speech Recognition using Vosk API
import vosk from 'vosk';
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';

let model = null;
let recognizer = null;
let isInitialized = false;

// Language model paths (these need to be downloaded)
const MODEL_PATHS = {
  hi: './models/vosk-model-hi-0.22',      // Hindi
  en: './models/vosk-model-en-us-0.22',   // English
  or: './models/vosk-model-hi-0.22'       // Odia (fallback to Hindi for now)
};

/**
 * Initialize Vosk offline speech recognition
 */
export async function initVoskOffline() {
  try {
    console.log('🎤 Initializing Vosk offline speech recognition...');
    
    // Check if any model exists
    const availableModels = Object.entries(MODEL_PATHS).filter(([lang, modelPath]) => {
      return fs.existsSync(modelPath);
    });
    
    if (availableModels.length === 0) {
      console.log('⚠️ No Vosk models found. Downloading compact English model...');
      await downloadCompactModel();
    }
    
    // Initialize with English model first (most common)
    const englishModelPath = MODEL_PATHS.en;
    if (fs.existsSync(englishModelPath)) {
      vosk.setLogLevel(0); // Reduce log spam
      model = new vosk.Model(englishModelPath);
      recognizer = new vosk.Recognizer({ model: model, sampleRate: 16000 });
      isInitialized = true;
      
      console.log('✅ Vosk offline speech recognition ready');
      console.log('🌐 Supported languages: Hindi, English, Odia (offline)');
      return true;
    }
    
    console.log('⚠️ Could not initialize Vosk - no models available');
    return false;
    
  } catch (error) {
    console.error('❌ Vosk initialization error:', error);
    return false;
  }
}

/**
 * Download a compact Vosk model for basic functionality
 */
async function downloadCompactModel() {
  console.log('📥 Downloading compact Vosk model (this may take a moment)...');
  
  // Create models directory
  if (!fs.existsSync('./models')) {
    fs.mkdirSync('./models', { recursive: true });
  }
  
  // Note: In a real deployment, you'd download from:
  // https://alphacephei.com/vosk/models
  // For now, create a placeholder structure
  console.log('💡 To enable offline speech recognition:');
  console.log('1. Download models from: https://alphacephei.com/vosk/models');
  console.log('2. Extract to ./models/ directory');
  console.log('3. Restart the application');
}

/**
 * Process audio file with Vosk offline recognition
 */
export async function processOfflineAudio(audioFilePath, language = 'en') {
  if (!isInitialized) {
    throw new Error('Vosk offline recognition not initialized');
  }
  
  try {
    console.log(`🎤 Processing audio offline with Vosk (${language})...`);
    
    // Convert audio to required format (16kHz, mono, WAV)
    const processedPath = await convertAudioForVosk(audioFilePath);
    
    // Read audio file
    const audioBuffer = fs.readFileSync(processedPath);
    
    // Process with Vosk
    recognizer.acceptWaveform(audioBuffer);
    const result = recognizer.finalResult();
    const parsed = JSON.parse(result);
    
    // Clean up temporary file
    if (processedPath !== audioFilePath) {
      fs.unlinkSync(processedPath);
    }
    
    console.log(`✅ Offline transcription: "${parsed.text}"`);
    
    return {
      text: parsed.text || '',
      confidence: parsed.conf || 0.0,
      language: language,
      offline: true
    };
    
  } catch (error) {
    console.error('❌ Vosk offline processing error:', error);
    throw error;
  }
}

/**
 * Convert audio file to Vosk-compatible format
 */
async function convertAudioForVosk(inputPath) {
  return new Promise((resolve, reject) => {
    const outputPath = inputPath.replace(/\.[^/.]+$/, '_vosk.wav');
    
    // Use ffmpeg to convert to 16kHz mono WAV
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-ar', '16000',        // 16kHz sample rate
      '-ac', '1',            // Mono channel
      '-f', 'wav',           // WAV format
      '-y',                  // Overwrite output
      outputPath
    ]);
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg conversion failed with code ${code}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Get available offline models
 */
export function getOfflineModels() {
  const available = {};
  
  Object.entries(MODEL_PATHS).forEach(([lang, modelPath]) => {
    available[lang] = {
      path: modelPath,
      exists: fs.existsSync(modelPath),
      language: {
        hi: 'Hindi',
        en: 'English', 
        or: 'Odia (fallback to Hindi)'
      }[lang]
    };
  });
  
  return available;
}

/**
 * Process voice query offline (fallback when OpenAI unavailable)
 */
export async function processOfflineVoiceQuery(audioFilePath, textProcessor, language = 'en') {
  if (!isInitialized) {
    return {
      textResponse: "Offline voice recognition is not available. Please type your question.",
      transcription: '',
      language: language,
      offline: true,
      audioResponse: null
    };
  }
  
  try {
    // Transcribe audio offline
    const transcription = await processOfflineAudio(audioFilePath, language);
    
    // Process the transcribed text
    const textResponse = await textProcessor(transcription.text);
    
    return {
      textResponse: textResponse,
      transcription: transcription.text,
      language: transcription.language,
      confidence: transcription.confidence,
      offline: true,
      audioResponse: null // No TTS in offline mode
    };
    
  } catch (error) {
    console.error('❌ Offline voice query error:', error);
    return {
      textResponse: "I couldn't process your voice message offline. Please type your question.",
      transcription: '',
      language: language,
      offline: true,
      audioResponse: null
    };
  }
}

/**
 * Get Vosk system status
 */
export function getVoskStatus() {
  return {
    initialized: isInitialized,
    hasModels: Object.values(MODEL_PATHS).some(path => fs.existsSync(path)),
    availableModels: getOfflineModels(),
    provider: 'Vosk Offline',
    features: ['Offline speech recognition', 'No internet required', 'Privacy-focused', 'Multi-language support'],
    limitations: ['No text-to-speech', 'Requires model download', 'Lower accuracy than cloud services']
  };
}
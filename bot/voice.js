// bot/voice.js - Voice Recognition and TTS System for Health Alert Bot
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openai;

// Set FFmpeg path for audio processing
ffmpeg.setFfmpegPath(ffmpegPath.path);

/**
 * Initialize voice processing system
 */
export function initVoiceSystem() {
  try {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not found. Voice features disabled.');
      return false;
    }
    
    // Initialize OpenAI client
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Create temp directory for audio files
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    console.log('🎤 Voice Recognition System initialized');
    return true;
  } catch (error) {
    console.error('❌ Voice system initialization failed:', error);
    return false;
  }
}

/**
 * Convert speech to text using OpenAI Whisper
 * @param {string} audioFilePath - Path to audio file
 * @returns {Promise<{text: string, duration: number, language: string}>}
 */
export async function speechToText(audioFilePath) {
  if (!openai) {
    throw new Error('Voice system not initialized. OpenAI API key required.');
  }
  
  try {
    // Convert audio to compatible format if needed
    const processedPath = await processAudioFile(audioFilePath);
    
    const audioReadStream = fs.createReadStream(processedPath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      response_format: "json",
      // Let OpenAI auto-detect language (supports Hindi, Odia, English)
    });

    // Clean up temporary files
    if (processedPath !== audioFilePath) {
      fs.unlinkSync(processedPath);
    }

    return {
      text: transcription.text,
      duration: transcription.duration || 0,
      language: transcription.language || 'hi'
    };
  } catch (error) {
    console.error('❌ Speech to text error:', error);
    throw new Error(`Voice transcription failed: ${error.message}`);
  }
}

/**
 * Convert text to speech using OpenAI TTS
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code (hi for Hindi, en for English)
 * @returns {Promise<string>} - Path to generated audio file
 */
export async function textToSpeech(text, language = 'en') {
  if (!openai) {
    throw new Error('Voice system not initialized. OpenAI API key required.');
  }
  
  try {
    // Optimize text for TTS (remove formatting)
    const cleanText = text
      .replace(/[*_]/g, '') // Remove markdown
      .replace(/━{3,}/g, '') // Remove decorative lines
      .replace(/[🔥🩹💚🚨📞]/g, '') // Remove emojis
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Limit text length for TTS (max 4096 chars)
    const limitedText = cleanText.length > 4000 
      ? cleanText.substring(0, 3950) + "... For complete information, visit our website."
      : cleanText;

    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy", // Good for health information
      input: limitedText,
      response_format: "mp3",
      speed: 0.9 // Slightly slower for clarity
    });

    // Save audio file
    const audioFileName = `tts_${Date.now()}.mp3`;
    const audioPath = path.join(__dirname, '../temp', audioFileName);
    
    const buffer = Buffer.from(await speech.arrayBuffer());
    fs.writeFileSync(audioPath, buffer);

    return audioPath;
  } catch (error) {
    console.error('❌ Text to speech error:', error);
    throw new Error(`Voice generation failed: ${error.message}`);
  }
}

/**
 * Process voice health query
 * @param {string} audioFilePath - Path to voice input
 * @param {Function} healthQueryHandler - Function to process health query
 * @returns {Promise<{audioResponse: string, textResponse: string}>}
 */
export async function processVoiceHealthQuery(audioFilePath, healthQueryHandler) {
  try {
    console.log('🎤 Processing voice query...');
    
    // Convert speech to text
    const transcription = await speechToText(audioFilePath);
    console.log(`🎤 Transcribed: "${transcription.text}"`);
    
    // Process health query
    const textResponse = await healthQueryHandler(transcription.text);
    
    // Convert response to speech
    const audioResponsePath = await textToSpeech(textResponse, transcription.language);
    
    return {
      audioResponse: audioResponsePath,
      textResponse: textResponse,
      transcription: transcription.text,
      language: transcription.language
    };
  } catch (error) {
    console.error('❌ Voice query processing error:', error);
    
    // Try offline voice recognition as fallback
    try {
      const offlineResult = await processOfflineVoice(audioFilePath, textProcessor);
      if (offlineResult && offlineResult.textResponse) {
        return offlineResult;
      }
    } catch (offlineError) {
      console.log('⚠️ Offline voice recognition also failed:', offlineError.message);
    }
    
    // Final fallback response (text-only)
    const fallbackText = "I'm sorry, I couldn't process your voice message. Please try again or text your question.";
    let fallbackAudio = null;
    
    try {
      if (openai) {
        fallbackAudio = await textToSpeech(fallbackText);
      }
    } catch (ttsError) {
      console.log('⚠️ TTS fallback also failed, returning text-only');
    }
    
    return {
      audioResponse: fallbackAudio,
      textResponse: fallbackText,
      transcription: '',
      language: 'en'
    };
  }
}

/**
 * Process audio file to ensure compatibility
 * @param {string} inputPath - Input audio file path
 * @returns {Promise<string>} - Path to processed audio file
 */
async function processAudioFile(inputPath) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(__dirname, '../temp', `processed_${Date.now()}.wav`);
    
    ffmpeg(inputPath)
      .audioChannels(1) // Mono
      .audioFrequency(16000) // 16kHz sample rate
      .audioCodec('pcm_s16le') // PCM format
      .format('wav')
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Audio processing error:', err);
        // If processing fails, use original file
        resolve(inputPath);
      })
      .save(outputPath);
  });
}

/**
 * Clean up temporary audio files older than 1 hour
 */
export function cleanupTempFiles() {
  try {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) return;
    
    const files = fs.readdirSync(tempDir);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime.getTime() < oneHourAgo) {
        fs.unlinkSync(filePath);
        console.log(`🧹 Cleaned up old audio file: ${file}`);
      }
    });
  } catch (error) {
    console.error('❌ Temp file cleanup error:', error);
  }
}

/**
 * Get supported audio formats
 */
export function getSupportedFormats() {
  return {
    input: ['mp3', 'mp4', 'm4a', 'wav', 'webm', 'ogg'],
    output: ['mp3', 'wav'],
    maxSize: '25MB',
    maxDuration: '30 minutes'
  };
}

/**
 * Validate audio file
 */
export function validateAudioFile(filePath, maxSizeBytes = 25 * 1024 * 1024) {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const supportedExts = ['.mp3', '.mp4', '.m4a', '.wav', '.webm', '.ogg'];
    
    if (!supportedExts.includes(ext)) {
      throw new Error(`Unsupported audio format: ${ext}`);
    }
    
    if (stats.size > maxSizeBytes) {
      throw new Error(`Audio file too large: ${Math.round(stats.size / 1024 / 1024)}MB (max 25MB)`);
    }
    
    return true;
  } catch (error) {
    throw new Error(`Audio validation failed: ${error.message}`);
  }
}

/**
 * Process audio using offline Vosk recognition
 */
async function processOfflineVoice(audioFilePath, textProcessor) {
  return new Promise((resolve, reject) => {
    console.log('🎤 Trying offline voice recognition with Vosk...');
    
    const pythonScript = path.join(__dirname, '../offline_voice/vosk_recognizer.py');
    const python = spawn('python3', [pythonScript, audioFilePath]);
    
    let output = '';
    let error = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    python.on('close', async (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          
          if (result.error) {
            reject(new Error(result.error));
            return;
          }
          
          if (result.text) {
            // Process the transcribed text
            const textResponse = await textProcessor(result.text);
            
            resolve({
              audioResponse: null, // No TTS in offline mode
              textResponse: textResponse,
              transcription: result.text,
              language: result.language || 'unknown',
              offline: true,
              confidence: result.confidence || 0.0
            });
          } else {
            reject(new Error('No text recognized from audio'));
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse offline recognition result: ${parseError.message}`));
        }
      } else {
        reject(new Error(`Offline recognition failed (exit code ${code}): ${error}`));
      }
    });
    
    python.on('error', (err) => {
      reject(new Error(`Failed to start offline recognition: ${err.message}`));
    });
  });
}

/**
 * Get voice system status including offline capabilities
 */
export function getVoiceStatus() {
  return {
    online: {
      openai: !!openai,
      hasApiKey: !!process.env.OPENAI_API_KEY,
      models: ['whisper-1', 'tts-1', 'gpt-5']
    },
    offline: {
      available: true,
      vosk: 'Python + Vosk',
      languages: ['Hindi', 'English', 'Odia (via Hindi models)']
    },
    tempDirectory: path.join(__dirname, '../temp'),
    supportedFormats: ['mp3', 'wav', 'ogg', 'webm', 'm4a']
  };
}

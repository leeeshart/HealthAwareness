#!/usr/bin/env python3
"""
Offline Voice Recognition using Vosk API
Supports Hindi, Odia, and English speech recognition without internet
"""

import sys
import json
import os
import wave
import subprocess
from pathlib import Path
from vosk import Model, KaldiRecognizer

class VoskOfflineRecognizer:
    def __init__(self, model_path=None, sample_rate=16000):
        self.sample_rate = sample_rate
        self.model = None
        self.rec = None
        self.model_path = model_path or "models"
        
        # Try to initialize with available models
        self.initialize_model()
    
    def initialize_model(self):
        """Initialize Vosk model from available models directory"""
        models_dir = Path(self.model_path)
        
        if not models_dir.exists():
            models_dir.mkdir(parents=True, exist_ok=True)
            print(f"📁 Created models directory: {models_dir}")
            return False
        
        # Look for any available model
        model_dirs = [d for d in models_dir.iterdir() if d.is_dir() and d.name.startswith('vosk-model')]
        
        if not model_dirs:
            print("⚠️ No Vosk models found. Download models first.")
            self.list_available_models()
            return False
        
        # Use the first available model
        selected_model = model_dirs[0]
        
        try:
            print(f"🔄 Loading Vosk model: {selected_model.name}")
            self.model = Model(str(selected_model))
            self.rec = KaldiRecognizer(self.model, self.sample_rate)
            print(f"✅ Vosk offline recognition ready with {selected_model.name}")
            return True
        except Exception as e:
            print(f"❌ Error loading model {selected_model}: {e}")
            return False
    
    def process_audio_file(self, audio_file_path):
        """Process audio file and return transcription"""
        if not self.model or not self.rec:
            return {"error": "Vosk model not initialized"}
        
        try:
            # Convert audio to required format if needed
            wav_file = self.convert_to_wav(audio_file_path)
            
            # Read WAV file
            wf = wave.open(wav_file, 'rb')
            
            # Check audio format
            if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != self.sample_rate:
                print(f"⚠️ Audio format: {wf.getnchannels()}ch, {wf.getsampwidth()*8}bit, {wf.getframerate()}Hz")
                print("Converting to required format...")
                wf.close()
                wav_file = self.convert_audio_format(wav_file)
                wf = wave.open(wav_file, 'rb')
            
            # Process audio in chunks
            results = []
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                    
                if self.rec.AcceptWaveform(data):
                    result = json.loads(self.rec.Result())
                    if result.get('text'):
                        results.append(result['text'])
            
            # Get final result
            final_result = json.loads(self.rec.FinalResult())
            if final_result.get('text'):
                results.append(final_result['text'])
            
            wf.close()
            
            # Clean up temporary files
            if wav_file != audio_file_path:
                os.unlink(wav_file)
            
            # Combine all text results
            full_text = ' '.join(results).strip()
            
            return {
                "text": full_text,
                "confidence": 1.0 if full_text else 0.0,
                "language": self.detect_language(full_text),
                "offline": True
            }
            
        except Exception as e:
            print(f"❌ Error processing audio: {e}")
            return {"error": str(e)}
    
    def convert_to_wav(self, audio_file):
        """Convert audio file to WAV format"""
        if audio_file.lower().endswith('.wav'):
            return audio_file
        
        wav_file = audio_file.rsplit('.', 1)[0] + '_converted.wav'
        
        try:
            subprocess.run([
                'ffmpeg', '-i', audio_file, 
                '-ar', str(self.sample_rate),
                '-ac', '1',
                '-f', 'wav',
                '-y', wav_file
            ], check=True, capture_output=True)
            
            return wav_file
        except subprocess.CalledProcessError as e:
            print(f"❌ FFmpeg conversion failed: {e}")
            return audio_file
    
    def convert_audio_format(self, wav_file):
        """Convert WAV to correct format (16kHz, mono, 16-bit)"""
        output_file = wav_file.rsplit('.', 1)[0] + '_formatted.wav'
        
        try:
            subprocess.run([
                'ffmpeg', '-i', wav_file,
                '-ar', str(self.sample_rate),
                '-ac', '1',
                '-sample_fmt', 's16',
                '-f', 'wav',
                '-y', output_file
            ], check=True, capture_output=True)
            
            return output_file
        except subprocess.CalledProcessError as e:
            print(f"❌ Audio format conversion failed: {e}")
            return wav_file
    
    def detect_language(self, text):
        """Simple language detection based on script/characters"""
        if not text:
            return "unknown"
        
        # Check for Odia script (Odia Unicode range)
        odia_chars = sum(1 for c in text if '\u0B00' <= c <= '\u0B7F')
        # Check for Hindi/Devanagari script
        hindi_chars = sum(1 for c in text if '\u0900' <= c <= '\u097F')
        # Check for English (basic Latin)
        english_chars = sum(1 for c in text if c.isascii() and c.isalpha())
        
        total_chars = len([c for c in text if c.isalpha()])
        if total_chars == 0:
            return "unknown"
        
        if odia_chars / total_chars > 0.3:
            return "or"  # Odia
        elif hindi_chars / total_chars > 0.3:
            return "hi"  # Hindi
        elif english_chars / total_chars > 0.7:
            return "en"  # English
        else:
            return "mixed"
    
    def list_available_models(self):
        """Show available models that can be downloaded"""
        models_info = {
            "vosk-model-hi-0.22": {
                "language": "Hindi",
                "size": "1.8GB",
                "url": "https://alphacephei.com/vosk/models/vosk-model-hi-0.22.zip",
                "description": "Large Hindi model with good accuracy"
            },
            "vosk-model-small-hi-0.22": {
                "language": "Hindi",
                "size": "45MB", 
                "url": "https://alphacephei.com/vosk/models/vosk-model-small-hi-0.22.zip",
                "description": "Compact Hindi model for basic recognition"
            },
            "vosk-model-en-us-0.22": {
                "language": "English (US)",
                "size": "1.8GB",
                "url": "https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip",
                "description": "Large English model with excellent accuracy"
            },
            "vosk-model-small-en-us-0.15": {
                "language": "English (US)",
                "size": "40MB",
                "url": "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip",
                "description": "Compact English model for basic recognition"
            }
        }
        
        print("\n📋 Available Vosk Models for Download:")
        print("=" * 60)
        for model_name, info in models_info.items():
            print(f"🔹 {model_name}")
            print(f"   Language: {info['language']}")
            print(f"   Size: {info['size']}")
            print(f"   Description: {info['description']}")
            print(f"   URL: {info['url']}")
            print()
        
        print("💡 To download a model:")
        print("   cd models && wget <model_url> && unzip <model_file>")
        print("\n📝 Note: For Odia, use Hindi models as they provide good cross-linguistic support")
    
    def get_status(self):
        """Get current status of the offline recognition system"""
        models_dir = Path(self.model_path)
        available_models = []
        
        if models_dir.exists():
            available_models = [d.name for d in models_dir.iterdir() 
                              if d.is_dir() and d.name.startswith('vosk-model')]
        
        return {
            "initialized": bool(self.model),
            "models_directory": str(models_dir),
            "available_models": available_models,
            "current_model": getattr(self.model, 'model_path', None) if self.model else None,
            "sample_rate": self.sample_rate,
            "languages": ["Hindi", "English", "Odia (via Hindi models)"]
        }

# Command line interface
if __name__ == "__main__":
    recognizer = VoskOfflineRecognizer()
    
    if len(sys.argv) < 2:
        print("Usage: python vosk_recognizer.py <audio_file>")
        print("       python vosk_recognizer.py --status")
        print("       python vosk_recognizer.py --list-models")
        sys.exit(1)
    
    if sys.argv[1] == "--status":
        status = recognizer.get_status()
        print(json.dumps(status, indent=2))
    elif sys.argv[1] == "--list-models":
        recognizer.list_available_models()
    else:
        audio_file = sys.argv[1]
        if not os.path.exists(audio_file):
            print(f"❌ Audio file not found: {audio_file}")
            sys.exit(1)
        
        print(f"🎤 Processing audio file: {audio_file}")
        result = recognizer.process_audio_file(audio_file)
        print(json.dumps(result, indent=2, ensure_ascii=False))
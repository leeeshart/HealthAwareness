#!/usr/bin/env python3
"""
Download and manage Vosk models for offline speech recognition
"""

import os
import sys
import requests
import zipfile
from pathlib import Path
from urllib.parse import urlparse

class VoskModelDownloader:
    def __init__(self, models_dir="models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        
        self.available_models = {
            # Compact models (good for testing)
            "small-hi": {
                "name": "vosk-model-small-hi-0.22",
                "url": "https://alphacephei.com/vosk/models/vosk-model-small-hi-0.22.zip",
                "size": "45MB",
                "language": "Hindi (Compact)",
                "recommended": True
            },
            "small-en": {
                "name": "vosk-model-small-en-us-0.15", 
                "url": "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip",
                "size": "40MB",
                "language": "English (Compact)",
                "recommended": True
            },
            
            # Full models (better accuracy)
            "hi": {
                "name": "vosk-model-hi-0.22",
                "url": "https://alphacephei.com/vosk/models/vosk-model-hi-0.22.zip", 
                "size": "1.8GB",
                "language": "Hindi (Full)",
                "recommended": False
            },
            "en": {
                "name": "vosk-model-en-us-0.22",
                "url": "https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip",
                "size": "1.8GB", 
                "language": "English (Full)",
                "recommended": False
            }
        }
    
    def list_models(self):
        """List available models"""
        print("📋 Available Vosk Models:")
        print("=" * 50)
        
        for key, model in self.available_models.items():
            status = "✅" if self.is_model_downloaded(model["name"]) else "⬇️"
            recommended = "⭐" if model["recommended"] else "  "
            
            print(f"{status} {recommended} {key}: {model['language']} ({model['size']})")
            print(f"    {model['name']}")
            print()
        
        print("💡 Recommended models marked with ⭐")
        print("✅ = Downloaded, ⬇️ = Available for download")
    
    def is_model_downloaded(self, model_name):
        """Check if model is already downloaded"""
        model_path = self.models_dir / model_name
        return model_path.exists() and model_path.is_dir()
    
    def download_model(self, model_key):
        """Download and extract a model"""
        if model_key not in self.available_models:
            print(f"❌ Unknown model: {model_key}")
            print(f"Available models: {list(self.available_models.keys())}")
            return False
        
        model = self.available_models[model_key]
        model_name = model["name"]
        
        if self.is_model_downloaded(model_name):
            print(f"✅ Model {model_name} already exists")
            return True
        
        print(f"📥 Downloading {model_name} ({model['size']})...")
        
        zip_path = None
        try:
            # Download the zip file
            zip_path = self.models_dir / f"{model_name}.zip"
            
            response = requests.get(model["url"], stream=True)
            response.raise_for_status()
            
            # Show download progress
            total_size = int(response.headers.get('content-length', 0))
            block_size = 8192
            downloaded = 0
            
            with open(zip_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=block_size):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            progress = (downloaded / total_size) * 100
                            print(f"\r📥 Progress: {progress:.1f}%", end='', flush=True)
            
            print("\n📦 Extracting model...")
            
            # Extract the zip file
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(self.models_dir)
            
            # Remove the zip file
            zip_path.unlink()
            
            print(f"✅ Successfully downloaded and extracted {model_name}")
            return True
            
        except Exception as e:
            print(f"❌ Error downloading model: {e}")
            # Clean up partial download
            if zip_path and zip_path.exists():
                zip_path.unlink()
            return False
    
    def download_recommended(self):
        """Download all recommended models"""
        print("📥 Downloading recommended models for Hindi and English...")
        
        success = True
        for key, model in self.available_models.items():
            if model["recommended"]:
                if not self.download_model(key):
                    success = False
        
        return success
    
    def get_model_path(self, language_preference="hi"):
        """Get path to best available model for language"""
        # Priority order based on language preference
        if language_preference == "hi":
            priorities = ["small-hi", "hi", "small-en", "en"]
        else:  # English or fallback
            priorities = ["small-en", "en", "small-hi", "hi"]
        
        for key in priorities:
            if key in self.available_models:
                model_name = self.available_models[key]["name"]
                if self.is_model_downloaded(model_name):
                    return self.models_dir / model_name
        
        return None
    
    def status(self):
        """Get download status"""
        downloaded = []
        available = []
        
        for key, model in self.available_models.items():
            if self.is_model_downloaded(model["name"]):
                downloaded.append({
                    "key": key,
                    "name": model["name"],
                    "language": model["language"],
                    "path": str(self.models_dir / model["name"])
                })
            else:
                available.append({
                    "key": key,
                    "name": model["name"], 
                    "language": model["language"],
                    "size": model["size"]
                })
        
        return {
            "models_directory": str(self.models_dir),
            "downloaded_models": downloaded,
            "available_for_download": available
        }

if __name__ == "__main__":
    downloader = VoskModelDownloader()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python model_downloader.py list")
        print("  python model_downloader.py download <model_key>")
        print("  python model_downloader.py download-recommended")
        print("  python model_downloader.py status")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "list":
        downloader.list_models()
    elif command == "download":
        if len(sys.argv) < 3:
            print("❌ Please specify model key")
            downloader.list_models()
        else:
            model_key = sys.argv[2]
            downloader.download_model(model_key)
    elif command == "download-recommended":
        downloader.download_recommended()
    elif command == "status":
        import json
        status = downloader.status()
        print(json.dumps(status, indent=2))
    else:
        print(f"❌ Unknown command: {command}")

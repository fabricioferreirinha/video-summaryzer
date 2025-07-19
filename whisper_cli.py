import whisper
import argparse
import json
import logging
import torch
import os
import time
import sys
import codecs
import base64
from datetime import datetime

# Configure UTF-8 encoding for Windows compatibility
if sys.platform == 'win32':
    # Force UTF-8 encoding for stdout
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    # Also set environment variables for subprocess
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# Configure logging to stderr to avoid interfering with JSON output
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Limit CPU usage to prevent system freeze
CPU_CORES = max(1, os.cpu_count() // 2)  # Use only half of available cores
os.environ['OMP_NUM_THREADS'] = str(CPU_CORES)
os.environ['MKL_NUM_THREADS'] = str(CPU_CORES)
torch.set_num_threads(CPU_CORES)

# Check GPU availability
device = "cuda" if torch.cuda.is_available() else "cpu"
print(json.dumps({"progress": 5, "status": f"Using device: {device}"}), flush=True)
if device == "cuda":
    gpu_name = torch.cuda.get_device_name(0)
    gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(json.dumps({"progress": 8, "status": f"GPU: {gpu_name} ({gpu_memory:.1f} GB)"}), flush=True)

def transcribe_video(video_path, model_name='base', language=None):
    """Transcribe video using Whisper"""
    try:
        start_time = time.time()
        print(json.dumps({"progress": 10, "status": f"Starting transcription: {model_name} model"}), flush=True)
        
        # Report progress: Loading model
        print(json.dumps({"progress": 10, "status": "Loading model..."}), flush=True)
        
        # Load Whisper model with explicit device
        model = whisper.load_model(model_name, device=device)
        print(json.dumps({"progress": 30, "status": "Model loaded, detecting audio..."}), flush=True)
        
        # Transcribe
        options = {'language': language} if language else {}
        
        # Load audio and detect language if needed
        audio = whisper.load_audio(video_path)
        duration = len(audio)/16000
        
        # Function to format time in a human-readable way
        def format_time(seconds):
            if seconds < 60:
                return f"{seconds:.0f}s"
            elif seconds < 3600:
                minutes = seconds // 60
                secs = seconds % 60
                return f"{minutes:.0f}m {secs:.0f}s"
            else:
                hours = seconds // 3600
                minutes = (seconds % 3600) // 60
                secs = seconds % 60
                return f"{hours:.0f}h {minutes:.0f}m {secs:.0f}s"
        
        # Estimate processing time based on model and audio duration
        time_multipliers = {'tiny': 0.1, 'base': 0.2, 'small': 0.4, 'medium': 0.8, 'large': 1.5}
        estimated_time = duration * time_multipliers.get(model_name, 0.5)
        
        print(json.dumps({
            "progress": 50, 
            "status": f"Audio loaded ({format_time(duration)}), estimated time: {format_time(estimated_time)}"
        }), flush=True)
        
        # Transcribe with progress callback
        def progress_callback(progress):
            elapsed = time.time() - start_time
            if progress > 0:
                estimated_total = elapsed / progress
                remaining = estimated_total - elapsed
                remaining_str = f", ~{format_time(remaining)} remaining" if remaining > 0 else ""
            else:
                remaining_str = ""
            
            print(json.dumps({
                "progress": 50 + int(progress * 40), 
                "status": f"Transcribing on {device} ({CPU_CORES} cores)... {int(progress * 100)}%{remaining_str}"
            }), flush=True)
        
        # Suppress warnings and progress bars from appearing as errors
        import warnings
        warnings.filterwarnings("ignore")
        
        # Progress tracking variables
        segment_progress = 0
        total_segments = 0
        
        # Custom progress hook for better tracking
        def on_progress(progress_info):
            nonlocal segment_progress, total_segments
            
            if 'segment' in progress_info:
                segment_progress += 1
                if total_segments > 0:
                    progress = segment_progress / total_segments
                    progress_callback(progress)
        
        # Transcribe with simulated progress tracking
        import threading
        import asyncio
        
        # Variables for progress simulation
        simulation_progress = 0
        transcription_done = False
        
        def simulate_progress():
            nonlocal simulation_progress, transcription_done
            total_duration = len(audio) / 16000
            expected_time = total_duration * time_multipliers.get(model_name, 0.5)
            
            # Simulate progress over expected time
            steps = max(10, int(expected_time / 5))  # Update every 5 seconds or 10 steps minimum
            step_time = expected_time / steps
            
            for i in range(steps):
                if transcription_done:
                    break
                    
                # Non-linear progress (faster at start, slower at end)
                raw_progress = i / steps
                simulation_progress = raw_progress * (2 - raw_progress)  # Ease-out curve
                
                progress_callback(simulation_progress)
                time.sleep(step_time)
        
        # Start progress simulation in background
        progress_thread = threading.Thread(target=simulate_progress, daemon=True)
        progress_thread.start()
        
        try:
            # Actual transcription
            result = model.transcribe(audio, **options, verbose=False)
            transcription_done = True
            
        except Exception as e:
            transcription_done = True
            raise e
        
        print(json.dumps({"progress": 90, "status": "Finalizing transcription..."}), flush=True)
        
        # Process and send result - ONLY ONCE
        if not result:
            print(json.dumps({"progress": 0, "status": "Error: No transcription result"}), flush=True)
            return None
            
        # Extract text with validation
        text = result.get("text", "").strip()
        if not text:
            print(json.dumps({"progress": 0, "status": "Error: Empty transcription result"}), flush=True)
            return None
            
        # Clean up the text to avoid JSON issues
        import re
        import unicodedata
        
        def sanitize_for_json(text):
            """Sanitize text for safe JSON transmission"""
            # Normalize Unicode
            text = unicodedata.normalize('NFKD', text)
            
            # Remove control characters
            text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', ' ', text)
            
            # Replace problematic Unicode characters
            replacements = {
                '\u2013': '-',   # en dash
                '\u2014': '--',  # em dash
                '\u2018': "'",   # left single quotation mark
                '\u2019': "'",   # right single quotation mark
                '\u201c': '"',   # left double quotation mark
                '\u201d': '"',   # right double quotation mark
                '\u2026': '...',  # ellipsis
                '\u00a0': ' ',   # non-breaking space
            }
            
            for old, new in replacements.items():
                text = text.replace(old, new)
            
            # Keep only safe characters: printable ASCII + common accented characters
            text = ''.join(c for c in text if (
                c.isprintable() and ord(c) < 127  # ASCII printable
            ) or c in 'àáâãäåæçèéêëìíîïñòóôõöøùúûüý'  # Common accents
              or c in 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝ'  # Uppercase accents
              or c in '\n\r\t '  # Whitespace
            )
            
            # Normalize whitespace
            text = re.sub(r'\s+', ' ', text)
            text = text.strip()
            
            return text
        
        # Apply sanitization
        text = sanitize_for_json(text)
        
        # Create final result with additional metadata
        final_result = {
            "text": text,
            "language": result.get("language", "unknown"),
            "timestamp": datetime.now().isoformat(),
            "model": model_name,
            "duration": duration
        }
        
        # Save to ./transcriptions/ directory
        try:
            transcriptions_dir = os.path.join(os.getcwd(), "transcriptions")
            os.makedirs(transcriptions_dir, exist_ok=True)
            
            # Generate filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            video_basename = os.path.splitext(os.path.basename(video_path))[0]
            json_filename = f"{video_basename}_{timestamp}.json"
            json_filepath = os.path.join(transcriptions_dir, json_filename)
            
            # Save JSON file with consistent encoding
            with open(json_filepath, 'w', encoding='utf-8') as f:
                json.dump(final_result, f, ensure_ascii=False, indent=2)
            
            # Add file path to result
            final_result["saved_file"] = json_filepath
            
            print(json.dumps({"progress": 95, "status": f"Saved transcription to {json_filename}"}), flush=True)
            
        except Exception as e:
            logger.error(f"Error saving transcription file: {str(e)}")
            print(json.dumps({"progress": 0, "status": f"Error saving file: {str(e)}"}, ensure_ascii=True), flush=True)
        
        # Send result with base64 encoding to avoid JSON parsing issues
        try:
            # Create JSON with original text (no extra escaping needed)
            json_str = json.dumps(final_result, ensure_ascii=False)
            
            # Encode to base64 for safe transmission
            json_bytes = json_str.encode('utf-8')
            json_base64 = base64.b64encode(json_bytes).decode('ascii')
            
            # Debug: Add unique identifier to ensure single send
            logger.info(f"Sending transcription result (length: {len(text)} chars)")
            logger.info(f"Base64 JSON length: {len(json_base64)} chars")
            
            # Send result with base64 encoding and unique delimiter
            delimiter = "===TRANSCRIPTION_RESULT_B64==="
            print(f"{delimiter}{json_base64}{delimiter}", flush=True)
            
        except Exception as e:
            logger.error(f"Error formatting result: {str(e)}")
            print(json.dumps({"progress": 0, "status": f"Error formatting result: {str(e)}"}, ensure_ascii=True), flush=True)
            
        return final_result
        
    except Exception as e:
        logger.error(f"Error during transcription: {str(e)}")
        print(json.dumps({"progress": 0, "status": f"Error: {str(e)}"}), flush=True)
        raise

def main():
    parser = argparse.ArgumentParser(description='Transcribe video using Whisper')
    parser.add_argument('video_path', help='Path to video file')
    parser.add_argument('--model', default='base', help='Whisper model to use')
    parser.add_argument('--language', default=None, help='Language code (optional)')
    parser.add_argument('--format', default='txt', help='Output format')
    
    args = parser.parse_args()
    
    try:
        # Just call the transcription function - it handles all output
        transcribe_video(args.video_path, args.model, args.language)
        
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        exit(1)

if __name__ == "__main__":
    main()

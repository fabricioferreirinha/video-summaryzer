import streamlit as st
import whisper
import os
import tempfile
import logging
from pathlib import Path
import time
import threading
from datetime import datetime
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Supported video formats
SUPPORTED_FORMATS = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v']

# Whisper model options
WHISPER_MODELS = {
    'tiny': 'tiny',
    'base': 'base', 
    'small': 'small',
    'medium': 'medium',
    'large': 'large'
}

# Language options with Portuguese-Brazil as default
LANGUAGES = {
    'Portuguese (Brazil)': 'pt',
    'English': 'en',
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Italian': 'it',
    'Japanese': 'ja',
    'Korean': 'ko',
    'Chinese': 'zh',
    'Russian': 'ru',
    'Auto-detect': None
}

# Output formats
OUTPUT_FORMATS = {
    'Plain Text (.txt)': 'txt',
    'SubRip (.srt)': 'srt',
    'WebVTT (.vtt)': 'vtt',
    'JSON (.json)': 'json'
}

class TranscriptionLogger:
    def __init__(self):
        self.logs = []
        self.progress = 0
        self.status = "Ready"
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {level}: {message}"
        self.logs.append(log_entry)
        logger.info(message)
        
    def update_progress(self, progress, status="Processing"):
        self.progress = progress
        self.status = status
        
    def get_logs(self):
        return self.logs
        
    def clear_logs(self):
        self.logs = []
        self.progress = 0
        self.status = "Ready"

def get_video_files(folder_path):
    """Get all video files from the selected folder"""
    if not folder_path or not os.path.exists(folder_path):
        return []
    
    video_files = []
    for file in os.listdir(folder_path):
        if any(file.lower().endswith(ext) for ext in SUPPORTED_FORMATS):
            video_files.append(file)
    
    return sorted(video_files)

def format_time(seconds):
    """Format seconds to HH:MM:SS,mmm format for SRT"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def format_time_vtt(seconds):
    """Format seconds to HH:MM:SS.mmm format for VTT"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

def save_transcription(result, output_path, format_type):
    """Save transcription in the specified format"""
    
    if format_type == 'txt':
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result['text'])
    
    elif format_type == 'srt':
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, segment in enumerate(result['segments'], 1):
                start_time = format_time(segment['start'])
                end_time = format_time(segment['end'])
                text = segment['text'].strip()
                f.write(f"{i}\n{start_time} --> {end_time}\n{text}\n\n")
    
    elif format_type == 'vtt':
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("WEBVTT\n\n")
            for segment in result['segments']:
                start_time = format_time_vtt(segment['start'])
                end_time = format_time_vtt(segment['end'])
                text = segment['text'].strip()
                f.write(f"{start_time} --> {end_time}\n{text}\n\n")
    
    elif format_type == 'json':
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

def transcribe_video(video_path, model_name, language, output_format, output_folder, transcription_logger):
    """Transcribe video using local Whisper model"""
    try:
        transcription_logger.log(f"Starting transcription of: {os.path.basename(video_path)}")
        transcription_logger.update_progress(10, "Loading Whisper model...")
        
        # Load Whisper model locally
        model = whisper.load_model(model_name)
        transcription_logger.log(f"Loaded Whisper model: {model_name}")
        transcription_logger.update_progress(20, "Model loaded, processing audio...")
        
        # Transcribe
        transcribe_options = {}
        if language:
            transcribe_options['language'] = language
            
        result = model.transcribe(video_path, **transcribe_options)
        
        transcription_logger.update_progress(80, "Transcription complete, saving file...")
        transcription_logger.log(f"Transcription completed. Detected language: {result.get('language', 'unknown')}")
        
        # Save transcription
        video_name = Path(video_path).stem
        output_extension = output_format
        output_filename = f"{video_name}_transcription.{output_extension}"
        output_path = os.path.join(output_folder, output_filename)
        
        save_transcription(result, output_path, output_format)
        
        transcription_logger.update_progress(100, "Completed!")
        transcription_logger.log(f"Transcription saved to: {output_path}")
        
        return output_path, result
        
    except Exception as e:
        transcription_logger.log(f"Error during transcription: {str(e)}", "ERROR")
        transcription_logger.update_progress(0, "Error occurred")
        return None, None

def main():
    st.set_page_config(
        page_title="AI Video Transcriber with Whisper",
        page_icon="🎬",
        layout="wide"
    )
    
    st.title("🎬 AI Video Transcriber with Whisper")
    st.markdown("Transcribe videos using OpenAI's Whisper model with real-time progress tracking")
    
    # Initialize session state
    if 'transcription_logger' not in st.session_state:
        st.session_state.transcription_logger = TranscriptionLogger()
    
    # Create columns for layout
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.header("Configuration")
        
        # Folder selection
        folder_path = st.text_input(
            "📁 Select Video Folder",
            value="",
            help="Enter the full path to the folder containing your videos"
        )
        
        if folder_path:
            if os.path.exists(folder_path):
                video_files = get_video_files(folder_path)
                if video_files:
                    st.success(f"Found {len(video_files)} video file(s)")
                    selected_video = st.selectbox(
                        "Select Video File",
                        video_files,
                        help="Choose a video file to transcribe"
                    )
                else:
                    st.warning("No video files found in the selected folder")
                    selected_video = None
            else:
                st.error("Folder path does not exist")
                selected_video = None
        else:
            selected_video = None
        
        # Model selection
        model_name = st.selectbox(
            "🤖 Whisper Model",
            options=list(WHISPER_MODELS.keys()),
            index=1,  # Default to 'base'
            help="Larger models are more accurate but slower"
        )
        
        # Language selection
        language_name = st.selectbox(
            "🌍 Language",
            options=list(LANGUAGES.keys()),
            index=0,  # Default to Portuguese (Brazil)
            help="Select the language of the video audio"
        )
        
        # Output format selection
        output_format_name = st.selectbox(
            "📄 Output Format",
            options=list(OUTPUT_FORMATS.keys()),
            index=0,  # Default to Plain Text
            help="Choose the output format for the transcription"
        )
        
        # Output folder
        output_folder = st.text_input(
            "📂 Output Folder",
            value=folder_path if folder_path else "",
            help="Folder where transcription will be saved"
        )
    
    with col2:
        st.header("Progress & Logs")
        
        # Progress bar
        progress_placeholder = st.empty()
        status_placeholder = st.empty()
        
        # Log display
        log_container = st.container()
        
        with log_container:
            if st.button("Clear Logs"):
                st.session_state.transcription_logger.clear_logs()
                st.rerun()
            
            logs = st.session_state.transcription_logger.get_logs()
            if logs:
                log_text = "\n".join(logs[-20:])  # Show last 20 logs
                st.text_area("Transcription Logs", log_text, height=300, disabled=True)
    
    # Update progress display
    progress_placeholder.progress(
        st.session_state.transcription_logger.progress / 100,
        text=f"Progress: {st.session_state.transcription_logger.progress}%"
    )
    status_placeholder.info(f"Status: {st.session_state.transcription_logger.status}")
    
    # Transcription button
    st.markdown("---")
    
    if st.button("🎯 Start Transcription", type="primary", use_container_width=True):
        if not selected_video:
            st.error("Please select a video file")
        elif not output_folder or not os.path.exists(output_folder):
            st.error("Please specify a valid output folder")
        else:
            # Get selected options
            model = WHISPER_MODELS[model_name]
            language = LANGUAGES[language_name]
            output_format = OUTPUT_FORMATS[output_format_name]
            
            video_path = os.path.join(folder_path, selected_video)
            
            # Start transcription
            st.session_state.transcription_logger.clear_logs()
            
            with st.spinner("Transcribing video..."):
                output_path, result = transcribe_video(
                    video_path,
                    model,
                    language,
                    output_format,
                    output_folder,
                    st.session_state.transcription_logger
                )
            
            if output_path:
                st.success(f"✅ Transcription completed successfully!")
                st.info(f"📁 Output saved to: {output_path}")
                
                # Show download button
                if os.path.exists(output_path):
                    with open(output_path, 'r', encoding='utf-8') as f:
                        file_content = f.read()
                    
                    st.download_button(
                        label="📥 Download Transcription",
                        data=file_content,
                        file_name=os.path.basename(output_path),
                        mime="text/plain"
                    )
            else:
                st.error("❌ Transcription failed. Check the logs for details.")
            
            st.rerun()

if __name__ == "__main__":
    main()
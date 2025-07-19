# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Video Transcriber is a dual-architecture video transcription application using OpenAI's Whisper AI model. It provides both a modern Next.js web interface and a Python Streamlit desktop interface for transcribing videos with real-time progress tracking and automatic file saving to the `./transcriptions/` folder.

## Development Commands

### Next.js Web Application
```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Python Streamlit Application
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run Streamlit interface
streamlit run video_transcriber.py

# Run CLI transcription directly
python whisper_cli.py <video_file> --model base --language pt --format json

# Test GPU availability
python test_gpu.py
```

### Windows Installation
```bash
install.bat          # Automated Windows setup (installs Node.js deps and Python requirements)
```

## Architecture

### Dual Interface Design
The project implements two complete interfaces:

1. **Next.js Web App** (Primary): Modern React-based web interface with real-time progress streaming
2. **Python Streamlit App** (Secondary): Desktop-style GUI for local folder processing

### Key Components

**Next.js Frontend:**
- `src/app/page.tsx` - Main application with drag & drop upload, configuration panels, and results display
- `src/app/api/transcribe/route.ts` - API endpoint that spawns Python subprocess and streams progress via SSE
- `src/components/VideoUpload.tsx` - Drag & drop video upload component
- `src/components/ConfigurationPanel.tsx` - Model, language, and format selection
- `src/components/ProgressTracker.tsx` - Real-time progress display with detailed logs

**Python Backend:**
- `whisper_cli.py` - CLI interface called by Next.js API, outputs JSON progress updates and saves files to `./transcriptions/`
- `video_transcriber.py` - Standalone Streamlit GUI application
- Integration uses Node.js `child_process.spawn()` for real-time communication
- Base64 encoding for safe JSON transmission (prevents character encoding issues)

**Shared Features:**
- Multiple Whisper models (tiny, base, small, medium, large)
- Multi-language support (Portuguese-Brazil default, 10+ languages)
- Multiple output formats (TXT, SRT, VTT, JSON)
- GPU acceleration when available
- Automatic file saving to `./transcriptions/` folder with metadata
- UTF-8 support for all languages with proper character sanitization

### Data Flow

1. **Web Interface**: User uploads video → Next.js API → Python subprocess → Real-time progress via SSE → Auto-save to `./transcriptions/` → Download result
2. **Streamlit Interface**: User selects folder/video → Direct Whisper processing → Save to chosen output folder

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Python with Streamlit, OpenAI Whisper, PyTorch
- **Integration**: Node.js child process spawning, Server-Sent Events for progress streaming

### File Processing

- Temporary files stored in OS temp directory during processing
- Multiple output formats generated from single transcription
- Automatic cleanup of temporary files after processing
- Support for common video formats (MP4, AVI, MKV, MOV, etc.)
- **Automatic Saving**: All transcriptions saved to `./transcriptions/` folder
- **Filename Format**: `{video_name}_{timestamp}.json`
- **Metadata**: Includes model, language, duration, timestamp in saved files
- **Character Handling**: Base64 encoding for safe JSON transmission, UTF-8 files

### Configuration

- TypeScript with path aliases (`@/` maps to `src/`)
- Tailwind configured with shadcn/ui theme system
- Next.js webpack fallbacks for Node.js modules
- **Local Whisper**: No API keys required - uses local installation
- **Transcription Storage**: `./transcriptions/` folder (added to .gitignore)
- **Base64 Transmission**: Prevents JSON parsing errors with special characters

## Important Notes

### Running the Application

- **Development**: Use `npm run dev` for the web interface, or `streamlit run video_transcriber.py` for the desktop interface
- **Production**: Both interfaces can run independently; the web app can be deployed to any Node.js platform

### Python Dependencies

- Requires Python 3.8+ with PyTorch and OpenAI Whisper
- GPU acceleration (CUDA) is optional but recommended for faster processing
- Local Whisper models are downloaded automatically on first use

### File System Integration

- Next.js API handles temporary file storage and cleanup
- **Automatic Saving**: All transcriptions saved to `./transcriptions/` with metadata
- Streamlit app allows direct folder selection and file output path control
- Both interfaces support the same video formats and output options
- **Base64 Encoding**: Solves JSON transmission issues with special characters
- **UTF-8 Support**: Full Unicode support for all languages
# AI Video Transcriber

A dual-architecture video transcription application using OpenAI's Whisper AI model. Features both a modern Next.js web interface and a Python Streamlit desktop interface for transcribing videos with real-time progress tracking and automatic file saving.

## ✨ Features

- 🎬 **Drag & Drop Video Upload**: Easy video file selection with support for all major formats
- 🤖 **Multiple Whisper Models**: Choose from tiny, base, small, medium, or large models (local Whisper, no API key required)
- 🌍 **Multi-language Support**: Portuguese-Brazil (default), English, Spanish, French, German, Italian, Japanese, Korean, Chinese, Russian, and auto-detect
- 📄 **Multiple Output Formats**: Plain Text (.txt), SubRip (.srt), WebVTT (.vtt), JSON (.json)
- 📊 **Real-time Progress Tracking**: Beautiful progress bars with estimated time remaining
- 📝 **Live Process Logs**: Track transcription progress with detailed timestamped logs
- 💾 **Automatic File Saving**: Transcriptions automatically saved to `./transcriptions/` folder with metadata
- 📥 **Instant Download**: Download transcribed files directly from the browser
- 🏠 **Dual Interface**: Choose between web interface (Next.js) or desktop GUI (Streamlit)
- 🎨 **Modern UI**: Beautiful, responsive design with shadcn/ui components
- ⚡ **Lightning Fast**: Built with Next.js for optimal performance
- 🔧 **Local Processing**: No API keys required - uses local Whisper installation

## 🚀 Installation

### Quick Setup (Windows)
```bash
# Automated setup for Windows
install.bat
```

### Manual Setup
1. **Install Node.js dependencies**:
```bash
npm install
```

2. **Install Python dependencies**:
```bash
pip install -r requirements.txt
```

3. **Run the web interface**:
```bash
npm run dev
```

4. **OR run the desktop interface**:
```bash
streamlit run video_transcriber.py
```

5. **Open** [http://localhost:3000](http://localhost:3000) (web) or [http://localhost:8501](http://localhost:8501) (desktop)

## 🎯 Usage

### Web Interface (Next.js)
1. **Upload Video**: Drag and drop or click to select a video file
2. **Configure Settings**: 
   - Choose Whisper model (larger = more accurate but slower)
   - Select audio language (default: Portuguese-Brazil)
   - Pick output format (txt, srt, vtt, json)
3. **Start Transcription**: Click the "Start Transcription" button
4. **Monitor Progress**: Watch real-time progress with detailed logs
5. **Download Result**: Download your transcription when complete
6. **Auto-Save**: Transcriptions automatically saved to `./transcriptions/` folder

### Desktop Interface (Streamlit)
1. **Select Video**: Choose video file or folder for batch processing
2. **Configure Settings**: Set model, language, and output format
3. **Choose Output Folder**: Select where to save transcribed files
4. **Start Processing**: Process single videos or entire folders
5. **Monitor Progress**: Real-time progress with detailed status updates

## 📹 Supported Video Formats

- MP4 (.mp4)
- AVI (.avi)
- MKV (.mkv)
- MOV (.mov)
- WMV (.wmv)
- FLV (.flv)
- WebM (.webm)
- M4V (.m4v)

## 🧠 Whisper Models

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| **tiny** | 39 MB | ⚡ Fastest | 🟡 Basic | Quick drafts |
| **base** | 74 MB | ⚡ Fast | 🟢 Good | General use |
| **small** | 244 MB | ⚖️ Balanced | 🟢 Good | Balanced |
| **medium** | 769 MB | 🐌 Slow | 🔵 Great | High accuracy |
| **large** | 1550 MB | 🐌 Slowest | 🔵 Best | Professional |

## 📄 Output Formats

- **Plain Text (.txt)**: Simple, clean text transcription
- **SubRip (.srt)**: Standard subtitle format with timestamps
- **WebVTT (.vtt)**: Web video text tracks format
- **JSON (.json)**: Complete transcription data with metadata

## 💾 Automatic File Saving

All transcriptions are automatically saved to the `./transcriptions/` folder with:
- **Timestamp**: Each file includes creation timestamp
- **Metadata**: Model used, language detected, duration, etc.
- **Filename Format**: `{video_name}_{timestamp}.json`
- **UTF-8 Encoding**: Full Unicode support for all languages

## 🛠️ Tech Stack

### Frontend (Web Interface)
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui with Radix UI primitives
- **Icons**: Lucide React
- **Language**: TypeScript
- **Deployment**: Vercel-ready

### Backend (Python)
- **AI**: OpenAI Whisper (local installation)
- **Desktop GUI**: Streamlit
- **Language**: Python 3.8+
- **Processing**: PyTorch (CPU/GPU support)
- **Integration**: Base64 encoding for safe JSON transmission

### Architecture
- **Dual Interface**: Next.js web app + Streamlit desktop app
- **Real-time Communication**: Server-Sent Events (SSE) for progress streaming
- **Process Management**: Node.js child processes for Python integration
- **File Handling**: Automatic cleanup and organized storage

## 🔧 Configuration

### Requirements
- **Node.js**: 18.0 or higher
- **Python**: 3.8 or higher
- **Disk Space**: At least 2GB for Whisper models
- **RAM**: 4GB minimum, 8GB recommended for larger models

### Environment Variables (Optional)
```env
# Optional - for custom configurations
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note**: No API keys required! Uses local Whisper installation.

### Development Commands

```bash
# Web Interface (Next.js)
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Desktop Interface (Streamlit)
streamlit run video_transcriber.py

# CLI Usage (Direct Python)
python whisper_cli.py <video_file> --model base --language pt --format json

# Test GPU availability
python test_gpu.py
```

## 🚦 API Routes

- `POST /api/transcribe` - Transcribe video file with Whisper

## 📦 Dependencies

### Node.js Dependencies
- Next.js 14+
- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- shadcn/ui components
- Lucide React icons

### Python Dependencies
- OpenAI Whisper
- Streamlit
- PyTorch
- NumPy
- Librosa (audio processing)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenAI for the Whisper AI model
- shadcn for the beautiful UI components
- Vercel for the deployment platform
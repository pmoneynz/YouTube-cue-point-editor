# 🎵 YouTube Cue Point Editor

A modern, browser-based tool for creating precise audio cue points from YouTube videos. Download, visualize, and edit audio with sample-accurate playback and synchronized video display.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)

## ✨ Features

### 🎯 Core Functionality
- **YouTube Video Download**: High-quality video and audio extraction using `yt-dlp`
- **Sample-Accurate Audio**: Web Audio API-based playback with precise timing
- **Interactive Waveform**: Visual audio representation with Wavesurfer.js
- **Synchronized Video**: Muted video display that follows audio playback
- **Cue Point Management**: Create, edit, and trigger cue points with keyboard shortcuts
- **Real-time Sync**: Audio-first architecture with < 50ms video sync tolerance

### 🛠️ Technical Features
- **Dual File Processing**: Separate H.264 video (no audio) and PCM WAV audio files
- **RESTful API**: Clean backend API for video processing and file management
- **Modern Frontend**: React + Vite with Tailwind CSS styling
- **Cross-Platform**: Works on macOS, Linux, and Windows
- **No Re-encoding**: Stream copying for fast processing

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Processing    │
│   (React)       │    │   (Node.js)     │    │   (yt-dlp +     │
│                 │    │                 │    │    ffmpeg)      │
│ • Wavesurfer.js │◄──►│ • Express API   │◄──►│                 │
│ • Web Audio API │    │ • File serving  │    │ • Download      │
│ • Video sync    │    │ • CORS enabled  │    │ • Audio extract │
│ • Cue points    │    │ • Static files  │    │ • Video process │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Audio-First Sync Strategy
- **Audio Master**: Web Audio API controls playback timing
- **Video Follower**: HTML5 video syncs to audio context
- **Cue Points**: Sample-accurate seeking using `AudioBufferSourceNode`
- **Monitoring**: Continuous sync loop maintains < 50ms drift

## 🚀 Quick Start

### Prerequisites

**System Dependencies:**
```bash
# Install yt-dlp
pip install yt-dlp

# Install ffmpeg
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows - Download from https://ffmpeg.org/download.html
```

**Node.js:**
- Node.js >= 16.0.0
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/youtube-cue-point-editor.git
   cd youtube-cue-point-editor
   ```

2. **Install backend dependencies:**
   ```bash
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Start the development servers:**

   **Backend (Terminal 1):**
   ```bash
   npm run dev
   # Server runs on http://localhost:3001
   ```

   **Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm run dev
   # Frontend runs on http://localhost:5173
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5173`

## 📖 Usage

### Basic Workflow

1. **Enter YouTube URL**: Paste any YouTube video URL into the input field
2. **Download & Process**: Click download to extract video and audio files
3. **Load in Editor**: Files automatically load into the waveform editor
4. **Set Cue Points**: Click on the waveform or use keyboard shortcuts
5. **Name & Trigger**: Label cue points and trigger them with hotkeys
6. **Sync Playback**: Watch video sync perfectly with audio playback

### Keyboard Shortcuts

- **Space**: Play/Pause
- **Left/Right Arrow**: Seek backward/forward
- **Number Keys (1-9)**: Trigger cue points
- **Shift + Number**: Set cue point at current position
- **Enter**: Set cue point with custom name

## 📚 API Documentation

### Download Endpoint
```bash
POST /api/download
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "status": "success",
  "videoFile": "video-title-1234567890-video.mp4",
  "audioFile": "video-title-1234567890-audio.wav",
  "duration": 242.57,
  "filename": "video-title-1234567890",
  "title": "Original Video Title"
}
```

### List Downloads
```bash
GET /api/downloads
```

### Static File Access
```bash
GET /downloads/{filename}
```

## 🗂️ Project Structure

```
youtube-cue-point-editor/
├── 📁 frontend/                    # React frontend application
│   ├── 📁 src/
│   │   ├── 📁 components/          # React components
│   │   │   ├── CuePointEditor.jsx  # Main cue point interface
│   │   │   ├── VideoPlayer.jsx     # Synchronized video player
│   │   │   ├── WaveformPlayer.jsx  # Wavesurfer.js integration
│   │   │   └── UnifiedVideoEditor.jsx # Combined editor
│   │   ├── 📁 hooks/               # Custom React hooks
│   │   │   ├── useCueKeyboardMap.js # Keyboard shortcut handling
│   │   │   └── useVideoSync.js      # Audio-video synchronization
│   │   ├── App.jsx                 # Main app component
│   │   └── main.jsx               # Entry point
│   ├── package.json               # Frontend dependencies
│   └── vite.config.js            # Vite configuration
├── 📁 downloads/                  # Generated media files (gitignored)
├── server.js                     # Express server setup
├── downloadController.js         # YouTube download logic
├── package.json                  # Backend dependencies
├── README.md                     # This file
├── YouTube_Cue_Point_Editor_PRD.md # Product requirements
└── .gitignore                    # Git ignore patterns
```

## 🔧 Configuration

### Environment Variables

**Backend:**
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)

**Frontend:**
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001)

### File Naming Convention

Downloaded files follow this pattern:
- Video: `{slug-title}-{timestamp}-video.mp4`
- Audio: `{slug-title}-{timestamp}-audio.wav`

Where `{slug-title}` is a URL-safe version of the YouTube video title.

## 🧪 Testing

### Manual Testing

**Test the backend:**
```bash
# Health check
curl http://localhost:3001/health

# Download a video
curl -X POST http://localhost:3001/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# List downloads
curl http://localhost:3001/api/downloads
```

**Test the frontend:**
1. Open `http://localhost:5173`
2. Enter a YouTube URL
3. Click "Download Video"
4. Verify waveform loads and video syncs

### Frontend Tests

```bash
cd frontend
npm run test
```

## 🐛 Troubleshooting

### Common Issues

**"yt-dlp not found"**
```bash
pip install yt-dlp
# Verify: yt-dlp --version
```

**"ffmpeg not found"**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Verify: ffmpeg -version
```

**CORS errors**
- Ensure backend is running on port 3001
- Check frontend is configured to use correct API URL

**Video not syncing**
- Verify both video and audio files loaded successfully
- Check browser console for Web Audio API errors
- Ensure files are properly decoded

### Debug Mode

**Backend debugging:**
```bash
DEBUG=* npm run dev
```

**Frontend debugging:**
- Open browser developer tools
- Check Network tab for API calls
- Monitor Console for errors

## 📈 Performance Optimization

- **Stream Copying**: No video re-encoding for faster processing
- **Web Workers**: Audio processing in background threads
- **Efficient Sync**: Optimized sync loop with minimal CPU usage
- **Caching**: Downloaded files cached locally
- **Memory Management**: Proper cleanup of audio buffers

## 🔐 Security

- **Input Validation**: YouTube URLs validated before processing
- **Path Sanitization**: File paths constrained to downloads directory
- **CORS Configuration**: Properly configured for frontend integration
- **No Code Execution**: User input never executed as code

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** - YouTube video downloading
- **[FFmpeg](https://ffmpeg.org/)** - Audio/video processing
- **[Wavesurfer.js](https://wavesurfer.xyz/)** - Waveform visualization
- **[React](https://reactjs.org/)** - Frontend framework
- **[Vite](https://vitejs.dev/)** - Build tool and dev server

---

## 🎵 Made for Audio Professionals

Built with precision timing and professional audio workflows in mind. Perfect for DJs, producers, and audio engineers who need sample-accurate cue points. 
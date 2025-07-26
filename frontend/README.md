# YouTube Cue Point Editor - Frontend

React frontend for the YouTube Cue Point Editor, featuring an interactive waveform display with precise cue point functionality.

## 🚀 Features

- ✅ **Interactive Waveform Display** using Wavesurfer.js
- ✅ **Cue Point Markers** with visual labels and keyboard shortcuts
- ✅ **Click-to-Seek** functionality on waveform
- ✅ **Real-time Playback Sync** with visual cursor
- ✅ **YouTube Video Download** integration with backend
- ✅ **Responsive Design** with Tailwind CSS
- ✅ **Sample-Accurate Timing** for audio editing

## 📋 Prerequisites

- Node.js 16+ 
- Backend server running on port 3001
- Modern web browser with Web Audio API support

## 🏃‍♂️ Quick Start

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:3000
   ```

## 🧱 Component Architecture

### WaveformPlayer.jsx

Main component that handles:
- Audio waveform rendering
- Cue point visualization and interaction
- Playback controls and timeline
- Real-time sync with audio context

**Props:**
```javascript
{
  audioUrl: string,        // URL to local .wav file
  cuePoints: CuePoint[],   // Array of cue point objects
  onCueClick: (cue) => void, // Callback when marker is clicked
  activeCue: CuePoint,     // Currently active cue point
  height: number,          // Waveform height (default: 128px)
  autoPlay: boolean        // Auto play on load (default: false)
}
```

**CuePoint Format:**
```javascript
{
  time: 12.45,    // Time in seconds
  label: "Drop",  // Display label
  key: "1"        // Optional keyboard binding
}
```

## 🎯 Usage Examples

### Basic Usage
```jsx
import WaveformPlayer from './components/WaveformPlayer';

const cuePoints = [
  { time: 5.0, label: "Intro", key: "1" },
  { time: 15.5, label: "Verse", key: "2" },
  { time: 45.2, label: "Chorus", key: "3" }
];

<WaveformPlayer
  audioUrl="/downloads/audio-file.wav"
  cuePoints={cuePoints}
  onCueClick={(cue) => console.log('Clicked:', cue)}
  height={128}
/>
```

### With Backend Integration
```jsx
// Download YouTube video
const downloadVideo = async (url) => {
  const response = await fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  
  const data = await response.json();
  if (data.status === 'success') {
    setAudioUrl(`/downloads/${data.audioFile}`);
  }
};
```

## 🧪 Testing Checklist

- [ ] **Waveform Renders** - Load audio file and verify waveform displays
- [ ] **Cue Points Visible** - Add 3+ cue points, confirm markers appear
- [ ] **Click to Seek** - Click waveform, verify seeking works
- [ ] **Marker Click** - Click cue marker, verify `onCueClick` fires
- [ ] **Active Cue Highlight** - Set `activeCue`, verify visual highlight
- [ ] **Playback Controls** - Test play/pause button functionality
- [ ] **Timeline Display** - Verify time markers and current time
- [ ] **Responsive Design** - Test on different screen sizes

## 🎨 Styling

Uses Tailwind CSS with custom waveform theme:

```css
/* Custom colors in tailwind.config.js */
colors: {
  'waveform-bg': '#1a1a1a',
  'waveform-wave': '#4f46e5', 
  'waveform-progress': '#06b6d4',
  'cue-marker': '#f59e0b',
  'cue-active': '#ef4444'
}
```

## 🔧 Configuration

### Vite Config
- Proxy setup for backend API calls
- React plugin configuration
- Development server on port 3000

### Wavesurfer.js Options
```javascript
{
  waveColor: '#4f46e5',
  progressColor: '#06b6d4', 
  cursorColor: '#ffffff',
  barWidth: 2,
  barRadius: 1,
  responsive: true,
  height: 128,
  normalize: true,
  backend: 'WebAudio',
  interact: true
}
```

## 🚀 Next Steps

This frontend integrates with:
- **Backend API** for YouTube video downloading
- **Audio Context** for sample-accurate playback
- **Video Sync Engine** (to be implemented)
- **Keyboard Shortcuts** for cue point triggering

## 📱 Browser Support

- Chrome 66+
- Firefox 60+
- Safari 14+
- Edge 79+

Requires Web Audio API support for audio processing.

## 🛠️ Development

```bash
# Development with hot reload
npm run dev

# Build for production  
npm run build

# Preview production build
npm run preview

# Linting
npm run lint
``` 
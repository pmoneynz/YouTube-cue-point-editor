
# 🎯 Product Requirements Document (PRD)

## 🧱 Product Name
**YouTube Cue Point Editor**

---

## 📌 Overview
The YouTube Cue Point Editor is a browser-based tool that:
- Downloads and extracts **audio and video** from YouTube videos.
- Loads both into local HTML5 buffers.
- Displays an interactive waveform.
- Lets users set, name, and trigger cue points visually and via keyboard.
- Offers **sample-accurate audio and tightly synced video playback**.

---

## 🖥️ Tech Stack

### Frontend
- **Framework:** React + Vite
- **Waveform Library:** [Wavesurfer.js](https://wavesurfer.xyz/)
- **Audio Playback:** Web Audio API
- **Video Playback:** HTML5 `<video>` element (muted, buffered)
- **Sync Strategy:** Audio as source of truth, video as follower
- **UI Styling:** Tailwind CSS

### Backend
- **Server:** Node.js (Express)
- **Downloader:** `yt-dlp`
- **Audio/Video Processing:** `ffmpeg`
- **Storage:** Local filesystem (`/downloads`)
- **Output Files:**
  - `video.mp4` (H.264, no audio)
  - `audio.wav` (PCM or compressed, separate)

---

## 🔀 Key Architectural Update

### 🎯 Audio as Playback Master
- Uses `AudioContext` to decode `.wav` and play with `AudioBufferSourceNode`
- Cue points seek using `audioSource.start(0, cueTime)`
- Accurate to the sample rate (e.g., 48,000 samples/sec)

### 🎞 Video as Visual Follower
- Uses muted `<video>` tag to display buffered `.mp4` file
- Snaps `video.currentTime = cueTime` on cue trigger
- Monitored in a sync loop to match `audioContext.currentTime` with < 50ms drift

---

## 📦 Functional Modules (Updated)

### 1. **Media Downloader (Backend)**
#### Purpose:
Download YouTube video and extract separate audio + video files.

#### Command Structure:
```bash
yt-dlp -f 'bestvideo[ext=mp4]+bestaudio[ext=m4a]' --merge-output-format mp4 URL
ffmpeg -i input.mp4 -an video.mp4
ffmpeg -i input.mp4 -vn -acodec pcm_s16le audio.wav
```

---

### 2. **Waveform Display**
No changes — uses decoded `.wav` file to show waveform in `Wavesurfer.js`.

---

### 3. **Cue Point Editor**
Cue point format now supports **sample-accurate positioning**:
```json
{
  "label": "Chorus",
  "sample_position": 192000,
  "sample_rate": 48000,
  "key": "2"
}
```

---

### 4. **Cue Trigger Engine**
Triggers audio+video jump on key press:

```js
function jumpToCue(cueTime) {
  // Restart audio buffer
  audioNode.stop();
  audioNode = ctx.createBufferSource();
  audioNode.buffer = audioBuffer;
  audioNode.connect(ctx.destination);
  audioNode.start(0, cueTime);

  // Snap video
  video.currentTime = cueTime;
}
```

---

### 5. **Playback Sync Loop**
Ensures video stays tightly aligned to audio in real-time:
```js
function syncLoop() {
  const drift = Math.abs(video.currentTime - (ctx.currentTime + audioStartOffset));
  if (drift > 0.05) {
    video.currentTime = ctx.currentTime + audioStartOffset;
  }
  requestAnimationFrame(syncLoop);
}
```

---

## 🧪 Development Testing Plan

| Module                  | Independent Test Strategy                           |
|------------------------|------------------------------------------------------|
| Backend Downloader     | Call API with video URL, verify audio.wav/video.mp4 |
| Waveform Loader        | Load test `.wav` file into waveform                  |
| Cue Point Seeker       | Jump to cue using hardcoded buffer + marker         |
| Audio Playback Engine  | Trigger audio-only playback                         |
| Video Sync Engine      | Load local `.mp4`, sync to currentTime loop         |

---

## ✅ UX Summary

- 🔁 Cue points respond **instantly** to keyboard presses.
- 🧠 Audio is **sample-accurate** and drives all sync behavior.
- 🎞 Video always visually matches playback location.
- 🧰 All components can be replaced or extended modularly.

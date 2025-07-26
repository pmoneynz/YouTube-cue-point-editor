import { useState, useCallback, useEffect } from 'react';
import WaveformPlayer from './WaveformPlayer';
import VideoPlayer from './VideoPlayer';
import CuePointGrid from './CuePointGrid';
import useCueKeyboardMap from '../hooks/useCueKeyboardMap';

/**
 * UnifiedVideoEditor - Combined video sync and cue point editing interface
 */
const UnifiedVideoEditor = () => {
  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioContext, setAudioContext] = useState(null);
  const [audioStartTime, setAudioStartTime] = useState(null);
  const [cueOffset, setCueOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCue, setActiveCue] = useState(null);
  const [cuePoints, setCuePoints] = useState([]);
  const [downloadedFiles, setDownloadedFiles] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformPlayerRef, setWaveformPlayerRef] = useState(null);

  // Format time for display
  const formatTime = useCallback((seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Handle cue point triggering from keyboard
  const handleTriggerCue = useCallback((cueTime, cueData) => {
    console.log('Triggered cue:', cueData);
    setActiveCue(cueData);
    
    // Jump to cue time in waveform player
    if (waveformPlayerRef && waveformPlayerRef.jumpToCue) {
      waveformPlayerRef.jumpToCue(cueTime);
    }
  }, [waveformPlayerRef]);

  // Set up keyboard shortcuts for cue points
  useCueKeyboardMap({
    cuePoints,
    onTriggerCue: handleTriggerCue,
    enabled: true,
    debounceMs: 150
  });

  // Handle video load/error
  const handleVideoLoad = useCallback((video) => {
    console.log('✅ Video loaded:', video);
  }, []);

  const handleVideoError = useCallback((error) => {
    console.error('❌ Video error:', error);
  }, []);

  // Handle audio context changes from waveform player
  const handleAudioContextChange = useCallback((context) => {
    setAudioContext(context);
    console.log('Audio context updated:', context);
  }, []);

  // Handle playback state changes from waveform player
  const handlePlaybackStateChange = useCallback((state) => {
    setIsPlaying(state.isPlaying);
    setAudioStartTime(state.audioStartTime);
    setCueOffset(state.cueOffset);
    
    console.log('Playback state changed:', state);
  }, []);

  // Handle cue point click
  const handleCueClick = useCallback((cue) => {
    console.log('Cue clicked:', cue);
    setActiveCue(cue);
  }, []);

  // Handle jumping to cue time
  const handleJumpToCue = useCallback((time) => {
    if (waveformPlayerRef && waveformPlayerRef.jumpToCue) {
      waveformPlayerRef.jumpToCue(time);
    }
  }, [waveformPlayerRef]);

  // Handle time updates from waveform player
  const handleTimeUpdate = useCallback((timeInfo) => {
    setCurrentTime(timeInfo.currentTime);
  }, []);

  // Handle duration change from waveform player
  const handleDurationChange = useCallback((newDuration) => {
    setDuration(newDuration);
    console.log('Audio duration:', newDuration);
  }, []);



  // Handle adding a new cue point from waveform player
  const handleAddCue = useCallback((newCue) => {
    const updatedCues = [...cuePoints, newCue].sort((a, b) => a.time - b.time);
    setCuePoints(updatedCues);
    setActiveCue(newCue); // Automatically select the new cue
    console.log('Added new cue:', newCue);
  }, [cuePoints]);

  // Clear cue points
  const clearCues = useCallback(() => {
    setCuePoints([]);
    setActiveCue(null);
  }, []);

  // Fetch downloaded files
  const fetchDownloads = useCallback(async () => {
    try {
      const response = await fetch('/api/downloads');
      const data = await response.json();
      if (data.status === 'success') {
        const files = Object.entries(data.downloads).map(([filename, files]) => ({
          filename,
          audioFile: files.audio,
          videoFile: files.video
        }));
        setDownloadedFiles(files);
      }
    } catch (error) {
      console.error('Failed to fetch downloads:', error);
    }
  }, []);

  // Load a downloaded file pair
  const loadFilePair = useCallback((file) => {
    console.log('Loading file pair:', file);
    
    setAudioUrl(`/downloads/${file.audioFile}`);
    setVideoUrl(`/downloads/${file.videoFile}`);
    setActiveCue(null);
    setCuePoints([]); // Clear existing cue points when loading new file
    
    console.log('URLs set', {
      audioUrl: `/downloads/${file.audioFile}`,
      videoUrl: `/downloads/${file.videoFile}`
    });
  }, []);

  // Download YouTube video
  const downloadYouTubeVideo = useCallback(async () => {
    if (!youtubeUrl.trim()) return;

    setIsDownloading(true);
    setDownloadStatus('Starting download...');

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setDownloadStatus(`Downloaded: ${data.title}`);
        setAudioUrl(`/downloads/${data.audioFile}`);
        setVideoUrl(`/downloads/${data.videoFile}`);
        await fetchDownloads();
        setCuePoints([]); // Clear cue points for new content
      } else {
        setDownloadStatus(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus(`Error: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  }, [youtubeUrl, fetchDownloads]);

  // Initialize
  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-white-400 text-left mb-2">
              Cue Points for YouTube
            </h1>
            <span className="text-2xl text-gray-400 ml-4 mb-2">pmoneymusic.com</span>
          </div>
        </header>

        {/* 1. YouTube Download Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-4">
          <div className="flex space-x-4">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Paste URL..."
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
              disabled={isDownloading}
            />
            <button
              onClick={downloadYouTubeVideo}
              disabled={isDownloading || !youtubeUrl.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition-colors"
            >
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
          </div>
          {downloadStatus && (
            <div className="mt-2 text-sm text-gray-300">
              {downloadStatus}
            </div>
          )}

          {/* Waveform Section - Full Width at Top */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-sm h-5">
                {!isPlaying && audioUrl && (
                  <>
                    <svg className="w-4 h-4 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-400">Click play button to start synchronized playback</span>
                  </>
                )}
                {isPlaying && audioUrl && (
                  <>
                    <svg className="w-4 h-4 mr-1 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-400">Playing synchronized audio and video</span>
                  </>
                )}
              </div>
            </div>
            
            {audioUrl ? (
              <>
                <WaveformPlayer
                  audioUrl={audioUrl}
                  cuePoints={cuePoints}
                  onCueClick={handleCueClick}
                  activeCue={activeCue}
                  height={128}
                  autoPlay={false}
                  onAudioContextChange={handleAudioContextChange}
                  onPlaybackStateChange={handlePlaybackStateChange}
                  onTimeUpdate={handleTimeUpdate}
                  onRef={setWaveformPlayerRef}
                  onDurationChange={handleDurationChange}
                />
                
                {/* Play Controls */}
                <div className="flex items-center justify-start mt-2">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => waveformPlayerRef?.togglePlayback?.()}
                      disabled={!waveformPlayerRef?.isReady?.()}
                      className="flex items-center justify-center hover:bg-gray-800 disabled:opacity-50 rounded transition-colors p-2"
                    >
                      {isPlaying ? (
                        <svg className="w-10 h-10 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" />
                        </svg>
                      ) : (
                        <svg className="w-10 h-10 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                        </svg>
                      )}
                    </button>
                    
                    <div className="text-white text-sm font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-gray-700 rounded p-8 text-center text-gray-400">
                <p>No audio file loaded</p>
                <p className="text-sm mt-2">Download a YouTube video above or select from downloaded files</p>
              </div>
            )}
          </div>

          {/* Cue Points and Video Section - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Side - Cue Points Grid */}
            <div>
              <CuePointGrid
                cuePoints={cuePoints}
                onCueClick={handleCueClick}
                onJumpToCue={handleJumpToCue}
                activeCue={activeCue}
                currentTime={currentTime}
                onAddCue={handleAddCue}
                onClearAll={clearCues}
                maxCueSlots={16}
              />
            </div>

            {/* Right Side - Video Player */}
            <div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white text-lg font-semibold">Video Player</h3>
                  <div className="flex items-center text-sm">
                    <div className={`w-2 h-2 rounded-full mr-2 ${isPlaying ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    {isPlaying ? 'Synced & Playing' : 'Ready to Sync'}
                  </div>
                </div>
                {videoUrl ? (
                  <VideoPlayer
                    videoUrl={videoUrl}
                    audioStartTime={audioStartTime}
                    cueOffset={cueOffset}
                    audioContext={audioContext}
                    isPlaying={isPlaying}
                    showSyncStatus={false}
                    onVideoLoad={handleVideoLoad}
                    onVideoError={handleVideoError}
                  />
                ) : (
                  <div className="bg-gray-700 rounded p-8 text-center text-gray-400 aspect-[16/9] flex flex-col items-center justify-center">
                    <p>No video loaded</p>
                    <p className="text-sm mt-2">Download a YouTube video above or select from downloaded files</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>





        

        {/* Download History Section */}
        {downloadedFiles.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <h2 className="text-xl font-semibold mb-4">Download History</h2>
            <div className="space-y-2">
              {downloadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => loadFilePair(file)}
                >
                  <span className="text-sm font-mono">{file.filename}</span>
                  <div className="flex space-x-2 text-xs text-gray-400">
                    <span>Audio + Video</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm">
          <p>YouTube Video Cue Point Editor - Built with React, Vite, and Wavesurfer.js</p>
          <p className="mt-1">⚡ Frame-accurate video synchronization with Web Audio API</p>
        </footer>
      </div>
    </div>
  );
};

export default UnifiedVideoEditor; 
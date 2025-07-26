import { useState, useCallback, useRef, useEffect } from 'react';
import WaveformPlayer from './WaveformPlayer';
import VideoPlayer from './VideoPlayer';

/**
 * Demo component to test video synchronization with rapid cue jumping
 */
const SyncDemo = () => {
  // 🐛 DEBUG: Track render count for SyncDemo
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  // 🔧 FIX: Only log every 10th render to reduce noise
  if (renderCountRef.current % 10 === 0) {
    console.log(`🔄 SyncDemo RENDER #${renderCountRef.current}`, {
      timestamp: Date.now()
    });
  }

  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioContext, setAudioContext] = useState(null);
  const [audioStartTime, setAudioStartTime] = useState(null);
  const [cueOffset, setCueOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCue, setActiveCue] = useState(null);
  const [showSyncStatus, setShowSyncStatus] = useState(true);
  const [syncStats, setSyncStats] = useState({
    corrections: 0,
    maxDrift: 0,
    avgDrift: 0
  });
  const [downloadedFiles, setDownloadedFiles] = useState([]);

  const syncStatsRef = useRef({ corrections: 0, maxDrift: 0, driftHistory: [] });

  // Test cue points for rapid jumping demonstration
  const testCuePoints = [
    { time: 5.0, label: "Intro", key: "1" },
    { time: 15.5, label: "Verse 1", key: "2" },
    { time: 35.2, label: "Chorus", key: "3" },
    { time: 58.8, label: "Verse 2", key: "4" },
    { time: 78.1, label: "Bridge", key: "5" },
    { time: 98.7, label: "Final Chorus", key: "6" },
    { time: 120.3, label: "Outro", key: "7" }
  ];

  // 🔧 FIX: Stable video callbacks to prevent infinite re-renders
  const handleVideoLoad = useCallback((video) => {
    console.log('✅ SyncDemo: Video loaded:', video);
  }, []); // No dependencies - stable function

  const handleVideoError = useCallback((error) => {
    console.error('❌ SyncDemo: Video error:', error);
  }, []); // No dependencies - stable function

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

  // Handle time updates for sync monitoring
  const handleTimeUpdate = useCallback(() => {
    // Update sync statistics
    const stats = syncStatsRef.current;
    
    // This would be updated by the sync hook in real usage
    setSyncStats({
      corrections: stats.corrections,
      maxDrift: stats.maxDrift,
      avgDrift: stats.driftHistory.length > 0 
        ? stats.driftHistory.reduce((a, b) => a + b, 0) / stats.driftHistory.length 
        : 0
    });
  }, []);

  // Handle cue point clicks
  const handleCueClick = useCallback((cue) => {
    console.log('SyncDemo: Cue point clicked:', cue);
    setActiveCue(cue);
  }, []);

  // Rapid cue jump test
  const performRapidJumpTest = useCallback(() => {
    const jumpSequence = [
      testCuePoints[0], // Intro
      testCuePoints[2], // Chorus  
      testCuePoints[1], // Verse 1
      testCuePoints[4], // Bridge
      testCuePoints[3], // Verse 2
      testCuePoints[5]  // Final Chorus
    ];

    let jumpIndex = 0;
    const interval = setInterval(() => {
      if (jumpIndex < jumpSequence.length) {
        const cue = jumpSequence[jumpIndex];
        setActiveCue(cue);
        handleCueClick(cue);
        jumpIndex++;
      } else {
        clearInterval(interval);
        console.log('Rapid jump test completed');
      }
    }, 1500); // Jump every 1.5 seconds

    console.log('Starting rapid jump test...');
  }, [handleCueClick]);

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
    console.log('SyncDemo: Loading file pair:', file);
    
    setAudioUrl(`/downloads/${file.audioFile}`);
    setVideoUrl(`/downloads/${file.videoFile}`);
    setActiveCue(null);
    
    console.log('SyncDemo: URLs set', {
      audioUrl: `/downloads/${file.audioFile}`,
      videoUrl: `/downloads/${file.videoFile}`
    });
  }, []);

  // Load test files manually
  const loadTestFiles = useCallback(() => {
    // These would be your test files
    setAudioUrl('/downloads/test-audio.wav');
    setVideoUrl('/downloads/test-video.mp4');
    setActiveCue(null);
  }, []);

  // Initialize
  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-2">
            Video Sync Engine Demo
          </h1>
          <p className="text-gray-400 text-center">
            Test frame-accurate video synchronization with Web Audio API
          </p>
        </header>

        {/* File Selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">File Selection</h2>
          
          {downloadedFiles.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Downloaded Files:</h3>
              <div className="space-y-2">
                {downloadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => loadFilePair(file)}
                  >
                    <span className="text-sm font-mono">{file.filename}</span>
                    <div className="text-xs text-gray-400">
                      Audio + Video
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={loadTestFiles}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Load Test Files
            </button>
            <button
              onClick={fetchDownloads}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
            >
              Refresh Downloads
            </button>
          </div>
        </div>

        {/* Sync Test Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Sync Testing</h2>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <button
              onClick={performRapidJumpTest}
              disabled={!audioUrl || !videoUrl}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded transition-colors"
            >
              🚀 Rapid Jump Test
            </button>
            <button
              onClick={() => setShowSyncStatus(!showSyncStatus)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
            >
              {showSyncStatus ? 'Hide' : 'Show'} Sync Status
            </button>
          </div>

          {/* Sync Statistics */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-gray-400">Sync Corrections</div>
              <div className="text-xl font-mono">{syncStats.corrections}</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-gray-400">Max Drift</div>
              <div className="text-xl font-mono">{(syncStats.maxDrift || 0).toFixed(3)}s</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-gray-400">Avg Drift</div>
              <div className="text-xl font-mono">{(syncStats.avgDrift || 0).toFixed(3)}s</div>
            </div>
          </div>
        </div>

        {/* Player Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Audio Player */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Audio (Master)</h2>
              {!isPlaying && (
                <div className="flex items-center text-yellow-400 text-sm">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Click play button below to start
                </div>
              )}
            </div>
            <WaveformPlayer
              audioUrl={audioUrl}
              cuePoints={testCuePoints}
              onCueClick={handleCueClick}
              activeCue={activeCue}
              height={128}
              autoPlay={false}
              onAudioContextChange={handleAudioContextChange}
              onPlaybackStateChange={handlePlaybackStateChange}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>

          {/* Video Player */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Video (Follower)</h2>
              <div className="flex items-center text-sm">
                <div className={`w-2 h-2 rounded-full mr-2 ${isPlaying ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                {isPlaying ? 'Synced & Playing' : 'Ready to Sync'}
              </div>
            </div>
            <VideoPlayer
              videoUrl={videoUrl}
              audioStartTime={audioStartTime}
              cueOffset={cueOffset}
              audioContext={audioContext}
              isPlaying={isPlaying}
              width={640}
              height={360}
              showSyncStatus={showSyncStatus}
              onVideoLoad={handleVideoLoad}
              onVideoError={handleVideoError}
            />
          </div>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {testCuePoints.map((cue, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="bg-gray-600 px-2 py-1 rounded text-xs font-mono">
                  {cue.key}
                </span>
                <span>{cue.label}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-xs mt-4">
            * Keyboard shortcuts work when the waveform player is focused
          </p>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>Load audio and video files using the controls above</li>
            <li>Click play on the waveform player to start synchronized playback</li>
            <li>Click cue points or use keyboard shortcuts to test sync accuracy</li>
                         <li>Use &quot;Rapid Jump Test&quot; to stress-test the sync engine</li>
            <li>Monitor sync status to verify drift stays below ±50ms</li>
            <li>Observe sync corrections in real-time</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SyncDemo; 
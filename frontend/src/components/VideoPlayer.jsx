import { useRef, useEffect, useState, useCallback } from 'react';
import useVideoSync from '../hooks/useVideoSync';

/**
 * VideoPlayer component with Web Audio API sync
 * 
 * @param {Object} props
 * @param {string} props.videoUrl - URL to the video file
 * @param {number} props.audioStartTime - When audio playback started (AudioContext.currentTime)
 * @param {number} props.cueOffset - Offset into audio buffer (seconds)
 * @param {AudioContext} props.audioContext - Web Audio API context
 * @param {boolean} props.isPlaying - Whether audio is playing

 * @param {boolean} props.showSyncStatus - Whether to show sync debug info
 * @param {Function} props.onVideoLoad - Callback when video loads
 * @param {Function} props.onVideoError - Callback when video fails to load
 */
const VideoPlayer = ({
  videoUrl,
  audioStartTime,
  cueOffset = 0,
  audioContext,
  isPlaying = false,
  showSyncStatus = false,
  onVideoLoad,
  onVideoError
}) => {
  // 🐛 DEBUG: Track render count
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  // 🔧 FIX: Only log every 20th render to reduce noise
  if (renderCountRef.current % 20 === 0) {
    console.log(`🔄 VideoPlayer RENDER #${renderCountRef.current}`, {
      videoUrl,
      isPlaying,
      timestamp: Date.now()
    });
  }

  const videoRef = useRef(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);

  // Video sync hook
  const {
    forceSync,
    // getSyncStatus, // Disabled to prevent infinite loop
    isActive: isSyncActive,
    stats: syncStats
  } = useVideoSync({
    videoElement: videoRef.current,
    audioStartTime,
    cueOffset,
    context: audioContext,
    isPlaying,
    driftThreshold: 0.05
  });

  // Update sync status for display - DISABLED to prevent infinite loop
  useEffect(() => {
    // 🔧 COMPLETELY DISABLED: This effect is disabled to prevent infinite re-renders
    // The getSyncStatus function changes when videoElement changes,
    // causing this effect to restart constantly and setSyncStatus every 100ms
    
    // DISABLED: No logging needed for disabled effect
    
    // if (!showSyncStatus) return;
    // const updateStatus = () => {
    //   setSyncStatus(getSyncStatus());
    // };
    // const interval = setInterval(updateStatus, 100); // Update 10 times per second
    // return () => clearInterval(interval);
  }, []); // 🔧 FIX: Empty dependencies to prevent any triggers

  // Handle video load
  const handleVideoLoad = useCallback(() => {
    console.log('🎥 VideoPlayer: Video loaded successfully');
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    console.log('Video details:', {
      duration: video.duration,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight
    });

    setIsVideoReady(true);
    setVideoError(null);

    if (onVideoLoad) {
      onVideoLoad(video);
    }
  }, [onVideoLoad]);

  // Handle video errors
  const handleVideoError = useCallback((error) => {
    console.error('❌ VideoPlayer: Video error:', error);
    setVideoError(error.target?.error || error);
    setIsVideoReady(false);

    if (onVideoError) {
      onVideoError(error);
    }
  }, [onVideoError]);

  // Video setup and event handling
  useEffect(() => {
    console.log('🔥 VideoPlayer: Setting up video', {
      hasVideo: !!videoRef.current,
      videoUrl,
      renderCount: renderCountRef.current
    });

    const video = videoRef.current;
    if (!video || !videoUrl) {
      console.log('VideoPlayer: No video element or URL', { hasVideo: !!video, videoUrl });
      return;
    }

    console.log('VideoPlayer: Loading video:', videoUrl);

    // Set video properties
    video.src = videoUrl;
    video.preload = 'metadata';
    video.playsInline = true;
    
    video.addEventListener('canplay', handleVideoLoad);
    video.addEventListener('error', handleVideoError);

    return () => {
      console.log('🧹 VideoPlayer: Cleaning up video setup');
      
      video.removeEventListener('canplay', handleVideoLoad);
      video.removeEventListener('error', handleVideoError);
    };
  }, [videoUrl, handleVideoLoad, handleVideoError]);

  // Handle play/pause sync with audio
  useEffect(() => {
    console.log('🔄 VideoPlayer: Play/pause state change', {
      isPlaying,
      isVideoReady,
      hasVideo: !!videoRef.current
    });

    const video = videoRef.current;
    if (!video || !isVideoReady) {
      console.log('VideoPlayer: Not ready for playback', { 
        hasVideo: !!video, 
        isVideoReady, 
        isPlaying 
      });
      return;
    }

    if (isPlaying) {
      // Start video playback
      console.log('VideoPlayer: Starting video playback');
      video.play().catch(error => {
        console.warn('VideoPlayer: Video play failed:', error);
      });
    } else {
      // Pause video
      console.log('VideoPlayer: Pausing video playback');
      video.pause();
    }
  }, [isPlaying, isVideoReady]);

  // Force sync on cue changes
  const handleForceSync = useCallback(() => {
    forceSync();
  }, [forceSync]);

  // Format time for display
  const formatTime = useCallback((seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Format drift with color coding
  const formatDrift = useCallback((drift) => {
    if (typeof drift !== 'number') return '0.000s';
    const absDrift = Math.abs(drift);
    const color = absDrift > 0.05 ? 'text-red-400' : absDrift > 0.02 ? 'text-yellow-400' : 'text-green-400';
    return (
      <span className={color}>
        {drift >= 0 ? '+' : ''}{drift.toFixed(3)}s
      </span>
    );
  }, []);

  return (
    <div className="video-player w-full">
      {/* Video Container */}
      <div className="relative bg-black rounded-lg overflow-hidden w-full aspect-[16/9]">
        {!isVideoReady && !videoError && videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span>Loading video...</span>
            </div>
          </div>
        )}

        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900 text-white">
            <div className="text-center">
              <p className="text-lg font-semibold">Video Error</p>
              <p className="text-sm mt-2">Failed to load video file</p>
            </div>
          </div>
        )}

        {!videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-400">
            No video file loaded
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-full object-contain"
        />

        {/* Sync Status Overlay */}
        {showSyncStatus && syncStatus && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
            <div>Sync: {syncStatus.isInSync ? '✅' : '❌'}</div>
            <div>Drift: {formatDrift(syncStatus.drift)}</div>
            <div>Expected: {formatTime(syncStatus.expectedTime)}</div>
            <div>Actual: {formatTime(syncStatus.actualTime)}</div>
          </div>
        )}

        {/* Play/Pause indicator */}
        {isVideoReady && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {isPlaying ? '▶️ Playing' : '⏸️ Paused'}
          </div>
        )}
      </div>

      {/* Sync Status Panel */}
      {showSyncStatus && syncStatus && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-white text-sm font-semibold mb-2">Video Sync Status</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="text-gray-400">
                Sync Active: <span className={isSyncActive ? 'text-green-400' : 'text-red-400'}>
                  {isSyncActive ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="text-gray-400">
                In Sync: <span className={syncStatus.isInSync ? 'text-green-400' : 'text-red-400'}>
                  {syncStatus.isInSync ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="text-gray-400">
                Drift: {formatDrift(syncStatus.drift)}
              </div>
              <div className="text-gray-400">
                Cue Offset: <span className="text-white">{cueOffset.toFixed(3)}s</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-gray-400">
                Expected Time: <span className="text-white">{formatTime(syncStatus.expectedTime)}</span>
              </div>
              <div className="text-gray-400">
                Actual Time: <span className="text-white">{formatTime(syncStatus.actualTime)}</span>
              </div>
              <div className="text-gray-400">
                Corrections: <span className="text-white">{syncStats?.corrections || 0}</span>
              </div>
              <div className="text-gray-400">
                Max Drift: <span className="text-white">{(syncStats?.maxDrift || 0).toFixed(3)}s</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex space-x-2">
            <button
              onClick={handleForceSync}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              Force Sync
            </button>
            <button
              onClick={() => setSyncStatus(null)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
            >
              Hide Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer; 
import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';

/**
 * WaveformPlayer component using Wavesurfer.js with Web Audio API integration
 * 
 * @param {Object} props
 * @param {string} props.audioUrl - URL to local .wav file
 * @param {Array} props.cuePoints - Array of cue point objects
 * @param {Function} props.onCueClick - Callback when a marker is clicked
 * @param {Object} props.activeCue - Currently active cue point
 * @param {number} props.height - Height of waveform container (default: 128px)
 * @param {boolean} props.autoPlay - Auto play on load (default: false)
 * @param {Function} props.onAudioContextChange - Callback when audio context changes
 * @param {Function} props.onPlaybackStateChange - Callback when playback state changes
 * @param {Function} props.onTimeUpdate - Callback for time updates with sync info
 * @param {Function} props.onRef - Callback to provide component reference for external control
 * @param {Function} props.onDurationChange - Callback when duration changes

 */
const WaveformPlayer = ({
  audioUrl,
  cuePoints = [],
  onCueClick,
  activeCue = null,
  height = 128,
  autoPlay = false,
  onAudioContextChange,
  onPlaybackStateChange,
  onTimeUpdate,
  onRef,
  onDurationChange
}) => {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const markersRef = useRef([]);
  const audioContextRef = useRef(null);
  const audioBufferRef = useRef(null);
  const audioSourceRef = useRef(null);
  const audioStartTimeRef = useRef(null);
  const cueOffsetRef = useRef(0);
  
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Format time for display
  const formatTime = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Initialize Audio Context
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;

    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      if (onAudioContextChange) {
        onAudioContextChange(audioContextRef.current);
      }
      
      console.log('Audio context initialized:', audioContextRef.current);
      return audioContextRef.current;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return null;
    }
  }, [onAudioContextChange]);

  // Stop current audio playback
  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (error) {
        // Source may already be stopped
      }
      audioSourceRef.current = null;
    }
    audioStartTimeRef.current = null;
    setIsPlaying(false);
    
    if (onPlaybackStateChange) {
      onPlaybackStateChange({
        isPlaying: false,
        audioStartTime: null,
        cueOffset: cueOffsetRef.current,
        audioContext: audioContextRef.current
      });
    }
  }, [onPlaybackStateChange]);

  // Start audio playback from specific offset
  const startAudio = useCallback((offset = 0) => {
    if (!audioBufferRef.current || !audioContextRef.current) return;

    // Stop any existing playback
    stopAudio();

    // Resume audio context if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    try {
      // Create new audio source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);
      
      // Record start time and offset
      audioStartTimeRef.current = audioContextRef.current.currentTime;
      cueOffsetRef.current = offset;
      
      // Start playback
      source.start(0, offset);
      audioSourceRef.current = source;
      
      // Handle playback end
      source.onended = () => {
        if (audioSourceRef.current === source) {
          stopAudio();
        }
      };

      setIsPlaying(true);
      
      if (onPlaybackStateChange) {
        onPlaybackStateChange({
          isPlaying: true,
          audioStartTime: audioStartTimeRef.current,
          cueOffset: offset,
          audioContext: audioContextRef.current
        });
      }

      console.log('Audio started:', { offset, startTime: audioStartTimeRef.current });
    } catch (error) {
      console.error('Failed to start audio:', error);
    }
  }, [stopAudio, onPlaybackStateChange]);



  // Play/pause toggle - moved up to avoid temporal dead zone
  const togglePlayback = useCallback(async () => {
    if (!audioBufferRef.current || !audioContextRef.current || !isReady) {
      console.log('Cannot play: missing requirements', {
        hasBuffer: !!audioBufferRef.current,
        hasContext: !!audioContextRef.current,
        isReady
      });
      return;
    }

    // Handle suspended audio context (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      console.log('Resuming suspended audio context...');
      try {
        await audioContextRef.current.resume();
        console.log('Audio context resumed, state:', audioContextRef.current.state);
      } catch (error) {
        console.error('Failed to resume audio context:', error);
        return;
      }
    }
    
    if (isPlaying) {
      stopAudio();
    } else {
      startAudio(currentTime);
    }
  }, [isPlaying, isReady, currentTime, stopAudio, startAudio]);

  // Jump to specific cue point
  const jumpToCue = useCallback((time) => {
    if (!audioBufferRef.current || !audioContextRef.current) return;

    // Update wavesurfer visual position
    if (wavesurferRef.current && duration > 0) {
      const progress = time / duration;
      wavesurferRef.current.seekTo(progress);
    }

    // Start audio playback from cue time
    startAudio(time);
    
    console.log('Jumped to cue:', time);
  }, [duration, startAudio]);

  // Update current time based on audio context
  const updateCurrentTime = useCallback(() => {
    if (!audioContextRef.current || !audioStartTimeRef.current || !isPlaying) return;

    const elapsed = audioContextRef.current.currentTime - audioStartTimeRef.current;
    const newCurrentTime = cueOffsetRef.current + elapsed;
    
    setCurrentTime(newCurrentTime);

    if (onTimeUpdate) {
      onTimeUpdate({
        currentTime: newCurrentTime,
        audioStartTime: audioStartTimeRef.current,
        cueOffset: cueOffsetRef.current,
        audioContext: audioContextRef.current
      });
    }

    // Update wavesurfer progress
    if (wavesurferRef.current && duration > 0) {
      const progress = newCurrentTime / duration;
      // Use a method that doesn't trigger events to avoid infinite loops
      if (progress <= 1) {
        // 🔧 FIX: Add proper null checking for wavesurfer drawer
        try {
          if (wavesurferRef.current.drawer && typeof wavesurferRef.current.drawer.progress === 'function') {
            wavesurferRef.current.drawer.progress(progress);
          } else if (wavesurferRef.current.seekTo && typeof wavesurferRef.current.seekTo === 'function') {
            // Fallback to seekTo method if drawer.progress not available
            wavesurferRef.current.seekTo(progress);
          } else {
            console.warn('WaveformPlayer: No valid progress update method available');
          }
        } catch (error) {
          console.error('WaveformPlayer: Progress update failed:', error);
        }
      }
    }
  }, [isPlaying, duration, onTimeUpdate]);

  // Time update loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(updateCurrentTime, 50); // 20 FPS
    return () => clearInterval(interval);
  }, [isPlaying, updateCurrentTime]);

  // Initialize Wavesurfer
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    // Clean up existing instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    // Initialize audio context
    initAudioContext();

    // Create new wavesurfer instance
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4f46e5',
      progressColor: '#06b6d4',
      cursorColor: '#ffffff',
      barWidth: 2,
      barRadius: 1,
      responsive: true,
      height: height,
      normalize: true,
      backend: 'WebAudio',
      interact: true
    });

    wavesurferRef.current = wavesurfer;

    // Event listeners
    wavesurfer.on('ready', () => {
      setIsReady(true);
      const newDuration = wavesurfer.getDuration();
      setDuration(newDuration);
      
      // Notify parent of duration change
      if (onDurationChange) {
        onDurationChange(newDuration);
      }
      
      // Get the audio buffer for Web Audio API playback
      // Try multiple methods to extract the audio buffer
      let buffer = null;
      
      if (wavesurfer.backend && wavesurfer.backend.buffer) {
        buffer = wavesurfer.backend.buffer;
        console.log('Audio buffer extracted from backend.buffer');
      } else if (wavesurfer.backend && wavesurfer.backend.ac && wavesurfer.backend.ac.decodeAudioData) {
        // Try alternative extraction method
        console.log('Attempting alternative buffer extraction...');
      } else if (wavesurfer.getDecodedData) {
        // Modern wavesurfer method
        buffer = wavesurfer.getDecodedData();
        console.log('Audio buffer extracted from getDecodedData()');
      }
      
      if (buffer) {
        audioBufferRef.current = buffer;
        console.log('Audio buffer ready for Web Audio API:', {
          duration: buffer.duration,
          sampleRate: buffer.sampleRate,
          numberOfChannels: buffer.numberOfChannels
        });
      } else {
        console.error('Failed to extract audio buffer from wavesurfer');
        console.log('Available methods:', {
          hasBackend: !!wavesurfer.backend,
          hasBuffer: !!(wavesurfer.backend && wavesurfer.backend.buffer),
          hasGetDecodedData: !!wavesurfer.getDecodedData,
          backendType: wavesurfer.backend ? wavesurfer.backend.constructor.name : 'none'
        });
      }
      
      console.log('Waveform ready, duration:', wavesurfer.getDuration());
    });

    wavesurfer.on('seek', (progress) => {
      const seekTime = progress * duration;
      if (isPlaying && audioBufferRef.current) {
        startAudio(seekTime);
      }
    });

    wavesurfer.on('error', (error) => {
      console.error('Wavesurfer error:', error);
      setIsReady(false);
    });

    // Load the audio
    try {
      wavesurfer.load(audioUrl);
    } catch (error) {
      console.error('Failed to load audio:', error);
    }

    // Cleanup
    return () => {
      if (wavesurfer) {
        wavesurfer.destroy();
      }
    };
  }, [audioUrl, height]);

  // Provide component reference to parent
  useEffect(() => {
    if (onRef && isReady) {
      onRef({
        jumpToCue,
        togglePlayback,
        getCurrentTime: () => currentTime,
        getDuration: () => duration,
        isPlaying: () => isPlaying,
        isReady: () => isReady
      });
    }
  }, [onRef, isReady, jumpToCue, togglePlayback, currentTime, duration, isPlaying]);

  // Update markers when cue points or active cue changes
  useEffect(() => {
    // Call createMarkers directly with inline logic to avoid dependency
    if (!containerRef.current || !wavesurferRef.current || !isReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker.remove) marker.remove();
    });
    markersRef.current = [];

    // Create new markers for each cue point
    cuePoints.forEach(cue => {
      try {
        const marker = document.createElement('div');
        marker.className = `absolute top-0 w-0.5 h-full cursor-pointer transition-colors z-10 ${
          activeCue && activeCue.time === cue.time && activeCue.label === cue.label
            ? 'bg-yellow-400'
            : 'bg-red-500 hover:bg-red-400'
        }`;
        
        marker.style.left = `${(cue.time / duration) * 100}%`;
        marker.title = `${cue.label} (${cue.time}s)`;
        
        marker.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onCueClick) {
            onCueClick(cue);
          }
        });
        
        containerRef.current.appendChild(marker);
        markersRef.current.push(marker);
      } catch (error) {
        console.error('Error creating marker:', error);
      }
    });
  }, [cuePoints, activeCue, isReady, duration, onCueClick]);

  // Auto play if enabled
  useEffect(() => {
    if (isReady && autoPlay && audioBufferRef.current) {
      // Call startAudio directly with inline logic to avoid dependency
      const initAndStart = async () => {
        const context = audioContextRef.current;
        if (!context) return;
        
        if (context.state === 'suspended') {
          await context.resume();
        }
        
        try {
          const source = context.createBufferSource();
          source.buffer = audioBufferRef.current;
          source.connect(context.destination);
          
          audioStartTimeRef.current = context.currentTime;
          cueOffsetRef.current = 0;
          
          source.start(0, 0);
          audioSourceRef.current = source;
          
          source.onended = () => {
            if (audioSourceRef.current === source) {
              setIsPlaying(false);
              audioSourceRef.current = null;
              audioStartTimeRef.current = null;
            }
          };

          setIsPlaying(true);
          
          if (onPlaybackStateChange) {
            onPlaybackStateChange({
              isPlaying: true,
              audioStartTime: audioStartTimeRef.current,
              cueOffset: 0,
              audioContext: context
            });
          }
        } catch (error) {
          console.error('Failed to start audio:', error);
        }
      };
      
      initAndStart();
    }
  }, [isReady, autoPlay, onPlaybackStateChange]);



  // Handle spacebar for play/pause control
  const handleSpacebarPress = useCallback((event) => {
    // Only handle spacebar key
    if (event.code !== 'Space') return;
    
    // Ignore if user is typing in input fields
    const target = event.target;
    const excludeTargets = ['input', 'textarea', 'select'];
    if (target && excludeTargets.includes(target.tagName.toLowerCase())) return;
    
    // Ignore if target has contenteditable
    if (target && target.isContentEditable) return;
    
    // Ignore if modifier keys are pressed
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    
    // Prevent default browser behavior (page scrolling)
    event.preventDefault();
    event.stopPropagation();
    
    // Toggle playback
    togglePlayback();
  }, [togglePlayback]);

  // Set up spacebar event listener
  useEffect(() => {
    document.addEventListener('keydown', handleSpacebarPress, { capture: true });
    
    return () => {
      document.removeEventListener('keydown', handleSpacebarPress, { capture: true });
    };
  }, [handleSpacebarPress]);


  return (
    <div className="waveform-player w-full">

      {/* Waveform Container */}
      <div className="waveform-container relative" style={{ height: `${height}px` }}>
        {!isReady && audioUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span>Loading waveform...</span>
            </div>
          </div>
        )}
        
        {!audioUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-400">
            No audio file loaded
          </div>
        )}
        
        <div ref={containerRef} className="wavesurfer-container" />
      </div>

      {/* Timeline */}
      <div className="timeline-container mt-2 px-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>0:00</span>
          {duration > 0 && (
            <>
              <span>{formatTime(duration / 4)}</span>
              <span>{formatTime(duration / 2)}</span>
              <span>{formatTime((duration * 3) / 4)}</span>
              <span>{formatTime(duration)}</span>
            </>
          )}
        </div>
      </div>


    </div>
  );
};

export default WaveformPlayer; 
import { useRef, useEffect, useCallback } from 'react';

/**
 * React hook for synchronizing HTML5 video with Web Audio API playback
 * 
 * @param {Object} params - Sync parameters
 * @param {HTMLVideoElement} params.videoElement - The video element to sync
 * @param {number} params.audioStartTime - Timestamp when audio started (context.currentTime)
 * @param {number} params.cueOffset - Offset into audio buffer where playback began (seconds)
 * @param {AudioContext} params.context - Web Audio API context
 * @param {boolean} params.isPlaying - Whether audio is currently playing
 * @param {number} params.driftThreshold - Maximum allowed drift in seconds (default: 0.05)
 * @returns {Object} - Sync status and control functions
 */
const useVideoSync = ({
  videoElement,
  audioStartTime,
  cueOffset = 0,
  context,
  isPlaying = false,
  driftThreshold = 0.05
}) => {
  // 🔧 FIX: Use refs for frequently changing values to prevent re-renders
  const videoElementRef = useRef(videoElement);
  const audioStartTimeRef = useRef(audioStartTime);
  const cueOffsetRef = useRef(cueOffset);
  const contextRef = useRef(context);
  const isPlayingRef = useRef(isPlaying);

  const lastCorrectionTimeRef = useRef(0);
  const statsRef = useRef({
    corrections: 0,
    maxDrift: 0,
    avgDrift: 0,
    driftHistory: []
  });
  const isActiveRef = useRef(false);
  const periodicTimeoutRef = useRef(null); // 🔧 FIX: Track timeout for cleanup

  // Update refs when props change
  useEffect(() => { videoElementRef.current = videoElement; }, [videoElement]);
  useEffect(() => { audioStartTimeRef.current = audioStartTime; }, [audioStartTime]);
  useEffect(() => { cueOffsetRef.current = cueOffset; }, [cueOffset]);
  useEffect(() => { contextRef.current = context; }, [context]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Minimum time between corrections (in milliseconds) to prevent excessive seeking
  const CORRECTION_THROTTLE_MS = 100; // Max 10 corrections per second

  // 🔧 FIX: Stable calculate functions that don't change dependencies
  const calculateExpectedVideoTime = useCallback(() => {
    const ctx = contextRef.current;
    const startTime = audioStartTimeRef.current;
    const offset = cueOffsetRef.current;
    
    if (!ctx || startTime === null) return 0;
    
    const audioElapsed = ctx.currentTime - startTime;
    const expectedTime = offset + audioElapsed;
    
    return Math.max(0, expectedTime);
  }, []); // 🔧 FIX: No dependencies - uses refs

  // 🔧 FIX: Stable calculate drift function
  const calculateDrift = useCallback(() => {
    const video = videoElementRef.current;
    if (!video) return 0;
    
    const expectedTime = calculateExpectedVideoTime();
    const actualTime = video.currentTime;
    const drift = actualTime - expectedTime;
    
    // Update drift statistics
    const stats = statsRef.current;
    stats.driftHistory.push(Math.abs(drift));
    if (stats.driftHistory.length > 100) {
      stats.driftHistory.shift(); // Keep only last 100 measurements
    }
    
    stats.maxDrift = Math.max(stats.maxDrift, Math.abs(drift));
    stats.avgDrift = stats.driftHistory.reduce((a, b) => a + b, 0) / stats.driftHistory.length;
    
    return drift;
  }, [calculateExpectedVideoTime]); // 🔧 FIX: Only depends on stable function

  // 🔧 FIX: Stable sync correction function
  const correctVideoTime = useCallback(() => {
    const video = videoElementRef.current;
    const ctx = contextRef.current;
    
    if (!video || !ctx) {
      console.log('VideoSync: correctVideoTime called but missing elements', {
        hasVideo: !!video,
        hasContext: !!ctx
      });
      return false;
    }

    const now = performance.now();
    const timeSinceLastCorrection = now - lastCorrectionTimeRef.current;
    
    // Throttle corrections to prevent excessive seeking
    if (timeSinceLastCorrection < CORRECTION_THROTTLE_MS) {
      console.log(`VideoSync: Correction throttled (${timeSinceLastCorrection.toFixed(1)}ms < ${CORRECTION_THROTTLE_MS}ms)`);
      return false;
    }

    const drift = calculateDrift();
    const absDrift = Math.abs(drift);
    
    console.log('VideoSync: Drift check', {
      drift: drift.toFixed(3),
      absDrift: absDrift.toFixed(3),
      threshold: driftThreshold,
      needsCorrection: absDrift > driftThreshold,
      videoCurrentTime: video.currentTime,
      expectedTime: calculateExpectedVideoTime()
    });
    
    // Check if correction is needed
    if (absDrift > driftThreshold) {
      const expectedTime = calculateExpectedVideoTime();
      
      try {
        // Ensure we don't seek beyond video duration
        const correctedTime = Math.min(expectedTime, video.duration || expectedTime);
        
        if (correctedTime >= 0 && Math.abs(correctedTime - video.currentTime) > 0.01) {
          console.log(`VideoSync: APPLYING CORRECTION`, {
            from: video.currentTime.toFixed(3),
            to: correctedTime.toFixed(3),
            drift: drift.toFixed(3)
          });
          
          video.currentTime = correctedTime;
          lastCorrectionTimeRef.current = now;
          statsRef.current.corrections++;
          
          return true;
        } else {
          console.log('VideoSync: Correction not needed - difference too small');
        }
      } catch (error) {
        console.error('VideoSync: Video sync correction failed:', error);
      }
    }
    
    return false;
  }, [driftThreshold, calculateDrift, calculateExpectedVideoTime]); // 🔧 FIX: Stable dependencies

  // 🔧 FIX: Stable periodic drift check with proper cleanup
  const periodicDriftCheck = useCallback(() => {
    // Clear any existing timeout
    if (periodicTimeoutRef.current) {
      clearTimeout(periodicTimeoutRef.current);
      periodicTimeoutRef.current = null;
    }

    if (!isActiveRef.current || !isPlayingRef.current) return;
    
    const drift = calculateDrift();
    const absDrift = Math.abs(drift);
    
    // Only log and potentially correct large drift
    if (absDrift > driftThreshold * 2) { // 0.1s threshold for periodic checks
      console.log(`Periodic drift check: ${drift.toFixed(3)}s drift detected`);
      correctVideoTime();
    }
    
    // Schedule next periodic check (every 2 seconds) if still active
    if (isActiveRef.current && isPlayingRef.current) {
      periodicTimeoutRef.current = setTimeout(periodicDriftCheck, 2000);
    }
  }, [driftThreshold, calculateDrift, correctVideoTime]); // 🔧 FIX: Stable dependencies

  // 🔧 FIX: Stable start sync function
  const startSync = useCallback(() => {
    const video = videoElementRef.current;
    const ctx = contextRef.current;
    
    if (!video || !ctx) return;
    
    isActiveRef.current = true;
    console.log('Starting video sync system');
    
    // Reset statistics
    statsRef.current = {
      corrections: 0,
      maxDrift: 0,
      avgDrift: 0,
      driftHistory: []
    };
    
    // Start periodic drift monitoring (every 2 seconds)
    periodicTimeoutRef.current = setTimeout(periodicDriftCheck, 2000);
  }, [periodicDriftCheck]); // 🔧 FIX: Only depends on stable function

  // 🔧 FIX: Stable stop sync function with proper cleanup
  const stopSync = useCallback(() => {
    if (!isActiveRef.current) return; // Don't log if already stopped
    
    isActiveRef.current = false;
    
    // Clear any pending timeout
    if (periodicTimeoutRef.current) {
      clearTimeout(periodicTimeoutRef.current);
      periodicTimeoutRef.current = null;
    }
    
    console.log('Stopped video sync system');
  }, []); // 🔧 FIX: No dependencies

  // 🔧 FIX: Stable force sync function
  const forceSync = useCallback(() => {
    const video = videoElementRef.current;
    const ctx = contextRef.current;
    
    if (!video || !ctx) return;
    
    const corrected = correctVideoTime();
    if (corrected) {
      console.log('Forced video sync correction');
    }
  }, [correctVideoTime]); // 🔧 FIX: Only depends on stable function

  // 🔧 FIX: Completely stable getSyncStatus function
  const getSyncStatus = useCallback(() => {
    const video = videoElementRef.current;
    const ctx = contextRef.current;
    
    if (!video || !ctx) {
      return {
        drift: 0,
        expectedTime: 0,
        actualTime: 0,
        isInSync: true,
        stats: statsRef.current
      };
    }

    const drift = calculateDrift();
    const expectedTime = calculateExpectedVideoTime();
    const actualTime = video.currentTime;
    const isInSync = Math.abs(drift) <= driftThreshold;

    return {
      drift,
      expectedTime,
      actualTime,
      isInSync,
      stats: { ...statsRef.current }
    };
  }, [driftThreshold, calculateDrift, calculateExpectedVideoTime]); // 🔧 FIX: Stable dependencies only

  // 🔧 FIX: Simplified effect for sync system lifecycle
  useEffect(() => {
    if (isPlaying && videoElement && context && audioStartTime !== null) {
      startSync();
    } else {
      stopSync();
    }

    return stopSync; // Cleanup on unmount or dependency change
  }, [isPlaying, videoElement, context, audioStartTime, startSync, stopSync]);

  // 🔧 FIX: Simplified effect for parameter changes (cue point jumps)
  useEffect(() => {
    if (isPlaying && videoElement && context) {
      // Force immediate sync when parameters change (cue points)
      console.log('Cue point changed - forcing sync');
      forceSync();
    }
  }, [cueOffset, audioStartTime, forceSync, isPlaying, videoElement, context]);

  // 🔧 FIX: Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeout
      if (periodicTimeoutRef.current) {
        clearTimeout(periodicTimeoutRef.current);
      }
      stopSync();
    };
  }, [stopSync]);

  return {
    startSync,
    stopSync,
    forceSync,
    getSyncStatus,
    isActive: isActiveRef.current,
    stats: statsRef.current
  };
};

export default useVideoSync; 
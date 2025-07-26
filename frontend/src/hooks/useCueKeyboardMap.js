import { useEffect, useCallback, useRef } from 'react';

/**
 * useCueKeyboardMap - React hook for global keyboard shortcuts to trigger cue points
 * 
 * @param {Object} params - Hook parameters
 * @param {Array} params.cuePoints - Array of cue point definitions
 * @param {Function} params.onTriggerCue - Called when cue is triggered with (cueTime, cueData)
 * @param {boolean} params.enabled - Whether keyboard shortcuts are enabled (default: true)
 * @param {number} params.debounceMs - Debounce time for repeated triggers (default: 100)
 * @param {Array} params.excludeTargets - Element types to exclude (default: ['input', 'textarea'])
 * @returns {Object} - Hook state and control functions
 */
const useCueKeyboardMap = ({
  cuePoints = [],
  onTriggerCue,
  enabled = true,
  debounceMs = 100,
  excludeTargets = ['input', 'textarea', 'select']
}) => {
  const lastTriggerRef = useRef({});
  const keyMapRef = useRef(new Map());
  const statsRef = useRef({
    totalTriggers: 0,
    triggersByKey: {},
    lastTriggerTime: null
  });

  // Build key mapping from cue points
  const buildKeyMap = useCallback(() => {
    const keyMap = new Map();
    const duplicateKeys = new Set();
    
    cuePoints.forEach((cue, index) => {
      if (cue.key) {
        const key = cue.key.toLowerCase();
        if (keyMap.has(key)) {
          duplicateKeys.add(key);
          console.warn(`Duplicate cue key detected: "${key}" - only first occurrence will be active`);
        } else {
          keyMap.set(key, { ...cue, index });
        }
      }
    });
    
    keyMapRef.current = keyMap;
    return { keyMap, duplicateKeys: Array.from(duplicateKeys) };
  }, [cuePoints]);

  // Check if we should ignore this key event
  const shouldIgnoreEvent = useCallback((event) => {
    // Ignore if disabled
    if (!enabled) return true;
    
    // Ignore if modifier keys are pressed (except shift for special chars)
    if (event.ctrlKey || event.altKey || event.metaKey) return true;
    
    // Ignore if focused on input elements
    const target = event.target;
    if (target && excludeTargets.includes(target.tagName.toLowerCase())) return true;
    
    // Ignore if target has contenteditable
    if (target && target.isContentEditable) return true;
    
    return false;
  }, [enabled, excludeTargets]);

  // Handle key press with debouncing
  const handleKeyPress = useCallback((event) => {
    if (shouldIgnoreEvent(event)) return;
    
    const key = event.key.toLowerCase();
    const cue = keyMapRef.current.get(key);
    
    if (!cue) return;
    
    // Prevent default to avoid browser shortcuts
    event.preventDefault();
    event.stopPropagation();
    
    // Check debouncing
    const now = Date.now();
    const lastTrigger = lastTriggerRef.current[key];
    
    if (lastTrigger && (now - lastTrigger) < debounceMs) {
      return; // Debounced
    }
    
    // Update last trigger time
    lastTriggerRef.current[key] = now;
    
    // Update statistics
    statsRef.current.totalTriggers++;
    statsRef.current.triggersByKey[key] = (statsRef.current.triggersByKey[key] || 0) + 1;
    statsRef.current.lastTriggerTime = now;
    
    // Trigger the cue
    try {
      onTriggerCue(cue.time, cue);
      console.log(`Triggered cue "${cue.label}" at ${cue.time}s via key "${key}"`);
    } catch (error) {
      console.error('Error triggering cue:', error);
    }
  }, [shouldIgnoreEvent, debounceMs, onTriggerCue]);

  // Set up global event listener
  useEffect(() => {
    if (!enabled || !onTriggerCue) return;
    
    // Build the key map
    const { keyMap, duplicateKeys } = buildKeyMap();
    
    // Log active mappings for debugging
    if (keyMap.size > 0) {
      const mappings = Array.from(keyMap.entries()).map(([key, cue]) => 
        `"${key}" → "${cue.label}" (${cue.time}s)`
      ).join(', ');
      console.log(`Active cue key mappings: ${mappings}`);
      
      if (duplicateKeys.length > 0) {
        console.warn(`Duplicate keys ignored: ${duplicateKeys.join(', ')}`);
      }
    }
    
    // Add event listener
    document.addEventListener('keydown', handleKeyPress, { capture: true });
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyPress, { capture: true });
    };
  }, [enabled, onTriggerCue, buildKeyMap, handleKeyPress]);

  // Get current key mapping for debugging/display
  const getKeyMapping = useCallback(() => {
    return Array.from(keyMapRef.current.entries()).map(([key, cue]) => ({
      key,
      label: cue.label,
      time: cue.time,
      index: cue.index
    }));
  }, []);

  // Get usage statistics
  const getStats = useCallback(() => {
    return {
      ...statsRef.current,
      activeKeys: keyMapRef.current.size,
      lastTriggerAge: statsRef.current.lastTriggerTime 
        ? Date.now() - statsRef.current.lastTriggerTime 
        : null
    };
  }, []);

  // Clear debounce timers for immediate triggering
  const clearDebounce = useCallback(() => {
    lastTriggerRef.current = {};
  }, []);

  // Trigger cue programmatically by key
  const triggerByKey = useCallback((key) => {
    const cue = keyMapRef.current.get(key.toLowerCase());
    if (cue && onTriggerCue) {
      onTriggerCue(cue.time, cue);
      return true;
    }
    return false;
  }, [onTriggerCue]);

  // Check if a key is mapped
  const isKeyMapped = useCallback((key) => {
    return keyMapRef.current.has(key.toLowerCase());
  }, []);

  return {
    // State
    enabled,
    keyCount: keyMapRef.current.size,
    
    // Key mapping info
    getKeyMapping,
    isKeyMapped,
    
    // Statistics
    getStats,
    
    // Control functions
    triggerByKey,
    clearDebounce,
    
    // For debugging
    _keyMapRef: keyMapRef.current,
    _lastTriggerRef: lastTriggerRef.current
  };
};

export default useCueKeyboardMap; 
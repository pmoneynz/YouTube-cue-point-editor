import { useState, useCallback, useRef } from 'react';

/**
 * CuePointEditor - Comprehensive cue point management interface
 * 
 * @param {Object} props
 * @param {Array} props.cuePoints - Array of current cue points
 * @param {Function} props.onUpdate - Callback when cue points change
 * @param {number} props.audioDuration - For input bounds checking
 * @param {number} props.currentTime - Current audio time for default new cue time
 * @param {number} props.sampleRate - Sample rate for precise calculations (default: 48000)
 */
const CuePointEditor = ({
  cuePoints = [],
  onUpdate,
  audioDuration = 0,
  currentTime = 0,
  sampleRate = 48000
}) => {
  const [editingId, setEditingId] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [draggedIndex, setDraggedIndex] = useState(null);
  const fileInputRef = useRef(null);

  // Format time for display (MM:SS.mmm)
  const formatTime = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
  }, []);

  // Parse time from string input
  const parseTime = useCallback((timeString) => {
    if (typeof timeString === 'number') return timeString;
    
    // Support formats: "MM:SS.mmm", "SS.mmm", or just seconds
    const parts = timeString.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseFloat(parts[1]) || 0;
      return minutes * 60 + seconds;
    } else {
      return parseFloat(timeString) || 0;
    }
  }, []);

  // Calculate sample position from time
  const calculateSamplePosition = useCallback((time) => {
    return Math.round(time * sampleRate);
  }, [sampleRate]);

  // Generate next available key
  const getNextAvailableKey = useCallback(() => {
    const usedKeys = new Set(cuePoints.map(cue => cue.key).filter(Boolean));
    
    // Try numbers 1-9 first
    for (let i = 1; i <= 9; i++) {
      if (!usedKeys.has(i.toString())) return i.toString();
    }
    
    // Then letters a-z
    for (let i = 97; i <= 122; i++) {
      const letter = String.fromCharCode(i);
      if (!usedKeys.has(letter)) return letter;
    }
    
    // Fall back to random
    return Math.random().toString(36).substring(2, 3);
  }, [cuePoints]);

  // Validate cue point data
  const validateCue = useCallback((cue, index) => {
    const errors = {};
    
    // Validate time bounds
    if (cue.time < 0) {
      errors.time = 'Time cannot be negative';
    } else if (cue.time > audioDuration) {
      errors.time = `Time cannot exceed duration (${formatTime(audioDuration)})`;
    }
    
    // Validate label
    if (!cue.label || cue.label.trim().length === 0) {
      errors.label = 'Label is required';
    }
    
    // Validate key uniqueness
    if (cue.key) {
      const duplicateIndex = cuePoints.findIndex((other, i) => 
        i !== index && other.key === cue.key
      );
      if (duplicateIndex !== -1) {
        errors.key = `Key "${cue.key}" is already used by "${cuePoints[duplicateIndex].label}"`;
      }
    }
    
    return errors;
  }, [audioDuration, formatTime, cuePoints]);

  // Add new cue point
  const addCue = useCallback(() => {
    const newCue = {
      time: currentTime,
      label: `Cue ${cuePoints.length + 1}`,
      key: getNextAvailableKey(),
      sample_rate: sampleRate,
      sample_position: calculateSamplePosition(currentTime)
    };
    
    const updatedCues = [...cuePoints, newCue].sort((a, b) => a.time - b.time);
    onUpdate(updatedCues);
    setEditingId(updatedCues.length - 1);
  }, [currentTime, cuePoints, getNextAvailableKey, sampleRate, calculateSamplePosition, onUpdate]);

  // Update cue point
  const updateCue = useCallback((index, field, value) => {
    const updatedCues = [...cuePoints];
    const cue = { ...updatedCues[index] };
    
    if (field === 'time') {
      const timeValue = parseTime(value);
      cue.time = timeValue;
      cue.sample_position = calculateSamplePosition(timeValue);
    } else {
      cue[field] = value;
    }
    
    updatedCues[index] = cue;
    
    // Validate and set errors
    const errors = validateCue(cue, index);
    setValidationErrors(prev => ({
      ...prev,
      [index]: errors
    }));
    
    // Only update if no errors
    if (Object.keys(errors).length === 0) {
      // Re-sort by time if time was changed
      if (field === 'time') {
        updatedCues.sort((a, b) => a.time - b.time);
      }
      onUpdate(updatedCues);
    }
  }, [cuePoints, parseTime, calculateSamplePosition, validateCue, onUpdate]);

  // Delete cue point
  const deleteCue = useCallback((index) => {
    const updatedCues = cuePoints.filter((_, i) => i !== index);
    onUpdate(updatedCues);
    setEditingId(null);
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  }, [cuePoints, onUpdate]);

  // Save cues to JSON file
  const saveCuesToJSON = useCallback(() => {
    const dataStr = JSON.stringify(cuePoints, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `cue-points-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [cuePoints]);

  // Load cues from JSON file
  const loadCuesFromJSON = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loadedCues = JSON.parse(e.target.result);
        
        // Validate structure
        if (!Array.isArray(loadedCues)) {
          throw new Error('Invalid format: expected array of cue points');
        }
        
        // Validate each cue point
        const validCues = loadedCues.map((cue, index) => {
          if (typeof cue.time !== 'number' || !cue.label) {
            throw new Error(`Invalid cue at index ${index}: missing time or label`);
          }
          
          return {
            time: cue.time,
            label: cue.label,
            key: cue.key || '',
            sample_rate: cue.sample_rate || sampleRate,
            sample_position: cue.sample_position || calculateSamplePosition(cue.time)
          };
        });
        
        // Sort by time
        validCues.sort((a, b) => a.time - b.time);
        
        onUpdate(validCues);
        setValidationErrors({});
        setEditingId(null);
        
        console.log('Loaded cue points:', validCues);
      } catch (error) {
        alert(`Failed to load cue points: ${error.message}`);
      }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }, [sampleRate, calculateSamplePosition, onUpdate]);

  // Handle drag and drop for reordering
  const handleDragStart = useCallback((e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const updatedCues = [...cuePoints];
    const draggedCue = updatedCues[draggedIndex];
    
    // Remove from old position
    updatedCues.splice(draggedIndex, 1);
    
    // Insert at new position
    const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    updatedCues.splice(adjustedDropIndex, 0, draggedCue);
    
    onUpdate(updatedCues);
    setDraggedIndex(null);
  }, [draggedIndex, cuePoints, onUpdate]);

  return (
    <div className="cue-point-editor">
      <div className="cue-header">
        <h3 className="text-lg font-semibold mb-4">Cue Points ({cuePoints.length})</h3>
        
        <div className="cue-actions flex gap-2 mb-4">
          <button
            onClick={addCue}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            + Add Cue
          </button>
          
          <button
            onClick={saveCuesToJSON}
            disabled={cuePoints.length === 0}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-sm"
          >
            💾 Save JSON
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
          >
            📁 Load JSON
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={loadCuesFromJSON}
            className="hidden"
          />
        </div>
      </div>

      <div className="cue-list space-y-2 max-h-96 overflow-y-auto">
        {cuePoints.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No cue points yet. Click &quot;Add Cue&quot; to create your first cue point.
          </div>
        ) : (
          cuePoints.map((cue, index) => {
            const isEditing = editingId === index;
            const errors = validationErrors[index] || {};
            const hasErrors = Object.keys(errors).length > 0;

            return (
              <div
                key={`${cue.time}-${index}`}
                className={`cue-item p-3 border rounded ${
                  hasErrors ? 'border-red-300 bg-red-50' : 'border-gray-200'
                } ${isEditing ? 'bg-blue-50' : 'bg-white'}`}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8">#{index + 1}</span>
                  
                  {/* Time Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={isEditing ? cue.time : formatTime(cue.time)}
                      onChange={(e) => updateCue(index, 'time', e.target.value)}
                      onFocus={() => setEditingId(index)}
                      onBlur={() => setEditingId(null)}
                      className={`w-full px-2 py-1 text-sm border rounded ${
                        errors.time ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="MM:SS.mmm"
                    />
                    {errors.time && (
                      <div className="text-red-500 text-xs mt-1">{errors.time}</div>
                    )}
                  </div>

                  {/* Label Input */}
                  <div className="flex-2">
                    <input
                      type="text"
                      value={cue.label}
                      onChange={(e) => updateCue(index, 'label', e.target.value)}
                      className={`w-full px-2 py-1 text-sm border rounded ${
                        errors.label ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Cue label"
                    />
                    {errors.label && (
                      <div className="text-red-500 text-xs mt-1">{errors.label}</div>
                    )}
                  </div>

                  {/* Key Input */}
                  <div className="w-16">
                    <input
                      type="text"
                      value={cue.key || ''}
                      onChange={(e) => updateCue(index, 'key', e.target.value.slice(0, 1))}
                      maxLength={1}
                      className={`w-full px-2 py-1 text-sm border rounded text-center ${
                        errors.key ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="K"
                      title="Keyboard shortcut (single character)"
                    />
                    {errors.key && (
                      <div className="text-red-500 text-xs mt-1 whitespace-nowrap">{errors.key}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => deleteCue(index)}
                    className="px-2 py-1 text-red-500 hover:bg-red-100 rounded text-sm"
                    title="Delete cue point"
                  >
                    🗑️
                  </button>
                </div>

                {/* Sample Position Info */}
                {cue.sample_position && (
                  <div className="text-xs text-gray-500 mt-1 ml-10">
                    Sample: {cue.sample_position.toLocaleString()} @ {cue.sample_rate || sampleRate}Hz
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>



      {/* Usage Instructions */}
      <div className="cue-help mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
        <strong>Usage:</strong>
        <ul className="mt-1 space-y-1">
          <li>• Click &quot;Add Cue&quot; to create a cue point at current time</li>
          <li>• Enter time as MM:SS.mmm (e.g., 1:23.500) or seconds (83.5)</li>
          <li>• Assign single-character keys (1-9, a-z) for keyboard shortcuts</li>
          <li>• Drag rows to reorder • Save/Load as JSON for persistence</li>
        </ul>
      </div>
    </div>
  );
};

export default CuePointEditor; 
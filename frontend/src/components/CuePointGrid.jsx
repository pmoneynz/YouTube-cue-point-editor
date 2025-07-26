import { useCallback } from 'react';

/**
 * CuePointGrid component for managing cue points in a grid layout
 * 
 * @param {Object} props
 * @param {Array} props.cuePoints - Array of cue point objects
 * @param {Function} props.onCueClick - Callback when a cue point is clicked
 * @param {Function} props.onJumpToCue - Callback to jump to a specific cue time
 * @param {Object} props.activeCue - Currently active cue point
 * @param {number} props.currentTime - Current playback time
 * @param {Function} props.onAddCue - Callback to add a new cue point
 * @param {Function} props.onClearAll - Callback to clear all cue points
 * @param {number} props.maxCueSlots - Maximum number of cue slots (default: 16)
 */
const CuePointGrid = ({
  cuePoints = [],
  onCueClick,
  onJumpToCue,
  activeCue = null,
  currentTime = 0,
  onAddCue,
  onClearAll,
  maxCueSlots = 16
}) => {
  // Format time for display
  const formatTime = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Get key for specific slot position based on 4x4 grid layout
  const getKeyForSlot = useCallback((slotIndex) => {
    // First row (slots 0-3): keys 1,2,3,4
    if (slotIndex < 4) {
      return (slotIndex + 1).toString();
    }
    // Second row (slots 4-7): keys Q,W,E,R
    else if (slotIndex < 8) {
      const secondRowKeys = ['Q', 'W', 'E', 'R'];
      return secondRowKeys[slotIndex - 4];
    }
    // Third row (slots 8-11): keys A,S,D,F
    else if (slotIndex < 12) {
      const thirdRowKeys = ['A', 'S', 'D', 'F'];
      return thirdRowKeys[slotIndex - 8];
    }
    // Fourth row (slots 12-15): keys Z,X,C,V
    else {
      const fourthRowKeys = ['Z', 'X', 'C', 'V'];
      return fourthRowKeys[slotIndex - 12] || (slotIndex + 1).toString();
    }
  }, []);

  // Handle adding a cue at current time
  const handleAddCueAtCurrentTime = useCallback(() => {
    if (!onAddCue) return;
    
    // Find the first empty slot
    const firstEmptySlot = Array.from({ length: maxCueSlots }, (_, i) => i)
      .find(slotIndex => !cuePoints[slotIndex]);
    
    if (firstEmptySlot === undefined) return; // No empty slots
    
    const newCue = {
      time: currentTime,
      label: `Cue ${firstEmptySlot + 1}`,
      key: getKeyForSlot(firstEmptySlot),
      sample_rate: 48000,
      sample_position: Math.round(currentTime * 48000)
    };
    
    onAddCue(newCue);
  }, [currentTime, cuePoints, maxCueSlots, getKeyForSlot, onAddCue]);

  // Handle adding a cue at specific slot
  const handleAddCueAtSlot = useCallback((slotIndex) => {
    if (!onAddCue) return;
    
    const newCue = {
      time: currentTime,
      label: `Cue ${slotIndex + 1}`,
      key: getKeyForSlot(slotIndex),
      sample_rate: 48000,
      sample_position: Math.round(currentTime * 48000)
    };
    
    onAddCue(newCue);
  }, [currentTime, getKeyForSlot, onAddCue]);

  return (
    <div className="cue-point-grid bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-lg font-semibold">
          {cuePoints.length} cue point{cuePoints.length !== 1 ? 's' : ''}
        </h3>
        {onAddCue && (
          <button
            onClick={handleAddCueAtCurrentTime}
            disabled={cuePoints.length >= maxCueSlots}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
            title="Add cue at current time"
          >
            + Add Cue
          </button>
        )}
      </div>

      {/* 4x4 Grid matching the image layout */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: maxCueSlots }, (_, slotIndex) => {
          const cue = cuePoints[slotIndex];
          const isEmpty = !cue;
          const isActive = activeCue && cue && activeCue.time === cue.time;
          
          if (isEmpty) {
            // Empty slot - clickable to add cue
            return (
              <div
                key={`empty-${slotIndex}`}
                onClick={onAddCue ? () => handleAddCueAtSlot(slotIndex) : undefined}
                className={`flex flex-col items-center justify-center p-2 rounded aspect-[2/1] transition-colors ${
                  onAddCue 
                    ? 'bg-gray-700 hover:bg-gray-600 cursor-pointer border-2 border-dashed border-gray-600 hover:border-gray-500' 
                    : 'bg-gray-800'
                }`}
                title={onAddCue ? `Click to add cue point at current time (Key: ${getKeyForSlot(slotIndex)})` : "Empty cue slot"}
              >
                <div className="text-lg font-bold text-gray-500 mb-0.5">
                  {getKeyForSlot(slotIndex)}
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {onAddCue ? "+" : "---"}
                </div>
                {onAddCue && (
                  <div className="text-gray-500 text-xs mt-0.5 text-center">
                    {formatTime(currentTime)}
                  </div>
                )}
              </div>
            );
          }

          // Existing cue point
          return (
            <div
              key={`cue-${cue.time}-${slotIndex}`}
              onClick={() => {
                if (onCueClick) onCueClick(cue);
                if (onJumpToCue) onJumpToCue(cue.time);
              }}
              className={`flex flex-col items-center justify-center p-2 rounded aspect-[2/1] cursor-pointer transition-colors ${
                isActive 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={`${cue.label} - ${formatTime(cue.time)} - Key: ${cue.key || 'None'}`}
            >
              <div className="text-lg font-bold text-center">
                {cue.key || slotIndex + 1}
              </div>
              <div className="text-xs font-mono mt-0.5">
                {formatTime(cue.time)}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Clear All Button */}
      {cuePoints.length > 0 && onClearAll && (
        <div className="flex justify-end mt-4">
          <button
            onClick={onClearAll}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm flex items-center justify-center"
          >
            Clear All
          </button>
        </div>
      )}
      
      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-400">
        {onAddCue ? (
          <>
            Click empty slots to add cue points at current time ({formatTime(currentTime)})
            {cuePoints.length > 0 && " • Click existing cues to jump to position"}
          </>
        ) : (
          cuePoints.length > 0 && "Click cue points to jump to position"
        )}
      </div>
    </div>
  );
};

export default CuePointGrid; 
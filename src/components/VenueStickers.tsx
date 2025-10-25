import React, { useState, useEffect } from 'react';

interface StickerMeaning {
  id: string;
  color: string;
  label: string;
  details: string | null;
}

interface VenueSticker {
  id: string;
  sticker_meaning_id: string;
  color: string;
  label: string;
  details: string | null;
}

interface VenueStickersProps {
  venueId: string;
  stickerMeanings: StickerMeaning[];
  initialStickers?: VenueSticker[];
  onStickersChange?: () => void;
}

export default function VenueStickers({ venueId, stickerMeanings, initialStickers = [], onStickersChange }: VenueStickersProps) {
  const [venueStickers, setVenueStickers] = useState<VenueSticker[]>(initialStickers);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // Update stickers when initialStickers changes
  useEffect(() => {
    setVenueStickers(initialStickers);
  }, [initialStickers]);

  const handleAssignSticker = async (stickerMeaningId: string) => {
    try {
      const response = await fetch(`/api/venues/${venueId}/stickers/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sticker_meaning_id: stickerMeaningId })
      });

      if (response.ok) {
        setShowAssignDialog(false);
        onStickersChange?.();
      } else {
        const errorData = await response.json();
        console.error('Failed to assign sticker:', errorData.error);
      }
    } catch (error) {
      console.error('Failed to assign sticker:', error);
    }
  };

  const handleUnassignSticker = async (stickerMeaningId: string) => {
    try {
      const response = await fetch(`/api/venues/${venueId}/stickers/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sticker_meaning_id: stickerMeaningId })
      });

      if (response.ok) {
        onStickersChange?.();
      } else {
        const errorData = await response.json();
        console.error('Failed to unassign sticker:', errorData.error);
      }
    } catch (error) {
      console.error('Failed to unassign sticker:', error);
    }
  };

  const getAvailableStickers = () => {
    const assignedIds = new Set(venueStickers.map(s => s.sticker_meaning_id));
    return stickerMeanings.filter(meaning => !assignedIds.has(meaning.id));
  };

  return (
    <div className="flex items-center gap-1 p-2 flex-wrap">
      {/* Assigned stickers */}
      {venueStickers.map((sticker) => (
        <div
          key={sticker.id}
          className="relative flex items-center px-2 py-1 rounded text-xs font-medium"
          style={{ backgroundColor: sticker.color, fontSize: '0.75rem' }}
          title={sticker.details || sticker.label}
        >
          <span>{sticker.label}</span>
          <button
            onClick={() => handleUnassignSticker(sticker.sticker_meaning_id)}
            className="ml-1 text-red-600 hover:text-red-800 font-bold text-sm leading-none"
            style={{ fontSize: '0.6rem', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}

      {/* Add sticker button */}
      {getAvailableStickers().length > 0 && (
        <button
          onClick={() => setShowAssignDialog(true)}
          className="flex items-center justify-center w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-gray-600 text-sm font-bold"
          title="Add sticker"
        >
          +
        </button>
      )}

      {/* Assignment Dialog */}
      {showAssignDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="fixed inset-0"
            onClick={() => setShowAssignDialog(false)}
          />
          <div className="bg-white rounded-lg p-4 max-w-md relative z-51">
            <h4 className="text-lg font-semibold mb-3">Add Sticker to Venue</h4>
            <div className="grid grid-cols-2 gap-2">
              {getAvailableStickers().map((meaning) => (
                <button
                  key={meaning.id}
                  onClick={() => handleAssignSticker(meaning.id)}
                  className="flex items-center px-3 py-2 rounded text-sm hover:opacity-80 border"
                  style={{ backgroundColor: meaning.color }}
                  title={meaning.details || meaning.label}
                >
                  {meaning.label}
                </button>
              ))}
            </div>
            {getAvailableStickers().length === 0 && (
              <p className="text-gray-500 text-sm">No more stickers available to assign.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

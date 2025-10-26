import React, { useState, useEffect } from 'react';

interface VenueSticker {
  id: string;
  sticker_meaning_id: string;
  color: string;
  label: string;
  details: string | null;
}

interface VenueStickersProps {
  venueId: string;
  refreshSignal?: number;
}

export default function VenueStickers({ venueId, refreshSignal }: VenueStickersProps) {
  const [venueStickers, setVenueStickers] = useState<VenueSticker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenueStickers();
  }, [venueId, refreshSignal]);

  const loadVenueStickers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/venues/${venueId}/stickers`);
      if (response.ok) {
        const data = await response.json();
        setVenueStickers(data.stickers || []);
      }
    } catch (error) {
      console.error('Failed to load venue stickers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1 p-2 flex-wrap">
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-2 flex-wrap">
      {venueStickers.map((sticker) => (
        <div
          key={sticker.id}
          className="flex items-center px-2 py-1 rounded text-xs font-medium"
          style={{ backgroundColor: sticker.color, fontSize: '0.75rem' }}
          title={sticker.details || sticker.label}
        >
          <span>{sticker.label}</span>
        </div>
      ))}
    </div>
  );
}

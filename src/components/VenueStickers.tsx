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
  initialStickers?: VenueSticker[];
}

export default function VenueStickers({ venueId, refreshSignal, initialStickers }: VenueStickersProps) {
  const [venueStickers, setVenueStickers] = useState<VenueSticker[]>(initialStickers || []);
  const [loading, setLoading] = useState<boolean>(!initialStickers);

  useEffect(() => {
    // If initialStickers provided and this is the initial render (refreshSignal is falsy/0), use them and skip fetch
    const isInitial = typeof refreshSignal === 'undefined' || refreshSignal === 0;
    if (initialStickers && isInitial) {
      console.debug(`VenueStickers: initialStickers provided for venue ${venueId}, using them (refreshSignal=${refreshSignal})`);
      setVenueStickers(initialStickers);
      setLoading(false);
      return;
    }
    // Otherwise (including when refreshSignal increments), fetch latest stickers for the venue
    console.debug(`VenueStickers: refreshSignal changed for venue ${venueId} -> ${refreshSignal}, loading stickers`);
    loadVenueStickers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, refreshSignal, initialStickers]);

  const loadVenueStickers = async () => {
    try {
      console.debug('VenueStickers: fetching stickers for venue', venueId);
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
      <div className="flex items-center gap-1 p-0 flex-wrap">
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-0 flex-wrap">
      {venueStickers.map((sticker) => (
        <div
          key={sticker.id}
          className="flex items-center font-medium"
          style={{
            backgroundColor: sticker.color,
            fontSize: '14px',
            padding: '5px',
            borderRadius: '5px',
            margin: '0 4px 4px 0'
          }}
          title={sticker.details || sticker.label}
        >
          <span>{sticker.label}</span>
        </div>
      ))}
    </div>
  );
}

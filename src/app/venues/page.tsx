'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VenueModal from '@/components/VenueModal';
import VenueStickers from '@/components/VenueStickers';
import { useVenueStore } from '@/lib/store/venueStore';

interface Venue {
  id: string;
  name: string;
  type: string;
  locality: string;
  region_code: string;
  address?: string;
  public_transit?: string;
  website_url?: string;
  map_link?: string;
  artist_summary?: string;
  visitor_summary?: string;
  facebook?: string;
  instagram?: string;
  created_at: string;
  user_note?: {
    id: string;
    body: string;
  } | null;
  user_stickers?: Array<{
    id: string;
    sticker_meaning_id: string;
    color: string;
    label: string;
    details: string | null;
  }>;
}

interface VenuesResponse {
  venues: Venue[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface UserVenueData {
  notes: string;
  noteId?: string;
}

export default function VenuesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    locality: '',
    type: '',
    public_transit: '',
  });

  // per-venue refresh signals: increment a venue's counter to tell its row to refresh
  const [stickerRefreshSignals, setStickerRefreshSignals] = useState<Record<string, number>>({});

  const [userVenueData, setUserVenueData] = useState<{[venueId: string]: UserVenueData}>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState<{[venueId: string]: boolean}>({});
  const noteTimeouts = useRef<{[venueId: string]: NodeJS.Timeout}>({});

  // Infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingMore = useRef(false);

  // Full venue data for modal (includes contact info)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [loadingVenue, setLoadingVenue] = useState(false);

  const { selectedVenueId, openModal, closeModal } = useVenueStore();

  const fetchVenues = async (page = 1, search = '', filterParams = filters, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      }
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '10', // Chunk size for infinite scroll
        ...(search && { q: search }),
        ...(filterParams.locality && { locality: filterParams.locality }),
        ...(filterParams.type && { type: filterParams.type }),
        ...(filterParams.public_transit && { public_transit: filterParams.public_transit }),
      });

      const response = await fetch(`/api/venues?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch venues');
      }

      const data: VenuesResponse = await response.json();

      if (append) {
        setVenues(prev => [...prev, ...data.venues]);
      } else {
        setVenues(data.venues);
      }

      setCurrentPage(data.page);
      setHasMore(data.has_next);
      setError(null);

      // Load user notes from the venue data (already included via JOIN)
      const newUserVenueData: {[venueId: string]: UserVenueData} = {};
      data.venues.forEach(venue => {
        newUserVenueData[venue.id] = {
          notes: venue.user_note?.body || '',
          noteId: venue.user_note?.id
        };
      });

      if (append) {
        setUserVenueData(prev => ({ ...prev, ...newUserVenueData }));
      } else {
        setUserVenueData(newUserVenueData);
      }
    } catch (err) {
      setError('Failed to load venues');
      console.error('Error fetching venues:', err);
    } finally {
      setLoading(false);
      loadingMore.current = false;
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  // Fetch full venue data when modal opens
  useEffect(() => {
    if (selectedVenueId) {
      const fetchFullVenue = async () => {
        setLoadingVenue(true);
        try {
          const response = await fetch(`/api/venues/${selectedVenueId}`);
          if (response.ok) {
            const data = await response.json();
            setSelectedVenue(data);
          } else {
            console.error('Failed to fetch full venue data');
            // Fallback to list data
            const venueFromList = venues.find(v => v.id === selectedVenueId);
            setSelectedVenue(venueFromList || null);
          }
        } catch (error) {
          console.error('Error fetching venue:', error);
          // Fallback to list data
          const venueFromList = venues.find(v => v.id === selectedVenueId);
          setSelectedVenue(venueFromList || null);
        } finally {
          setLoadingVenue(false);
        }
      };
      fetchFullVenue();
    } else {
      setSelectedVenue(null);
    }
  }, [selectedVenueId, venues]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore.current) {
          loadingMore.current = true;
          fetchVenues(currentPage + 1, searchQuery, filters, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, currentPage, searchQuery, filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, false);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, newFilters, false);
  };

  const handleVenueClick = (venueId: string) => {
    openModal(venueId);
    router.push(`/venues?id=${venueId}`, { scroll: false });
  };

  const handleCloseModal = () => {
    closeModal();
    router.push('/venues', { scroll: false });
  };

  const handleNoteSaved = (venueId: string, noteBody: string, noteId?: string) => {
    // Update the local venues state immediately to show the note in the table
    setVenues(prevVenues =>
      prevVenues.map(venue =>
        venue.id === venueId
          ? {
              ...venue,
              user_note: noteBody.trim()
                ? { id: noteId || venue.user_note?.id || '', body: noteBody }
                : null
            }
          : venue
      )
    );

    // Also update the userVenueData state for consistency
    setUserVenueData(prevData => ({
      ...prevData,
      [venueId]: {
        notes: noteBody,
        noteId: noteId
      }
    }));
  };

  const handleNotesChange = (venueId: string, notes: string) => {
    setUserVenueData(prev => ({
      ...prev,
      [venueId]: {
        ...prev[venueId],
        notes
      }
    }));

    if (noteTimeouts.current[venueId]) {
      clearTimeout(noteTimeouts.current[venueId]);
    }

    noteTimeouts.current[venueId] = setTimeout(() => {
      saveNotes(venueId, notes);
    }, 500);
  };

  const saveNotes = async (venueId: string, noteBody: string) => {
    setSavingNotes(prev => ({ ...prev, [venueId]: true }));
    try {
      const response = await fetch(`/api/venues/${venueId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: noteBody }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserVenueData(prev => ({
          ...prev,
          [venueId]: {
            notes: data.note?.body || '',
            noteId: data.note?.id
          }
        }));

        // Refocus the textarea after saving if it's still being edited
        setTimeout(() => {
          if (editingNote === venueId) {
            const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
            if (textarea) {
              textarea.focus();
              textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
          }
        }, 50);
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setSavingNotes(prev => ({ ...prev, [venueId]: false }));
    }
  };

  const renderNotesCell = (venueId: string) => {
    const venueData = userVenueData[venueId];
    if (!venueData || !venueData.notes) return null;

    const isSaving = savingNotes[venueId];

    return (
      <div className="p-2 relative">
        <div className="text-sm text-gray-700 truncate" style={{ maxWidth: '200px' }}>
          {venueData.notes}
        </div>
        {isSaving && (
          <div className="absolute top-1 right-1 text-xs text-gray-500">Saving...</div>
        )}
      </div>
    );
  };

  if (loading && venues.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 font-sans">
        <div className="text-center">Loading venues...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Art Venues</h1>

        <div className="mb-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search venues..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap gap-4">
            <select
              value={filters.locality}
              onChange={(e) => handleFilterChange('locality', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Localities</option>
              <option value="Jamaica Plain">Jamaica Plain</option>
              <option value="Somerville">Somerville</option>
              <option value="Cambridge">Cambridge</option>
              <option value="South End">South End</option>
              <option value="North End">North End</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Types</option>
              <option value="gallery - commercial">Gallery - Commercial</option>
              <option value="gallery - non-profit">Gallery - Non-profit</option>
              <option value="library">Library</option>
              <option value="cafe-restaurant">Cafe/Restaurant</option>
              <option value="association">Association</option>
              <option value="market">Market</option>
              <option value="store">Store</option>
              <option value="online">Online</option>
              <option value="open studios">Open Studios</option>
              <option value="public art">Public Art</option>
              <option value="other">Other</option>
            </select>

            <select
              value={filters.public_transit}
              onChange={(e) => handleFilterChange('public_transit', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Transit Access</option>
              <option value="yes">Yes</option>
              <option value="partial">Partial</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="overflow-x-auto border border-gray-300 rounded-lg">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="p-2 text-left font-semibold border-r border-gray-300">Stickers</th>
                <th className="p-2 text-left font-semibold border-r border-gray-300">Notes</th>
                <th className="p-2 text-left font-semibold border-r border-gray-300">Name</th>
                <th className="p-2 text-left font-semibold border-r border-gray-300">Type</th>
                <th className="p-2 text-left font-semibold border-r border-gray-300">Locality</th>
                <th className="p-2 text-left font-semibold border-r border-gray-300">Artist Summary</th>
                <th className="p-2 text-left font-semibold border-r border-gray-300">Visitor Summary</th>
                <th className="p-2 text-left font-semibold">Public Transit</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((venue, index) => (
                <tr
                  key={venue.id}
                  className={index % 2 === 0 ? 'bg-green-50' : 'bg-white'}
                >
                  <td className="p-0 border-r border-gray-200" style={{ minWidth: '120px', maxWidth: '200px' }}>
                    <VenueStickers
                      venueId={venue.id}
                      refreshSignal={stickerRefreshSignals[venue.id] || 0}
                      initialStickers={venue.user_stickers}
                    />
                  </td>
                  <td className="p-0 border-r border-gray-200" style={{ minWidth: '100px', maxWidth: '300px' }}>
                    {renderNotesCell(venue.id)}
                  </td>
                  <td
                    className="p-2 border-r border-gray-200 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    onClick={() => handleVenueClick(venue.id)}
                    style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
                  >
                    {venue.name}
                  </td>
                  <td className="p-2 border-r border-gray-200">{venue.type}</td>
                  <td className="p-2 border-r border-gray-200">{venue.locality}</td>
                  <td className="p-2 border-r border-gray-200" style={{ maxWidth: '250px' }}>
                    <div className="truncate">{venue.artist_summary}</div>
                  </td>
                  <td className="p-2 border-r border-gray-200" style={{ maxWidth: '250px' }}>
                    <div className="truncate">{venue.visitor_summary}</div>
                  </td>
                  <td className="p-2">{venue.public_transit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
          {loadingMore.current && hasMore && (
            <div className="text-gray-500 text-sm">Loading more venues...</div>
          )}
          {!hasMore && venues.length > 0 && (
            <div className="text-gray-400 text-sm">No more venues to load</div>
          )}
        </div>
      </div>

      {selectedVenue && (
        <VenueModal
          venue={selectedVenue}
          onClose={handleCloseModal}
          onNoteSaved={handleNoteSaved}
          onStickerUpdate={(venueId: string) => {
            try {
              console.debug('VenuesPage: received onStickerUpdate for', venueId);
            } catch (e) {}
            setStickerRefreshSignals(prev => ({ ...prev, [venueId]: (prev[venueId] || 0) + 1 }));
          }}
        />
      )}
    </div>
  );
}

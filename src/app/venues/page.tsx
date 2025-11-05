'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VenueModal from '@/components/VenueModal';
import VenueStickers from '@/components/VenueStickers';
import LocalityPickerModal from '@/components/LocalityPickerModal';
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

  // Locality picker state
  const [localities, setLocalities] = useState<Array<{id: string, name: string}>>([]);
  const [selectedLocalities, setSelectedLocalities] = useState<string[]>([]);
  const [showLocalityPicker, setShowLocalityPicker] = useState(false);

  // Sticker filter state
  const [stickerMeanings, setStickerMeanings] = useState<Array<{id: string, color: string, label: string, details: string | null}>>([]);
  const [selectedStickerFilters, setSelectedStickerFilters] = useState<string[]>([]); // Array of sticker_meaning_id

  // per-venue refresh signals: increment a venue's counter to tell its row to refresh
  const [stickerRefreshSignals, setStickerRefreshSignals] = useState<Record<string, number>>({});

  const [userVenueData, setUserVenueData] = useState<{[venueId: string]: UserVenueData}>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState<{[venueId: string]: boolean}>({});
  const noteTimeouts = useRef<{[venueId: string]: NodeJS.Timeout}>({});

  // Text tooltip state for hover/click on name, artist_summary, visitor_summary
  const [hoveredCell, setHoveredCell] = useState<{content: React.ReactNode, x: number, y: number} | null>(null);
  const [clickedCell, setClickedCell] = useState<{content: React.ReactNode, x: number, y: number} | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Venue images state
  const [venueImages, setVenueImages] = useState<Record<string, Array<{id: string, url: string}>>>({});

  // Infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingMore = useRef(false);

  // Scrollbar sync refs
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  // Full venue data for modal (includes contact info)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [loadingVenue, setLoadingVenue] = useState(false);

  const { selectedVenueId, openModal, closeModal } = useVenueStore();

  const fetchVenues = async (page = 1, search = '', filterParams = filters, stickerFilters = selectedStickerFilters, localityFilters = selectedLocalities, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      }
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '10', // Chunk size for infinite scroll
        ...(search && { q: search }),
        ...(filterParams.type && { type: filterParams.type }),
        ...(filterParams.public_transit && { public_transit: filterParams.public_transit }),
      });

      // Add locality filters (multiple)
      if (localityFilters.length > 0) {
        params.append('localities', localityFilters.join(','));
      }

      // Add sticker filters
      if (stickerFilters.length > 0) {
        params.append('sticker_ids', stickerFilters.join(','));
      }

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
    loadStickerMeanings();
    loadLocalities();
  }, []);

  const loadLocalities = async () => {
    try {
      const response = await fetch('/api/localities');
      if (response.ok) {
        const data = await response.json();
        setLocalities(data.localities || []);
      }
    } catch (err) {
      console.error('Failed to load localities:', err);
    }
  };

  const loadStickerMeanings = async () => {
    try {
      const response = await fetch('/api/stickers/meanings');
      if (response.ok) {
        const data = await response.json();
        setStickerMeanings(data.meanings || []);
      }
    } catch (err) {
      console.error('Failed to load sticker meanings:', err);
    }
  };

  // Handle clicking outside tooltip to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clickedCell && tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setClickedCell(null);
      }
    };

    if (clickedCell) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [clickedCell]);

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
          fetchVenues(currentPage + 1, searchQuery, filters, selectedStickerFilters, selectedLocalities, true);
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

  // Sync scrollbars
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const mainScroll = mainScrollRef.current;
    const bottomScroll = bottomScrollRef.current;

    if (!topScroll || !mainScroll || !bottomScroll) return;

    const syncScroll = (source: HTMLDivElement, targets: HTMLDivElement[]) => {
      return () => {
        targets.forEach(target => {
          if (target !== source) {
            target.scrollLeft = source.scrollLeft;
          }
        });
      };
    };

    const topListener = syncScroll(topScroll, [mainScroll, bottomScroll]);
    const mainListener = syncScroll(mainScroll, [topScroll, bottomScroll]);
    const bottomListener = syncScroll(bottomScroll, [topScroll, mainScroll]);

    topScroll.addEventListener('scroll', topListener);
    mainScroll.addEventListener('scroll', mainListener);
    bottomScroll.addEventListener('scroll', bottomListener);

    return () => {
      topScroll.removeEventListener('scroll', topListener);
      mainScroll.removeEventListener('scroll', mainListener);
      bottomScroll.removeEventListener('scroll', bottomListener);
    };
  }, [venues]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, selectedLocalities, false);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, newFilters, selectedStickerFilters, selectedLocalities, false);
  };

  const handleStickerFilterToggle = (stickerMeaningId: string) => {
    const newSelectedFilters = selectedStickerFilters.includes(stickerMeaningId)
      ? selectedStickerFilters.filter(id => id !== stickerMeaningId)
      : [...selectedStickerFilters, stickerMeaningId];

    setSelectedStickerFilters(newSelectedFilters);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, newSelectedFilters, selectedLocalities, false);
  };

  const handleLocalityToggle = (localityName: string) => {
    const newSelectedLocalities = selectedLocalities.includes(localityName)
      ? selectedLocalities.filter(name => name !== localityName)
      : [...selectedLocalities, localityName];

    setSelectedLocalities(newSelectedLocalities);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, newSelectedLocalities, false);
  };

  const handleClearLocalities = () => {
    setSelectedLocalities([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, [], false);
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

  const handleCellHover = (event: React.MouseEvent<HTMLElement>, content: React.ReactNode) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredCell({
      content,
      x: rect.left + 15,
      y: rect.top + 10
    });
  };

  const handleCellClick = (event: React.MouseEvent<HTMLElement>, content: React.ReactNode) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setClickedCell({
      content,
      x: rect.left + 15,
      y: rect.top + 10
    });
    setHoveredCell(null); // Clear hover when clicked
  };

  const loadVenueImages = async (venueId: string) => {
    if (venueImages[venueId]) return; // Already loaded
    try {
      const response = await fetch(`/api/venues/${venueId}/images`);
      if (response.ok) {
        const data = await response.json();
        setVenueImages(prev => ({
          ...prev,
          [venueId]: data.images || []
        }));
      }
    } catch (err) {
      console.error('Failed to load images for venue:', venueId, err);
    }
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

  const renderStickersNotesArtworkTooltip = (venue: Venue, venueId: string): React.ReactNode => {
    const venueData = userVenueData[venueId];
    const images = venueImages[venueId] || [];

    return (
      <div
        onClick={() => handleVenueClick(venueId)}
        style={{ cursor: 'pointer' }}
      >
        {/* Stickers */}
        {venue.user_stickers && venue.user_stickers.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <strong>Stickers:</strong> {venue.user_stickers.map(s => s.label).join(', ')}
          </div>
        )}

        {/* Notes */}
        {venueData?.notes && (
          <div style={{ marginBottom: '8px' }}>
            <strong>Notes:</strong> {venueData.notes}
          </div>
        )}

        {/* Artwork - 100px thumbnails in tooltip */}
        {images.length > 0 && (
          <div>
            <strong>Artwork:</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {images.map((image) => (
                <img
                  key={image.id}
                  src={image.url}
                  alt="Artwork"
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb'
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {!venue.user_stickers?.length && !venueData?.notes && images.length === 0 && (
          <div>No stickers, notes, or artwork</div>
        )}

        {/* Instruction text */}
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
          <em style={{ fontSize: '13px', color: '#6b7280' }}>
            (Click to open venue details)
          </em>
        </div>
      </div>
    );
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
    <div className="container mx-auto px-4 py-8 font-sans" style={{ margin: '2rem' }}>
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
            <button
              onClick={() => setShowLocalityPicker(true)}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <span>
                {selectedLocalities.length === 0
                  ? 'All Localities'
                  : selectedLocalities.length === 1
                  ? '1 Locality Selected'
                  : `${selectedLocalities.length} Localities Selected`}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

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

        {/* Sticker Filters Section */}
        <div className="mb-6 p-4 bg-white border border-gray-300 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Select stickers to filter by:</h3>

          {/* Available filters (top row) */}
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-600 mb-2">Available stickers:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {stickerMeanings.filter(meaning => !selectedStickerFilters.includes(meaning.id)).map((meaning) => (
                <div
                  key={meaning.id}
                  onClick={() => handleStickerFilterToggle(meaning.id)}
                  style={{
                    backgroundColor: meaning.color,
                    fontSize: '14px',
                    padding: '5px',
                    borderRadius: '5px',
                    margin: '4px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    border: '2px solid transparent',
                    transition: 'border-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                  title={meaning.details || meaning.label}
                >
                  {meaning.label}
                </div>
              ))}
              {stickerMeanings.filter(meaning => !selectedStickerFilters.includes(meaning.id)).length === 0 && (
                <div className="text-gray-500 text-sm italic">All stickers selected</div>
              )}
            </div>
          </div>

          {/* Selected filters (bottom row) */}
          <div>
            <div className="text-sm font-medium text-gray-600 mb-2">Selected stickers:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {stickerMeanings.filter(meaning => selectedStickerFilters.includes(meaning.id)).map((meaning) => (
                <div
                  key={meaning.id}
                  onClick={() => handleStickerFilterToggle(meaning.id)}
                  style={{
                    backgroundColor: meaning.color,
                    fontSize: '14px',
                    padding: '5px',
                    borderRadius: '5px',
                    margin: '4px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    border: '2px solid #3b82f6',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  title={meaning.details || meaning.label}
                >
                  {meaning.label}
                </div>
              ))}
              {selectedStickerFilters.length === 0 && (
                <div className="text-gray-500 text-sm italic">No stickers selected (showing all venues)</div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Top scrollbar */}
        <div ref={topScrollRef} className="overflow-x-auto border border-gray-300 rounded-t-lg" style={{ overflowY: 'hidden' }}>
          <div style={{ width: '2000px', height: '1px' }}></div>
        </div>

        {/* Main table with scrollbar */}
        <div ref={mainScrollRef} className="overflow-x-auto border-l border-r border-b border-gray-300">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="text-left font-semibold" style={{ padding: '5px', borderRight: '1px solid #e0e0e0' }}>Stickers, Notes & Artwork</th>
                <th className="text-left font-semibold" style={{ padding: '5px', minWidth: '300px', maxWidth: '400px', borderRight: '1px solid #e0e0e0' }}>Name</th>
                <th className="text-left font-semibold" style={{ padding: '5px', borderRight: '1px solid #e0e0e0' }}>Type</th>
                <th className="text-left font-semibold" style={{ padding: '5px', borderRight: '1px solid #e0e0e0' }}>Locality</th>
                <th className="text-left font-semibold" style={{ padding: '5px', borderRight: '1px solid #e0e0e0' }}>Artist Summary</th>
                <th className="text-left font-semibold" style={{ padding: '5px', borderRight: '1px solid #e0e0e0' }}>Visitor Summary</th>
                <th className="text-left font-semibold" style={{ padding: '5px' }}>Public Transit</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((venue, index) => (
                <tr
                  key={venue.id}
                  style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f2f3f5' }}
                >
                  <td style={{ padding: '5px', minWidth: '220px', maxWidth: '500px', borderRight: '1px solid #e0e0e0', position: 'relative' }}>
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                      onMouseEnter={(e) => {
                        loadVenueImages(venue.id); // Load images if not already loaded
                        handleCellHover(e, renderStickersNotesArtworkTooltip(venue, venue.id));
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={(e) => {
                        loadVenueImages(venue.id);
                        handleCellClick(e, renderStickersNotesArtworkTooltip(venue, venue.id));
                      }}
                    >
                      <VenueStickers
                        venueId={venue.id}
                        refreshSignal={stickerRefreshSignals[venue.id] || 0}
                        initialStickers={venue.user_stickers}
                      />
                      {renderNotesCell(venue.id)}
                      {/* Artwork thumbnails - 50px max in table cell */}
                      {venueImages[venue.id] && venueImages[venue.id].length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {venueImages[venue.id].map((image) => (
                            <img
                              key={image.id}
                              src={image.url}
                              alt="Artwork"
                              style={{
                                width: '50px',
                                height: '50px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb'
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td
                    className="text-blue-600 hover:text-blue-800 cursor-pointer"
                    style={{ padding: '5px', minWidth: '300px', maxWidth: '400px', fontWeight: 'bold', borderRight: '1px solid #e0e0e0', position: 'relative' }}
                  >
                    <div
                      style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
                      onClick={() => handleVenueClick(venue.id)}
                    >
                      {venue.name}
                    </div>
                  </td>
                  <td style={{ padding: '5px', borderRight: '1px solid #e0e0e0' }}>{venue.type}</td>
                  <td style={{ padding: '5px', borderRight: '1px solid #e0e0e0' }}>{venue.locality}</td>
                  <td style={{ padding: '5px', maxWidth: '250px', borderRight: '1px solid #e0e0e0', position: 'relative' }}>
                    <div
                      className="truncate"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => venue.artist_summary && handleCellHover(e, venue.artist_summary)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={(e) => venue.artist_summary && handleCellClick(e, venue.artist_summary)}
                    >
                      {venue.artist_summary}
                    </div>
                  </td>
                  <td style={{ padding: '5px', maxWidth: '250px', borderRight: '1px solid #e0e0e0', position: 'relative' }}>
                    <div
                      className="truncate"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => venue.visitor_summary && handleCellHover(e, venue.visitor_summary)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={(e) => venue.visitor_summary && handleCellClick(e, venue.visitor_summary)}
                    >
                      {venue.visitor_summary}
                    </div>
                  </td>
                  <td style={{ padding: '5px' }}>{venue.public_transit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom scrollbar */}
        <div ref={bottomScrollRef} className="overflow-x-auto border-l border-r border-b border-gray-300 rounded-b-lg" style={{ overflowY: 'hidden' }}>
          <div style={{ width: '2000px', height: '1px' }}></div>
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

      {/* Text tooltip overlay */}
      {(hoveredCell || clickedCell) && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: (clickedCell || hoveredCell)!.x,
            top: (clickedCell || hoveredCell)!.y,
            backgroundColor: 'white',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '12px 16px',
            minWidth: '200px',
            maxWidth: '500px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 9999,
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#1f2937',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            pointerEvents: clickedCell ? 'auto' : 'none'
          }}
        >
          {(clickedCell || hoveredCell)!.content}
        </div>
      )}

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

      {showLocalityPicker && (
        <LocalityPickerModal
          localities={localities}
          selectedLocalities={selectedLocalities}
          onToggleLocality={handleLocalityToggle}
          onClear={handleClearLocalities}
          onClose={() => setShowLocalityPicker(false)}
        />
      )}
    </div>
  );
}

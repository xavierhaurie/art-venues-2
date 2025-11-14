'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import VenueStickers from 'src/components/VenueStickers';
import VenueModal from "@/components/VenueModal";
import LocalityPickerModal from '@/components/LocalityPickerModal';
import VenueTypePickerModal from '@/components/VenueTypePickerModal';
import StickerPickerModal from '@/components/StickerPickerModal';
import OtherFiltersModal from '@/components/OtherFiltersModal';
import FeedbackModal from '@/components/FeedbackModal';
import { useVenueStore } from '@/lib/store/venueStore';
import { useConfigStore } from '@/lib/store/configStore';

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
  images?: Array<{ id: string; url: string; thumb_url?: string; created_at: string }>;
  images_count?: number;
  user_owned?: boolean;
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
  // Tooltip & hover state (re-added after duplicate cleanup)
  const [hoveredCell, setHoveredCell] = useState<{content: React.ReactNode; x: number; y: number; venueId: string} | null>(null);
  const [clickedCell, setClickedCell] = useState<{content: React.ReactNode; x: number; y: number; venueId: string} | null>(null);
  const [isOverTooltip, setIsOverTooltip] = useState(false);
  const [isOverSource, setIsOverSource] = useState(false);
  const [activeTooltipVenueId, setActiveTooltipVenueId] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const observerTarget = useRef<HTMLDivElement | null>(null);
  const loadingMore = useRef(false);

  // preload global image config early for modals/tooltips
  const { fetchImageConfig } = useConfigStore();
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
  const [transitKnown, setTransitKnown] = useState(false);
  const [imagesPresent, setImagesPresent] = useState(false);
  const [notesPresent, setNotesPresent] = useState(false);
  const [showOtherFilters, setShowOtherFilters] = useState(false);
  // Ownership filter toggles (default both true)
  const [showPublic, setShowPublic] = useState(true);
  const [showMine, setShowMine] = useState(true);
  // Credits total
  const [credits, setCredits] = useState<number | null>(null);
  const [meRole, setMeRole] = useState<string | null>(null);
  const [showCreateVenueModal, setShowCreateVenueModal] = useState(false);
  const [hasNewUnsortedVenue, setHasNewUnsortedVenue] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [feedbackRateLimited, setFeedbackRateLimited] = useState<{ limited: boolean; msg: string }>({ limited: false, msg: '' });

  // Locality picker state
  const [localities, setLocalities] = useState<Array<{id: string, name: string}>>([]);

  // Venue type picker state
  const [venueTypes, setVenueTypes] = useState<Array<{id: string, name: string}>>([]);
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<string[]>([]);
  const [showVenueTypePicker, setShowVenueTypePicker] = useState(false);

  const [selectedLocalities, setSelectedLocalities] = useState<string[]>([]);
  const [showLocalityPicker, setShowLocalityPicker] = useState(false);

  // Sticker filter state
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [stickerMeanings, setStickerMeanings] = useState<Array<{id: string, color: string, label: string, details: string | null}>>([]);
  const [selectedStickerFilters, setSelectedStickerFilters] = useState<string[]>([]); // Array of sticker_meaning_id

  // per-venue refresh signals: increment a venue's counter to tell its row to refresh
  const [stickerRefreshSignals, setStickerRefreshSignals] = useState<Record<string, number>>({});

  const [userVenueData, setUserVenueData] = useState<{[venueId: string]: UserVenueData}>({});
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const { selectedVenueId, openModal, closeModal } = useVenueStore();

  const fetchVenues = async (
    page = 1,
    search = '',
    filterParams = filters,
    stickerFilters = selectedStickerFilters,
    localityFilters = selectedLocalities,
    venueTypeFilters = selectedVenueTypes,
    append = false,
    transitKnownFlag = transitKnown,
    imagesPresentFlag = imagesPresent,
    notesPresentFlag = notesPresent,
    showPublicFlag = showPublic,
    showMineFlag = showMine
  ) => {
    try {
      if (!append) {
        setLoading(true);
      }
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '10',
        ...(search && { q: search }),
        ...(filterParams.public_transit && { public_transit: filterParams.public_transit }),
      });
      if (localityFilters.length > 0) params.append('localities', localityFilters.join(','));
      if (venueTypeFilters.length > 0) params.append('types', venueTypeFilters.join(','));
      if (stickerFilters.length > 0) params.append('sticker_ids', stickerFilters.join(','));
      if (transitKnownFlag) params.append('transit_known', 'true');
      if (imagesPresentFlag) params.append('images_present', 'true');
      if (notesPresentFlag) params.append('notes_present', 'true');

      if (!showPublicFlag && !showMineFlag) {
        // Short-circuit empty
        setVenues([]);
        setCurrentPage(1);
        setHasMore(false);
        setError(null);
        setLoading(false);
        loadingMore.current = false;
        return;
      }
      if (!showPublicFlag) params.append('show_public', 'false');
      if (!showMineFlag) params.append('show_mine', 'false');
      const response = await fetch(`/api/venues?${params}`);
      if (!response.ok) {
        setError('Failed to load venues');
        return;
      }

      const data: VenuesResponse = await response.json();

      if (append) {
        setVenues(prev => [...prev, ...data.venues]);
      } else {
        // If a new venue was just added and now we're filtering/searching, sort the whole list
        if (hasNewUnsortedVenue) {
          const sorted = [...data.venues].sort((a, b) => a.name.localeCompare(b.name));
          setVenues(sorted);
          setHasNewUnsortedVenue(false);
        } else {
          setVenues(data.venues);
        }
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

      // Images are already included per venue (fields: images, images_count)
    } catch (err) {
      setError('Failed to load venues');
      console.error('Error fetching venues:', err);
    } finally {
      setLoading(false);
      loadingMore.current = false;
    }
  };

  useEffect(() => {
    // Load image config globally, ignore errors
    fetchImageConfig().catch(() => {});
    fetchVenues();
    loadStickerMeanings();
    loadLocalities();
    loadVenueTypes();
    // Load credits total
    fetch('/api/credits').then(r=>r.json()).then(d=>setCredits(typeof d.total_credits==='number'?d.total_credits:0)).catch(()=>setCredits(null));
    // Load current user role for create-mode styling
    fetch('/api/me').then(r=>r.json()).then(d=>setMeRole(d.role || null)).catch(()=>setMeRole(null));
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

  const loadVenueTypes = async () => {
    try {
      const response = await fetch('/api/venue-types');
      if (response.ok) {
        const data = await response.json();
        setVenueTypes(data.venueTypes || []);
      }
    } catch (err) {
      console.error('Failed to load venue types:', err);
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
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
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
          fetchVenues(currentPage + 1, searchQuery, filters, selectedStickerFilters, selectedLocalities, selectedVenueTypes, true, transitKnown, imagesPresent, notesPresent, showPublic, showMine);
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
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, selectedLocalities, selectedVenueTypes, false, transitKnown, imagesPresent, notesPresent, showPublic, showMine);
  };

  const handleStickerFilterToggle = (stickerMeaningId: string) => {
    const newSelectedFilters = selectedStickerFilters.includes(stickerMeaningId)
      ? selectedStickerFilters.filter(id => id !== stickerMeaningId)
      : [...selectedStickerFilters, stickerMeaningId];

    setSelectedStickerFilters(newSelectedFilters);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, newSelectedFilters, selectedLocalities, selectedVenueTypes, false, transitKnown, imagesPresent, notesPresent, showPublic, showMine);
  };

  const handleLocalityToggle = (localityName: string) => {
    const newSelectedLocalities = selectedLocalities.includes(localityName)
      ? selectedLocalities.filter(name => name !== localityName)
      : [...selectedLocalities, localityName];

    setSelectedLocalities(newSelectedLocalities);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, newSelectedLocalities, selectedVenueTypes, false, transitKnown, imagesPresent, notesPresent, showPublic, showMine);
  };

  const handleClearLocalities = () => {
    setSelectedLocalities([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, [], selectedVenueTypes, false, transitKnown, imagesPresent, notesPresent, showPublic, showMine);
  };

  const handleVenueTypeToggle = (venueTypeName: string) => {
    const newSelectedVenueTypes = selectedVenueTypes.includes(venueTypeName)
      ? selectedVenueTypes.filter(name => name !== venueTypeName)
      : [...selectedVenueTypes, venueTypeName];

    setSelectedVenueTypes(newSelectedVenueTypes);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, selectedLocalities, newSelectedVenueTypes, false, transitKnown, imagesPresent, notesPresent, showPublic, showMine);
  };

  const handleClearVenueTypes = () => {
    setSelectedVenueTypes([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, selectedLocalities, [], false, transitKnown, imagesPresent, notesPresent, showPublic, showMine);
  };

  const handleClearStickerFilters = () => {
    setSelectedStickerFilters([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, [], selectedLocalities, selectedVenueTypes, false, transitKnown, imagesPresent, notesPresent, showPublic, showMine);
  };

  const handleVenueClick = (venueId: string) => {
    openModal(venueId);
    router.push(`/venues?id=${venueId}`, { scroll: false });
  };

  const handleCloseModal = () => {
    closeModal();
    router.push('/venues', { scroll: false });
  };

  // Increment per-row refresh signal(s) so VenueStickers updates without full refetch
  const handleStickerUpdate = (venueIds: string | string[]) => {
    const ids = Array.isArray(venueIds) ? venueIds : [venueIds];
    setStickerRefreshSignals(prev => {
      const next = { ...prev };
      ids.forEach(id => { next[id] = (next[id] || 0) + 1; });
      return next;
    });
  };

  // Propagate sticker meaning rename across all venues and cached sticker meanings
  const handleStickerRename = (meaningId: string, newLabel: string) => {
    // Update venues' user_stickers arrays
    setVenues(prev => prev.map(v => {
      if (!v.user_stickers || v.user_stickers.length === 0) return v;
      const updatedStickers = v.user_stickers.map(s => s.sticker_meaning_id === meaningId ? { ...s, label: newLabel } : s);
      return { ...v, user_stickers: updatedStickers };
    }));
    // Update sticker filter meanings list if present
    setStickerMeanings(prev => prev.map(m => m.id === meaningId ? { ...m, label: newLabel } : m));
    // Trigger refresh signals for rows that contain renamed sticker
    setStickerRefreshSignals(prev => {
      const next = { ...prev };
      venues.forEach(v => {
        if (v.user_stickers?.some(s => s.sticker_meaning_id === meaningId)) {
          next[v.id] = (next[v.id] || 0) + 1;
        }
      });
      return next;
    });
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

  // Handle image changes from modal (add or delete)
  const handleImageChange = async (venueId: string, addedImage?: any, deletedImageId?: string) => {
    // Re-fetch images for this venue to get fresh signed URLs and update the table
    try {
      const resp = await fetch(`/api/venues/${venueId}/images`);
      if (resp.ok) {
        const data = await resp.json();
        const freshImages = data.images || [];
        // Update the venues state with fresh image data
        setVenues(prev => prev.map(v =>
          v.id === venueId ? { ...v, images: freshImages } : v
        ));
      }
    } catch (err) {
      console.error('[ImageChange] Failed to refresh images for venue', venueId, err);
    }
  };

  // Close hover tooltip only when mouse leaves both source and tooltip; do not swap to other cells while active
  useEffect(() => {
    if (!clickedCell) {
      if (!isOverTooltip && !isOverSource && hoveredCell) {
        setHoveredCell(null);
        setActiveTooltipVenueId(null);
      }
    }
  }, [isOverTooltip, isOverSource, clickedCell, hoveredCell]);

  // Hide hover tooltip on scroll; keep clicked (pinned) tooltips
  useEffect(() => {
    const handleScrollHide = () => {
      if (!clickedCell && hoveredCell) {
        setHoveredCell(null);
        setActiveTooltipVenueId(null);
      }
    };
    const main = mainScrollRef.current;
    if (main) main.addEventListener('scroll', handleScrollHide, { passive: true });
    window.addEventListener('scroll', handleScrollHide, { passive: true });
    return () => {
      if (main) main.removeEventListener('scroll', handleScrollHide as EventListener);
      window.removeEventListener('scroll', handleScrollHide as EventListener);
    };
  }, [clickedCell, hoveredCell]);

  // Touch support: tap-to-show, tap outside tooltip to close (treat as clicked/pinned)
  useEffect(() => {
    const handleTouchOutside = (e: TouchEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setClickedCell(null);
        setHoveredCell(null);
        setActiveTooltipVenueId(null);
      }
    };
    document.addEventListener('touchstart', handleTouchOutside);
    return () => document.removeEventListener('touchstart', handleTouchOutside);
  }, []);

  const handleCellHover = (event: React.MouseEvent, content: React.ReactNode, venueId: string) => {
    // Prevent swapping to other venue while a tooltip is active
    if ((hoveredCell || clickedCell) && activeTooltipVenueId && activeTooltipVenueId !== venueId) {
      setIsOverSource(false); // ensure correct leave logic
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setHoveredCell({ content, x: rect.left + 15, y: rect.top + 10, venueId });
    setActiveTooltipVenueId(venueId);
    setIsOverSource(true);
  };

  const handleCellLeave = () => {
    setIsOverSource(false);
  };

  const handleCellClick = async (event: React.MouseEvent<HTMLElement>, content: React.ReactNode, venueId: string) => {
     event.stopPropagation();
     const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
     setClickedCell({ content, x: rect.left + 15, y: rect.top + 10, venueId });
     setHoveredCell(null);
     setActiveTooltipVenueId(venueId);
    // Re-sign URLs for the visible row when pinned to avoid stale URLs
    try {
      const resp = await fetch(`/api/venues/${venueId}/images`);
      if (resp.ok) {
        const data = await resp.json();
        const fresh = (data.images || []).map((img: any) => ({ id: img.id, url: img.url, thumb_url: img.thumb_url || img.url, created_at: img.created_at }));
        setVenues(prev => prev.map(v => v.id === venueId ? { ...v, images: fresh } : v));
      }
    } catch {}
   };

  const handleCellTouch = async (event: React.TouchEvent<HTMLElement>, content: React.ReactNode, venueId: string) => {
     const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
     setClickedCell({ content, x: rect.left + 15, y: rect.top + 10, venueId });
     setHoveredCell(null);
     setActiveTooltipVenueId(venueId);
    try {
      const resp = await fetch(`/api/venues/${venueId}/images`);
      if (resp.ok) {
        const data = await resp.json();
        const fresh = (data.images || []).map((img: any) => ({ id: img.id, url: img.url, thumb_url: img.thumb_url || img.url, created_at: img.created_at }));
        setVenues(prev => prev.map(v => v.id === venueId ? { ...v, images: fresh } : v));
      }
    } catch {}
   };

  const renderStickersNotesArtworkTooltip = (venue: Venue, venueId: string): React.ReactNode => {
    const venueData = userVenueData[venueId];
    const images = (venues.find(v => v.id === venueId)?.images) || [];

    return (
      <div onClick={() => handleVenueClick(venueId)} style={{ cursor: 'pointer' }}>
        {venue.user_stickers && venue.user_stickers.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ display: 'block', marginBottom: '6px' }}>Stickers:</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {venue.user_stickers.map((sticker) => (
                <span
                  key={sticker.id}
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    backgroundColor: sticker.color,
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: 500,
                    border: '1px solid rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap'
                  }}
                  title={sticker.details || sticker.label}
                >
                  {sticker.label}
                </span>
              ))}
            </div>
          </div>
        )}
        {venueData?.notes && (
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ display: 'block', marginBottom: '6px' }}>Notes:</strong>
            <div style={{ fontSize: '14px', lineHeight: '1.5' }}>{venueData.notes}</div>
          </div>
        )}
        {images.length > 0 && (
          <div>
            <strong>Artwork:</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {images.map((image) => (
                <img
                  key={image.id}
                  src={image.thumb_url || image.url}
                  alt="Artwork"
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              ))}
            </div>
          </div>
        )}
        {!venue.user_stickers?.length && !venueData?.notes && images.length === 0 && (
          <div>No stickers, notes, or artwork</div>
        )}
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
          <em style={{ fontSize: '13px', color: '#6b7280' }}>(Click to open venue details)</em>
        </div>
      </div>
    );
  };

  const renderNotesCell = (venueId: string) => {
     const venueData = userVenueData[venueId];
     if (!venueData || !venueData.notes) return null;
     return (
       <div className="p-2 relative">
         <div className="text-sm text-gray-700 truncate" style={{ maxWidth: '200px' }}>
           {venueData.notes}
         </div>
       </div>
     );
   };

  // Debounced search (300ms)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      setHasMore(true);
      fetchVenues(1, searchQuery, filters, selectedStickerFilters, selectedLocalities, selectedVenueTypes, false, transitKnown, imagesPresent, notesPresent, showPublic, showMine);
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

  const handleTransitKnownToggle = (checked: boolean) => {
    setTransitKnown(checked);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, selectedLocalities, selectedVenueTypes, false, checked, imagesPresent, notesPresent, showPublic, showMine);
  };

  const handleImagesPresentToggle = (checked: boolean) => {
    setImagesPresent(checked);
    setCurrentPage(1);
    setHasMore(true);
    // Use the explicit checked value to avoid stale state inversion
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, selectedLocalities, selectedVenueTypes, false, transitKnown, checked, notesPresent, showPublic, showMine);
  };

  const handleNotesPresentToggle = (checked: boolean) => {
    setNotesPresent(checked);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, selectedLocalities, selectedVenueTypes, false, transitKnown, imagesPresent, checked, showPublic, showMine);
  };

  // Ownership toggles
  const handleToggleShowPublic = (val: boolean) => {
    setShowPublic(val);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, selectedLocalities, selectedVenueTypes, false, transitKnown, imagesPresent, notesPresent, val, showMine);
  };

  const handleToggleShowMine = (val: boolean) => {
    setShowMine(val);
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, searchQuery, filters, selectedStickerFilters, selectedLocalities, selectedVenueTypes, false, transitKnown, imagesPresent, notesPresent, showPublic, val);
  };

  const handleClearAll = () => {
    const emptyFilters = { locality: '', type: '', public_transit: '' };
    setSelectedLocalities([]);
    setSelectedVenueTypes([]);
    setSelectedStickerFilters([]);
    setTransitKnown(false);
    setImagesPresent(false);
    setNotesPresent(false);
    setFilters(emptyFilters);
    setSearchQuery('');
    setCurrentPage(1);
    setHasMore(true);
    fetchVenues(1, '', emptyFilters, [], [], [], false, false, false, false);
  };

  const handleDownloadCsv = async () => {
    try {
      const response = await fetch('/api/venues/export');

      if (!response.ok) {
        if (response.status === 404) {
          const data = await response.json();
          alert(data.message || 'No venues found with interactions');
          return;
        }
        throw new Error('Failed to download CSV');
      }

      // Get the blob and create a download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-venues-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download CSV. Please try again.');
    }
  };
  const [regionNames, setRegionNames] = useState<string[]>([]);

  useEffect(() => {
    const loadRegion = async () => {
      try {
        const resp = await fetch('/api/regions');
        if (resp.ok) {
          const data = await resp.json();
          const names: string[] = (data?.regions || []).map((r: any) => r.name).filter(Boolean);
          setRegionNames(names);
        }
      } catch (e) {
        console.warn('Failed to load region info', e);
      }
    };
    loadRegion();
  }, []);

  const formatRegionsTitle = (names: string[]): string => {
    if (!names || names.length === 0) return 'Art Venues';
    if (names.length === 1) return `Art Venues in the ${names[0]}`;
    if (names.length === 2) return `Art Venues in the ${names[0]} and the ${names[1]}`;
    const allButLast = names.slice(0, -1).map(n => `the ${n}`).join(', ');
    const last = names[names.length - 1];
    return `Art Venues in ${allButLast} and the ${last}`;
  };

  if (loading && venues.length === 0) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div aria-label="Loading initial venues" style={{ width: 56, height: 56, border: '5px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'nw5spin 0.9s linear infinite', boxShadow: '0 0 0 2px rgba(59,130,246,0.15) inset' }} />
          <div style={{ marginTop: 12, color: '#374151', fontSize: 16 }}>Loading venues…</div>
          <style jsx global>{`@keyframes nw5spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 font-sans" style={{ margin: '2rem', overflowX: 'hidden' }}>
      <style jsx global>{`@keyframes nw5spin{to{transform:rotate(360deg)}}`}</style>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">{formatRegionsTitle(regionNames)}</h1>

        {/* Add Venue + credits notice + Download CSV + Feedback */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
          <button
            type="button"
            onClick={() => setShowCreateVenueModal(true)}
            style={{ padding:'0.5rem 1rem', backgroundColor:'#3b82f6', color:'white', border:'none', borderRadius:6, fontWeight:600, cursor:'pointer' }}
            onMouseEnter={(e)=>{ e.currentTarget.style.backgroundColor = '#2563eb'; }}
            onMouseLeave={(e)=>{ e.currentTarget.style.backgroundColor = '#3b82f6'; }}
          >
            + Add Venue
          </button>
          <div style={{ fontSize:13, color:'#374151', flex: 1 }}>
            You have {typeof credits==='number' ? credits : 0} credits. <span style={{ fontStyle:'italic', color:'#6b7280' }}>Earn credits for your venues when we make them accessible to everyone</span>
          </div>
          <button
            type="button"
            onClick={handleDownloadCsv}
            style={{ padding:'0.5rem 1rem', backgroundColor:'#10b981', color:'white', border:'none', borderRadius:6, fontWeight:600, cursor:'pointer', whiteSpace: 'nowrap' }}
            onMouseEnter={(e)=>{ e.currentTarget.style.backgroundColor = '#059669'; }}
            onMouseLeave={(e)=>{ e.currentTarget.style.backgroundColor = '#10b981'; }}
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => setShowFeedbackModal(true)}
            style={{ padding:'0.5rem 1rem', backgroundColor:'#8b5cf6', color:'white', border:'none', borderRadius:6, fontWeight:600, cursor:'pointer', whiteSpace: 'nowrap', marginRight: '50px' }}
            onMouseEnter={(e)=>{ e.currentTarget.style.backgroundColor = '#7c3aed'; }}
            onMouseLeave={(e)=>{ e.currentTarget.style.backgroundColor = '#8b5cf6'; }}
          >
            Help & Feedback
          </button>
        </div>


        <div className="mb-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2 flex-wrap items-center" style={{ margin: 5 }}>
            {/* Filter buttons with neutral outlined style and count badges */}
            <button
              type="button"
              onClick={() => setShowVenueTypePicker(true)}
              style={{
                margin: 5,
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              <span>Venue types</span>
              {selectedVenueTypes.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, backgroundColor: '#e5e7eb', color: '#374151', padding: '2px 6px', borderRadius: 9999 }}>{selectedVenueTypes.length}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowLocalityPicker(true)}
              style={{
                margin: 5,
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              <span>Localities</span>
              {selectedLocalities.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, backgroundColor: '#e5e7eb', color: '#374151', padding: '2px 6px', borderRadius: 9999 }}>{selectedLocalities.length}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowStickerPicker(true)}
              style={{
                margin: 5,
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              <span>Stickers</span>
              {selectedStickerFilters.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, backgroundColor: '#e5e7eb', color: '#374151', padding: '2px 6px', borderRadius: 9999 }}>{selectedStickerFilters.length}</span>
              )}
            </button>

            {/* Other filters (transit) */}
            <button
              type="button"
              onClick={() => setShowOtherFilters(true)}
              style={{
                margin: 5,
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              <span>Other filters</span>
              {transitKnown && (
                <span style={{ marginLeft: 8, fontSize: 12, backgroundColor: '#e5e7eb', color: '#374151', padding: '2px 6px', borderRadius: 9999 }}>1</span>
              )}
            </button>

            {/* Search placed immediately after filter buttons */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search venues..."
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
            <button
              type="submit"
              style={{
                margin: 5,
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              Search
            </button>

            {/* Clear all on far right */}
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                marginLeft: 'auto',
                margin: 5,
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
            >
              Clear all
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">{error}</div>
        )}

        {/* Padded wrapper so table width does not exceed available width minus 20px on each side */}
        <div style={{ paddingLeft: 10, paddingRight: 50 }}>
          <div
            ref={mainScrollRef}
            className="overflow-x-auto relative"
            style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}
          >
            <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
               <thead className="bg-gray-300 border-b border-gray-200" style={{ borderBottom: '1px solid #e5e7eb' }}>
                 <tr>
                  <th className="text-left font-semibold" style={{ padding: '10px', borderRight: '1px solid #e0e0e0', backgroundColor: '#d1d5db' }}>Name</th>
                  <th className="text-left font-semibold" style={{ padding: '10px', borderRight: '1px solid #e0e0e0', backgroundColor: '#d1d5db' }}>Stickers, Notes & Artwork</th>
                  <th className="text-left font-semibold" style={{ padding: '10px', borderRight: '1px solid #e0e0e0', backgroundColor: '#d1d5db' }}>Type</th>
                  <th className="text-left font-semibold" style={{ padding: '10px', borderRight: '1px solid #e0e0e0', backgroundColor: '#d1d5db' }}>Locality</th>
                  <th className="text-left font-semibold" style={{ padding: '10px', borderRight: '1px solid #e0e0e0', backgroundColor: '#d1d5db' }}>Artist Summary</th>
                  <th className="text-left font-semibold" style={{ padding: '10px', borderRight: '1px solid #e0e0e0', backgroundColor: '#d1d5db' }}>Visitor Summary</th>
                  <th className="text-left font-semibold" style={{ padding: '10px', backgroundColor: '#d1d5db' }}>Public Transit</th>
                 </tr>
               </thead>
               <tbody>
                 {!loading && venues.length === 0 && (
                   <tr>
                     <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                       No venues match your filters
                     </td>
                   </tr>
                 )}
                 {venues.map((venue, index) => (
                   <tr key={venue.id} style={{ backgroundColor: venue.user_owned ? (index % 2 === 0 ? '#f3fdf3' : '#e8f9e8') : (index % 2 === 0 ? '#ffffff' : '#f2f3f5') }}>
                  {/* Name first */}
                  <td className="text-blue-600 hover:text-blue-800 cursor-pointer" style={{ padding: '10px', fontWeight: 'bold', borderRight: '1px solid #e0e0e0', position: 'relative' }}>
                    <div style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none', cursor: 'pointer' }} onClick={() => handleVenueClick(venue.id)}>
                      {venue.name}
                      {venue.user_owned && (
                        <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#6b7280', fontWeight: 'normal', marginTop: '2px' }}>
                          Venue contributed by me
                        </div>
                      )}
                    </div>
                  </td>
                  {/* Stickers, Notes & Artwork next */}
                  <td style={{ padding: '10px', borderRight: '1px solid #e0e0e0', position: 'relative' }}>
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                      onMouseEnter={(e) => {
                        // Eager loading already triggered; only manage tooltip on hover
                        handleCellHover(e, renderStickersNotesArtworkTooltip(venue, venue.id), venue.id);
                      }}
                      onMouseLeave={handleCellLeave}
                      onClick={(e) => {
                        handleCellClick(e, renderStickersNotesArtworkTooltip(venue, venue.id), venue.id);
                      }}
                    >
                      <VenueStickers venueId={venue.id} refreshSignal={stickerRefreshSignals[venue.id] || 0} initialStickers={venue.user_stickers} />
                      {renderNotesCell(venue.id)}
                      {/* Quick glance: image count */}
                      {typeof venue.images_count === 'number' && venue.images_count > 0 && (
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Artwork: {venue.images_count}</div>
                      )}
                      {venue.images && venue.images.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {venue.images.map((image) => (
                            <img key={image.id} src={image.thumb_url || image.url} alt="Artwork" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px', borderRight: '1px solid #e0e0e0' }}>{venue.type}</td>
                  <td style={{ padding: '10px', borderRight: '1px solid #e0e0e0' }}>{venue.locality}</td>
                  <td style={{ padding: '10px', borderRight: '1px solid #e0e0e0', position: 'relative' }}>
                    <div
                      className="truncate"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => venue.artist_summary && handleCellHover(e, venue.artist_summary, venue.id)}
                      onMouseLeave={handleCellLeave}
                      onTouchStart={(e) => venue.artist_summary && handleCellTouch(e, venue.artist_summary, venue.id)}
                      onClick={(e) => venue.artist_summary && handleCellClick(e, venue.artist_summary, venue.id)}
                    >
                      {venue.artist_summary}
                    </div>
                  </td>
                  <td style={{ padding: '10px', borderRight: '1px solid #e0e0e0', position: 'relative' }}>
                    <div
                      className="truncate"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => venue.visitor_summary && handleCellHover(e, venue.visitor_summary, venue.id)}
                      onMouseLeave={handleCellLeave}
                      onTouchStart={(e) => venue.visitor_summary && handleCellTouch(e, venue.visitor_summary, venue.id)}
                      onClick={(e) => venue.visitor_summary && handleCellClick(e, venue.visitor_summary, venue.id)}
                    >
                      {venue.visitor_summary}
                    </div>
                  </td>
                   <td style={{ padding: '10px' }}>{venue.public_transit}</td>
                 </tr>
               ))}
               </tbody>
             </table>
           </div>
        </div>

        <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
          {loadingMore.current && hasMore && (
            <div className="text-gray-500 text-sm flex items-center gap-2">
              <span aria-label="Loading more" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #6b7280', borderTopColor: 'transparent', borderRadius: '50%', animation: 'nw5spin 0.9s linear infinite', verticalAlign: 'middle' }} />
              Loading more venues...
            </div>
          )}
          {!hasMore && venues.length > 0 && <div className="text-gray-400 text-sm">No more venues to load</div>}
        </div>
      </div>

      {(hoveredCell || clickedCell) && (
        <div
          ref={tooltipRef}
          onMouseEnter={() => setIsOverTooltip(true)}
          onMouseLeave={() => setIsOverTooltip(false)}
          onClick={() => {
            const vid = (clickedCell || hoveredCell)!.venueId;
            handleVenueClick(vid);
          }}
          style={{ position: 'fixed', left: (clickedCell || hoveredCell)!.x, top: (clickedCell || hoveredCell)!.y, backgroundColor: 'white', border: '2px solid #3b82f6', borderRadius: '8px', padding: '12px 16px', minWidth: '200px', maxWidth: '500px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', zIndex: 9999, fontSize: '14px', lineHeight: '1.5', color: '#1f2937', whiteSpace: 'pre-wrap', wordWrap: 'break-word', pointerEvents: 'auto' }}
        >
          {(clickedCell || hoveredCell)!.content}
        </div>
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

      {showVenueTypePicker && (
        <VenueTypePickerModal
          venueTypes={venueTypes}
          selectedVenueTypes={selectedVenueTypes}
          onToggleVenueType={handleVenueTypeToggle}
          onClear={handleClearVenueTypes}
          onClose={() => setShowVenueTypePicker(false)}
        />
      )}

      {showStickerPicker && (
        <StickerPickerModal
          stickerMeanings={stickerMeanings}
          selectedStickerFilters={selectedStickerFilters}
          onToggleSticker={handleStickerFilterToggle}
          onClear={handleClearStickerFilters}
          onClose={() => setShowStickerPicker(false)}
        />
      )}

      {showOtherFilters && (
        <OtherFiltersModal
           transitKnown={transitKnown}
           onToggleTransitKnown={(value: boolean) => handleTransitKnownToggle(value)}
           imagesPresent={imagesPresent}
           onToggleImagesPresent={(value: boolean) => handleImagesPresentToggle(value)}
           notesPresent={notesPresent}
           onToggleNotesPresent={(value: boolean) => handleNotesPresentToggle(value)}
           showPublic={showPublic}
           showMine={showMine}
           onToggleShowPublic={handleToggleShowPublic}
           onToggleShowMine={handleToggleShowMine}
           onClose={() => setShowOtherFilters(false)}
         />
       )}

      {selectedVenueId && selectedVenue && (
        <VenueModal
          venue={selectedVenue}
          onClose={handleCloseModal}
          onNoteSaved={handleNoteSaved}
          onStickerUpdate={handleStickerUpdate}
          onStickerRename={handleStickerRename}
          onImageChange={handleImageChange}
          mode={showCreateVenueModal ? 'create' : 'view'}
          onVenueCreated={(newVenue: any) => {
            // Insert new venue at top (unsorted) then mark flag so next fetch sorts
            setVenues(prev => [newVenue, ...prev]);
            setHasNewUnsortedVenue(true);
            setShowCreateVenueModal(false);
          }}
          userRole={meRole || 'user'}
        />
      )}

      {showCreateVenueModal && (
        <VenueModal
          mode="create"
          userRole={meRole || 'artist'}
          onClose={() => setShowCreateVenueModal(false)}
          onVenueCreated={(created: Venue) => {
            // Prepend the new venue to the top of the list
            setVenues(prev => [created, ...prev]);
            setHasNewUnsortedVenue(true);
          }}
        />
      )}

      {showFeedbackModal && (
        <FeedbackModal
          onClose={() => setShowFeedbackModal(false)}
          onSuccess={(msg) => {
            setShowFeedbackModal(false);
            setFeedbackSuccess({ visible: true, message: msg });
          }}
        />
      )}

      {feedbackSuccess.visible && (
        <>
          <div style={{ position:'fixed', inset:0 as any, background:'rgba(0,0,0,0.7)', zIndex:11000 }} onClick={() => setFeedbackSuccess({ visible:false, message:'' })} />
          <div style={{ position:'fixed', inset:0 as any, display:'flex', alignItems:'center', justifyContent:'center', zIndex:11001, pointerEvents:'none' }}>
            <div style={{ background:'#fff', borderRadius:8, width:'100%', maxWidth:520, padding:'1.5rem', fontFamily:'Arial, Helvetica, sans-serif', pointerEvents:'auto', boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize:'1.125rem', fontWeight:600, margin:0, color:'#111827' }}>Your message was received, we will respond very soon.</h3>
              <div style={{ marginTop:'0.75rem', color:'#374151' }}>
                <div style={{ fontSize:'0.875rem', color:'#6b7280', marginBottom:4 }}>Here is your message:</div>
                <div style={{ whiteSpace:'pre-wrap', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:6, padding:'0.75rem' }}>{feedbackSuccess.message}</div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'1rem' }}>
                <button type='button' onClick={() => setFeedbackSuccess({ visible:false, message:'' })} style={{ padding:'0.5rem 1rem', background:'#3b82f6', color:'#fff', border:'none', borderRadius:6, fontSize:'0.875rem', fontWeight:600, cursor:'pointer' }} onMouseEnter={e=> e.currentTarget.style.background='#2563eb'} onMouseLeave={e=> e.currentTarget.style.background='#3b82f6'}>Close</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

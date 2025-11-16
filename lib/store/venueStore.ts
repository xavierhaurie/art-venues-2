import { create } from 'zustand';

interface VenueNote {
  id?: string;
  body: string;
  venue_id: string;
}

interface VenueImage {
  id: string;
  venue_id: string;
  file_path: string;
  url: string;
  title?: string;
  details?: string;
  display_order: number;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface VenueState {
  // Modal state
  selectedVenueId: string | null;
  isModalOpen: boolean;
  
  // Notes by venue ID
  notes: Record<string, VenueNote>;
  notesLoading: Record<string, boolean>;
  notesSaving: Record<string, boolean>;
  
  // Images by venue ID
  images: Record<string, VenueImage[]>;
  imagesLoading: Record<string, boolean>;
  imagesUploading: Record<string, number>; // count of uploading images
  
  // Actions
  openModal: (venueId: string) => void;
  closeModal: () => void;
  
  // Notes actions
  setNote: (venueId: string, note: VenueNote) => void;
  setNoteLoading: (venueId: string, loading: boolean) => void;
  setNoteSaving: (venueId: string, saving: boolean) => void;
  
  // Images actions
  setImages: (venueId: string, images: VenueImage[]) => void;
  addImage: (venueId: string, image: VenueImage) => void;
  removeImage: (venueId: string, imageId: string) => void;
  updateImageOrder: (venueId: string, images: VenueImage[]) => void;
  setImagesLoading: (venueId: string, loading: boolean) => void;
  incrementUploading: (venueId: string) => void;
  decrementUploading: (venueId: string) => void;
}

export const useVenueStore = create<VenueState>((set) => ({
  selectedVenueId: null,
  isModalOpen: false,
  notes: {},
  notesLoading: {},
  notesSaving: {},
  images: {},
  imagesLoading: {},
  imagesUploading: {},
  
  openModal: (venueId) => set({ selectedVenueId: venueId, isModalOpen: true }),
  closeModal: () => set({ selectedVenueId: null, isModalOpen: false }),
  
  setNote: (venueId, note) =>
    set((state) => ({
      notes: { ...state.notes, [venueId]: note },
    })),
  
  setNoteLoading: (venueId, loading) =>
    set((state) => ({
      notesLoading: { ...state.notesLoading, [venueId]: loading },
    })),
  
  setNoteSaving: (venueId, saving) =>
    set((state) => ({
      notesSaving: { ...state.notesSaving, [venueId]: saving },
    })),
  
  setImages: (venueId, images) =>
    set((state) => ({
      images: { ...state.images, [venueId]: images },
    })),
  
  addImage: (venueId, image) =>
    set((state) => ({
      images: {
        ...state.images,
        [venueId]: [...(state.images[venueId] || []), image],
      },
    })),
  
  removeImage: (venueId, imageId) =>
    set((state) => ({
      images: {
        ...state.images,
        [venueId]: (state.images[venueId] || []).filter((img) => img.id !== imageId),
      },
    })),
  
  updateImageOrder: (venueId, images) =>
    set((state) => ({
      images: { ...state.images, [venueId]: images },
    })),
  
  setImagesLoading: (venueId, loading) =>
    set((state) => ({
      imagesLoading: { ...state.imagesLoading, [venueId]: loading },
    })),
  
  incrementUploading: (venueId) =>
    set((state) => ({
      imagesUploading: {
        ...state.imagesUploading,
        [venueId]: (state.imagesUploading[venueId] || 0) + 1,
      },
    })),
  
  decrementUploading: (venueId) =>
    set((state) => ({
      imagesUploading: {
        ...state.imagesUploading,
        [venueId]: Math.max(0, (state.imagesUploading[venueId] || 0) - 1),
      },
    })),
}));


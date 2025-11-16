'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Venue } from '/types/venue';

interface VenueImage {
  id: string;
  venue_id: string;
  file_path: string;
  url: string;
  title?: string;
  display_order: number;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface VenueDetailsPanelProps {
  venue: Venue | null;
  isOpen: boolean;
  onClose: () => void;
  userVenueData: any;
  onNotesChange: (venueId: string, notes: string) => void;
  onStarClick: (venueId: string, starIndex: number) => void;
  starColors: string[];
}

const STAR_MEANINGS = [
  'High Priority',
  'Applied Here', 
  'Need to Contact',
  'Work Displayed Here',
  'Need to Visit',
  'Submitted Work',
  'Rejected',
  'Accepted',
  'Need Portfolio Review',
  'Follow Up Required'
];

export default function VenueDetailsPanel({
  venue,
  isOpen,
  onClose,
  userVenueData,
  onNotesChange,
  onStarClick,
  starColors
}: VenueDetailsPanelProps) {
  const [images, setImages] = useState<VenueImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [notes, setNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  
  const notesTimeoutRef = useRef<NodeJS.Timeout>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load images when venue changes
  useEffect(() => {
    if (venue?.id) {
      loadImages();
    }
  }, [venue?.id]);

  // Update local notes when userVenueData changes
  useEffect(() => {
    if (venue?.id && userVenueData[venue.id]) {
      setNotes(userVenueData[venue.id].notes || '');
    }
  }, [venue?.id, userVenueData]);

  const loadImages = async () => {
    if (!venue?.id) return;
    
    setLoadingImages(true);
    try {
      const response = await fetch(`/api/venues/${venue.id}/images`);
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    
    // Clear existing timeout
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }
    
    // Set new timeout for auto-save
    notesTimeoutRef.current = setTimeout(() => {
      if (venue?.id) {
        onNotesChange(venue.id, value);
      }
    }, 500);
  }, [venue?.id, onNotesChange]);

  const handleImageUpload = async (files: FileList) => {
    if (!venue?.id) return;

    const validFiles = Array.from(files).filter(file => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
      return allowedTypes.includes(file.type);
    });

    for (const file of validFiles) {
      const uploadId = Math.random().toString(36);
      setUploadingImages(prev => [...prev, uploadId]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/venues/${venue.id}/images`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          setImages(prev => [...prev, data.image]);
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
      } finally {
        setUploadingImages(prev => prev.filter(id => id !== uploadId));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const deleteImage = async (imageId: string) => {
    if (!venue?.id) return;

    try {
      const response = await fetch(`/api/venues/${venue.id}/images/${imageId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setImages(prev => prev.filter(img => img.id !== imageId));
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const updateImageOrder = async (newOrder: VenueImage[]) => {
    if (!venue?.id) return;

    try {
      const response = await fetch(`/api/venues/${venue.id}/images/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: newOrder.map((img, index) => ({
            id: img.id,
            display_order: index + 1
          }))
        })
      });

      if (response.ok) {
        setImages(newOrder);
      }
    } catch (error) {
      console.error('Failed to update image order:', error);
    }
  };

  if (!isOpen || !venue) {
    return null;
  }

  const venueData = userVenueData[venue.id];

  return (
    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 w-[30%] max-w-md h-[85vh] bg-white border border-gray-300 rounded-lg shadow-lg z-50 flex flex-col"
         style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold truncate pr-2">{venue.name}</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Stars Section */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Rating & Status</h3>
          <div className="flex flex-wrap gap-2">
            {starColors.map((color, index) => (
              <button
                key={index}
                onClick={() => onStarClick(venue.id, index)}
                className="w-6 h-6 transition-all hover:scale-110 relative group"
                style={{
                  color: color,
                  fill: venueData?.stars?.includes(index) ? color : 'transparent',
                  stroke: color,
                  strokeWidth: 1
                }}
                title={STAR_MEANINGS[index]}
              >
                ★
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {STAR_MEANINGS[index]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Notes Section */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Notes</h3>
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add your notes about this venue..."
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
        </div>

        {/* Images Section */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Images</h3>
          
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-gray-500 text-sm">
              Drop images here or click to upload
              <br />
              <span className="text-xs">JPG, PNG, GIF, SVG (min 100px)</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.svg"
              onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Image Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group aspect-square border rounded-lg overflow-hidden bg-gray-100"
                  draggable
                  onDragStart={() => setDraggedImageId(image.id)}
                  onDragEnd={() => setDraggedImageId(null)}
                >
                  <img
                    src={image.url}
                    alt={image.title || ''}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay with controls */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                    <button
                      onClick={() => deleteImage(image.id)}
                      className="text-white opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 rounded-full w-8 h-8 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* Title */}
                  {image.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 truncate">
                      {image.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload progress */}
          {uploadingImages.length > 0 && (
            <div className="mt-2 text-sm text-gray-500">
              Uploading {uploadingImages.length} image(s)...
            </div>
          )}
        </div>

        {/* Venue Info */}
        <div className="text-sm text-gray-600 space-y-1 pt-4 border-t border-gray-200">
          <div><strong>Type:</strong> {venue.type}</div>
          <div><strong>Location:</strong> {venue.locality}</div>
          {venue.address && <div><strong>Address:</strong> {venue.address}</div>}
          {venue.website_url && (
            <div>
              <strong>Website:</strong>{' '}
              <a href={venue.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                {venue.website_url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

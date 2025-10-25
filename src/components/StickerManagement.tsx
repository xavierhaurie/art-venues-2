import React, { useState, useEffect } from 'react';
import { SketchPicker } from 'react-color';

interface StickerMeaning {
  id: string;
  color: string;
  label: string;
  details: string | null;
  created_at: string;
}

interface StickerManagementProps {
  onStickerMeaningsChange: (meanings: StickerMeaning[]) => void;
}

export default function StickerManagement({ onStickerMeaningsChange }: StickerManagementProps) {
  const [stickerMeanings, setStickerMeanings] = useState<StickerMeaning[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSticker, setEditingSticker] = useState<StickerMeaning | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [formData, setFormData] = useState({
    color: '#ADD8E6',
    label: '',
    details: ''
  });

  useEffect(() => {
    fetchStickerMeanings();
  }, []);

  const fetchStickerMeanings = async () => {
    try {
      const response = await fetch('/api/stickers/meanings');
      if (response.ok) {
        const data = await response.json();
        setStickerMeanings(data.meanings);
        onStickerMeaningsChange(data.meanings);
      }
    } catch (error) {
      console.error('Failed to fetch sticker meanings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextAvailableColor = () => {
    const defaultColors = ['#ADD8E6', '#FFB366', '#FFFF99', '#FFB3B3', '#D3D3D3'];
    const usedColors = new Set(stickerMeanings.map(s => s.color));

    for (const color of defaultColors) {
      if (!usedColors.has(color)) {
        return color;
      }
    }

    // Generate a random light color if all defaults are used
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 50%, 85%)`;
  };

  const handleCreateSticker = () => {
    setFormData({
      color: getNextAvailableColor(),
      label: '',
      details: ''
    });
    setEditingSticker(null);
    setShowCreateDialog(true);
  };

  const handleEditSticker = (sticker: StickerMeaning) => {
    setFormData({
      color: sticker.color,
      label: sticker.label,
      details: sticker.details || ''
    });
    setEditingSticker(sticker);
    setShowCreateDialog(true);
  };

  const handleSaveSticker = async () => {
    if (!formData.label.trim()) {
      alert('Label is required');
      return;
    }

    if (formData.label.length > 15) {
      alert('Label must be 15 characters or less');
      return;
    }

    if (formData.details.length > 1000) {
      alert('Details must be 1000 characters or less');
      return;
    }

    try {
      const url = editingSticker
        ? `/api/stickers/meanings/update?id=${editingSticker.id}`
        : '/api/stickers/meanings';

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchStickerMeanings();
        setShowCreateDialog(false);
        setEditingSticker(null);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to save sticker');
      }
    } catch (error) {
      console.error('Failed to save sticker:', error);
      alert('Failed to save sticker');
    }
  };

  const handleDeleteSticker = async (sticker: StickerMeaning) => {
    if (!confirm(`Delete sticker "${sticker.label}"? This will also remove all assignments of this sticker to venues.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/stickers/meanings/delete?id=${sticker.id}`, {
        method: 'POST'
      });

      if (response.ok) {
        await fetchStickerMeanings();
      } else {
        const errorData = await response.json();
        if (errorData.hasAssignments) {
          if (confirm('This sticker is assigned to venues. Delete all assignments and the sticker?')) {
            // User confirmed deletion of assignments
            // TODO: Implement force delete with assignments
            alert('Force delete not implemented yet');
          }
        } else {
          alert(errorData.error || 'Failed to delete sticker');
        }
      }
    } catch (error) {
      console.error('Failed to delete sticker:', error);
      alert('Failed to delete sticker');
    }
  };

  if (loading) {
    return <div className="text-center">Loading stickers...</div>;
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Your Stickers:</h3>
        <button
          onClick={handleCreateSticker}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          <span className="text-lg">+</span>
          Add Sticker
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {stickerMeanings.map((sticker) => (
          <div
            key={sticker.id}
            onClick={() => handleEditSticker(sticker)}
            className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:opacity-80 border"
            style={{ backgroundColor: sticker.color }}
          >
            <span className="text-sm font-medium">{sticker.label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSticker(sticker);
              }}
              className="text-red-600 hover:text-red-800 text-xs"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h4 className="text-lg font-semibold mb-4">
              {editingSticker ? 'Edit Sticker' : 'Create New Sticker'}
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Color:</label>
                <div className="flex items-center gap-2">
                  <div
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-8 h-8 rounded border cursor-pointer"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="text-sm">{formData.color}</span>
                </div>
                {showColorPicker && (
                  <div className="absolute mt-2 z-60">
                    <div
                      className="fixed inset-0"
                      onClick={() => setShowColorPicker(false)}
                    />
                    <SketchPicker
                      color={formData.color}
                      onChange={(color) => setFormData({ ...formData, color: color.hex })}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Label (max 15 chars):</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  maxLength={15}
                  placeholder="e.g., Interested"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.label.length}/15 characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Details (max 1000 chars):</label>
                <textarea
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm h-24 resize-none"
                  maxLength={1000}
                  placeholder="e.g., Need to dig deeper into this venue"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.details.length}/1000 characters
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveSticker}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingSticker ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setShowColorPicker(false);
                  setEditingSticker(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

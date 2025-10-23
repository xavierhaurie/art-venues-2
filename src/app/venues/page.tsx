'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Venue {
  id: string;
  name: string;
  type: string;
  locality: string;
  region_code: string;
  address?: string;
  public_transit?: 'yes' | 'partial' | 'no';
  website_url?: string;
  map_link?: string;
  artist_summary?: string;
  visitor_summary?: string;
  facebook?: string;
  instagram?: string;
  created_at: string;
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
  stars: number[];
  notes: string;
  images: string[];
}

interface ColumnVisibility {
  [key: string]: boolean;
}

interface ColumnWidths {
  [key: string]: number;
}

const STAR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Lavender
  '#85C1E9'  // Light Blue
];

const DEFAULT_COLUMN_WIDTHS = {
  stars: 120,
  images: 80,
  notes: 200,
  name: 200,
  type: 150,
  locality: 120,
  website_url: 150,
  artist_summary: 250,
  visitor_summary: 250,
  instagram: 100,
  facebook: 100,
  address: 200,
  public_transit: 100,
};

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    locality: '',
    type: '',
    public_transit: '',
  });

  // User data for each venue
  const [userVenueData, setUserVenueData] = useState<{[venueId: string]: UserVenueData}>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);

  // Column management
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    stars: true,
    images: true,
    notes: true,
    name: true,
    type: true,
    locality: true,
    website_url: true,
    artist_summary: true,
    visitor_summary: true,
    instagram: true,
    facebook: true,
    address: true,
    public_transit: true,
  });

  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(DEFAULT_COLUMN_WIDTHS);
  const [resizing, setResizing] = useState<{column: string, startX: number, startWidth: number} | null>(null);

  const tableRef = useRef<HTMLTableElement>(null);

  const fetchVenues = async (page = 1, search = '', filterParams = filters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '50',
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
      setVenues(data.venues);
      setCurrentPage(data.page);
      setTotalPages(data.total_pages);
      setError(null);
    } catch (err) {
      setError('Failed to load venues');
      console.error('Error fetching venues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  // Initialize user data for venues
  useEffect(() => {
    const newUserData: {[venueId: string]: UserVenueData} = {};
    venues.forEach(venue => {
      if (!userVenueData[venue.id]) {
        newUserData[venue.id] = {
          stars: [],
          notes: '',
          images: []
        };
      }
    });
    if (Object.keys(newUserData).length > 0) {
      setUserVenueData(prev => ({ ...prev, ...newUserData }));
    }
  }, [venues]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVenues(1, searchQuery, filters);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchVenues(1, searchQuery, newFilters);
  };

  const handlePageChange = (newPage: number) => {
    fetchVenues(newPage, searchQuery, filters);
  };

  const handleStarClick = (venueId: string, starIndex: number) => {
    setUserVenueData(prev => ({
      ...prev,
      [venueId]: {
        ...prev[venueId],
        stars: prev[venueId].stars.includes(starIndex)
          ? prev[venueId].stars.filter(s => s !== starIndex)
          : [...prev[venueId].stars, starIndex]
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
  };

  const toggleColumn = (columnKey: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    setResizing({
      column,
      startX: e.clientX,
      startWidth: columnWidths[column]
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing) return;

    const diff = e.clientX - resizing.startX;
    const newWidth = Math.max(100, Math.min(500, resizing.startWidth + diff));

    setColumnWidths(prev => ({
      ...prev,
      [resizing.column]: newWidth
    }));
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizing]);

  const renderStarCell = (venueId: string) => {
    const venueData = userVenueData[venueId];
    if (!venueData) return null;

    return (
      <div className="flex flex-wrap gap-1 p-2">
        {STAR_COLORS.map((color, index) => (
          <button
            key={index}
            onClick={() => handleStarClick(venueId, index)}
            className="w-4 h-4 transition-all hover:scale-110"
            style={{
              color: color,
              fill: venueData.stars.includes(index) ? color : 'transparent',
              stroke: color,
              strokeWidth: 1
            }}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const renderNotesCell = (venueId: string) => {
    const venueData = userVenueData[venueId];
    if (!venueData) return null;

    const isEditing = editingNote === venueId;

    return (
      <div className="p-2">
        {isEditing ? (
          <textarea
            value={venueData.notes}
            onChange={(e) => handleNotesChange(venueId, e.target.value)}
            onBlur={() => setEditingNote(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                setEditingNote(null);
              }
              if (e.key === 'Escape') {
                setEditingNote(null);
              }
            }}
            className="w-full h-20 p-1 border rounded resize-none text-sm"
            autoFocus
            placeholder="Add notes..."
          />
        ) : (
          <div
            onClick={() => setEditingNote(venueId)}
            className="min-h-[20px] cursor-text hover:bg-gray-50 p-1 rounded text-sm"
          >
            {venueData.notes || <span className="text-gray-400">Click to add notes...</span>}
          </div>
        )}
      </div>
    );
  };

  const renderImagesCell = (venueId: string) => {
    const venueData = userVenueData[venueId];
    if (!venueData) return null;

    return (
      <div className="flex items-center gap-1 p-2">
        {venueData.images.slice(0, 2).map((image, index) => (
          <img
            key={index}
            src={image}
            alt=""
            className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80"
            onClick={() => {/* Open gallery */}}
          />
        ))}
        {venueData.images.length > 2 && (
          <span className="text-xs text-gray-500">+{venueData.images.length - 2}</span>
        )}
        <button className="w-8 h-8 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-600">
          +
        </button>
      </div>
    );
  };

  if (loading && venues.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading venues...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Art Venues</h1>

        {/* Star Legend */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold mb-2">Star Colors Legend:</h3>
          <div className="flex flex-wrap gap-3">
            {STAR_COLORS.map((color, index) => (
              <div key={index} className="flex items-center gap-1">
                <span
                  className="w-4 h-4"
                  style={{ color: color, fill: color }}
                >
                  ★
                </span>
                <span className="text-xs">Star {index + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
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

        {/* Column Visibility Controls */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold mb-2">Show/Hide Columns:</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(columnVisibility).map(([key, visible]) => (
              <button
                key={key}
                onClick={() => toggleColumn(key)}
                className={`px-2 py-1 text-xs rounded ${
                  visible 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {key.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Venues Table */}
        <div className="overflow-x-auto border border-gray-300 rounded-lg">
          <table ref={tableRef} className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                {columnVisibility.stars && (
                  <th
                    style={{ width: columnWidths.stars }}
                    className="relative px-2 py-3 text-left font-semibold border-r border-gray-300"
                  >
                    Stars
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                      onMouseDown={(e) => handleMouseDown(e, 'stars')}
                    />
                  </th>
                )}
                {columnVisibility.images && (
                  <th
                    style={{ width: columnWidths.images }}
                    className="relative px-2 py-3 text-left font-semibold border-r border-gray-300"
                  >
                    Images
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                      onMouseDown={(e) => handleMouseDown(e, 'images')}
                    />
                  </th>
                )}
                {columnVisibility.notes && (
                  <th
                    style={{ width: columnWidths.notes }}
                    className="relative px-2 py-3 text-left font-semibold border-r border-gray-300"
                  >
                    Notes
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                      onMouseDown={(e) => handleMouseDown(e, 'notes')}
                    />
                  </th>
                )}
                {columnVisibility.name && (
                  <th
                    style={{ width: columnWidths.name }}
                    className="relative px-2 py-3 text-left font-semibold border-r border-gray-300"
                  >
                    Name
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                      onMouseDown={(e) => handleMouseDown(e, 'name')}
                    />
                  </th>
                )}
                {columnVisibility.type && (
                  <th
                    style={{ width: columnWidths.type }}
                    className="relative px-2 py-3 text-left font-semibold border-r border-gray-300"
                  >
                    Type
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                      onMouseDown={(e) => handleMouseDown(e, 'type')}
                    />
                  </th>
                )}
                {columnVisibility.locality && (
                  <th
                    style={{ width: columnWidths.locality }}
                    className="relative px-2 py-3 text-left font-semibold border-r border-gray-300"
                  >
                    Locality
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                      onMouseDown={(e) => handleMouseDown(e, 'locality')}
                    />
                  </th>
                )}
                {columnVisibility.website_url && (
                  <th
                    style={{ width: columnWidths.website_url }}
                    className="relative px-2 py-3 text-left font-semibold border-r border-gray-300"
                  >
                    Website
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                      onMouseDown={(e) => handleMouseDown(e, 'website_url')}
                    />
                  </th>
                )}
                {columnVisibility.artist_summary && (
                  <th
                    style={{ width: columnWidths.artist_summary }}
                    className="relative px-2 py-3 text-left font-semibold border-r border-gray-300"
                  >
                    Artist Summary
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                      onMouseDown={(e) => handleMouseDown(e, 'artist_summary')}
                    />
                  </th>
                )}
                {columnVisibility.visitor_summary && (
                  <th
                    style={{ width: columnWidths.visitor_summary }}
                    className="relative px-2 py-3 text-left font-semibold border-r border-gray-300"
                  >
                    Visitor Summary
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                      onMouseDown={(e) => handleMouseDown(e, 'visitor_summary')}
                    />
                  </th>
                )}
                {columnVisibility.instagram && (
                  <th
                    style={{ width: columnWidths.instagram }}
                    className="relative px-2 py-3 text-left font-semibold border-r border-gray-300"
                  >
                    Instagram
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                      onMouseDown={(e) => handleMouseDown(e, 'instagram')}
                    />
                  </th>
                )}
                {columnVisibility.facebook && (
                  <th
                    style={{ width: columnWidths.facebook }}
                    className="relative px-2 py-3 text-left font-semibold border-r border-gray-300"
                  >
                    Facebook
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                      onMouseDown={(e) => handleMouseDown(e, 'facebook')}
                    />
                  </th>
                )}
                {columnVisibility.address && (
                  <th
                    style={{ width: columnWidths.address }}
                    className="relative px-2 py-3 text-left font-semibold border-r border-gray-300"
                  >
                    Address
                    <div
                      className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
                      onMouseDown={(e) => handleMouseDown(e, 'address')}
                    />
                  </th>
                )}
                {columnVisibility.public_transit && (
                  <th
                    style={{ width: columnWidths.public_transit }}
                    className="px-2 py-3 text-left font-semibold"
                  >
                    Public Transit
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {venues.map((venue) => (
                <tr key={venue.id} className="border-b border-gray-200 hover:bg-gray-50">
                  {columnVisibility.stars && (
                    <td className="border-r border-gray-200" style={{ width: columnWidths.stars }}>
                      {renderStarCell(venue.id)}
                    </td>
                  )}
                  {columnVisibility.images && (
                    <td className="border-r border-gray-200" style={{ width: columnWidths.images }}>
                      {renderImagesCell(venue.id)}
                    </td>
                  )}
                  {columnVisibility.notes && (
                    <td className="border-r border-gray-200" style={{ width: columnWidths.notes }}>
                      {renderNotesCell(venue.id)}
                    </td>
                  )}
                  {columnVisibility.name && (
                    <td className="border-r border-gray-200 p-2" style={{ width: columnWidths.name }}>
                      <Link
                        href={`/venues/${venue.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {venue.name}
                      </Link>
                    </td>
                  )}
                  {columnVisibility.type && (
                    <td className="border-r border-gray-200 p-2" style={{ width: columnWidths.type }}>
                      {venue.type}
                    </td>
                  )}
                  {columnVisibility.locality && (
                    <td className="border-r border-gray-200 p-2" style={{ width: columnWidths.locality }}>
                      {venue.locality}
                    </td>
                  )}
                  {columnVisibility.website_url && (
                    <td className="border-r border-gray-200 p-2" style={{ width: columnWidths.website_url }}>
                      {venue.website_url && (
                        <a
                          href={venue.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 truncate block"
                        >
                          {venue.website_url.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </td>
                  )}
                  {columnVisibility.artist_summary && (
                    <td className="border-r border-gray-200 p-2" style={{ width: columnWidths.artist_summary }}>
                      <div className="truncate" title={venue.artist_summary}>
                        {venue.artist_summary}
                      </div>
                    </td>
                  )}
                  {columnVisibility.visitor_summary && (
                    <td className="border-r border-gray-200 p-2" style={{ width: columnWidths.visitor_summary }}>
                      <div className="truncate" title={venue.visitor_summary}>
                        {venue.visitor_summary}
                      </div>
                    </td>
                  )}
                  {columnVisibility.instagram && (
                    <td className="border-r border-gray-200 p-2" style={{ width: columnWidths.instagram }}>
                      {venue.instagram && (
                        <a
                          href={venue.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Instagram
                        </a>
                      )}
                    </td>
                  )}
                  {columnVisibility.facebook && (
                    <td className="border-r border-gray-200 p-2" style={{ width: columnWidths.facebook }}>
                      {venue.facebook && (
                        <a
                          href={venue.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Facebook
                        </a>
                      )}
                    </td>
                  )}
                  {columnVisibility.address && (
                    <td className="border-r border-gray-200 p-2" style={{ width: columnWidths.address }}>
                      <div className="truncate" title={venue.address}>
                        {venue.address}
                      </div>
                    </td>
                  )}
                  {columnVisibility.public_transit && (
                    <td className="p-2" style={{ width: columnWidths.public_transit }}>
                      {venue.public_transit && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          venue.public_transit === 'yes' ? 'bg-green-100 text-green-800' :
                          venue.public_transit === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {venue.public_transit}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {venues.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            No venues found. Try adjusting your search criteria.
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>

            <span className="px-4 py-2 text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

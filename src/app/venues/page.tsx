'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Venue {
  id: string;
  name: string;
  type: string;
  locality: string;
  region_code: string;
  public_transit?: 'yes' | 'partial' | 'no';
  website_url?: string;
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

  const fetchVenues = async (page = 1, search = '', filterParams = filters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '20',
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

  if (loading && venues.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading venues...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Art Venues</h1>

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

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <div key={venue.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <h3 className="text-xl font-semibold mb-2">
                  <Link
                    href={`/venues/${venue.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {venue.name}
                  </Link>
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Type:</span> {venue.type}</p>
                  <p><span className="font-medium">Location:</span> {venue.locality}</p>
                  {venue.public_transit && (
                    <p><span className="font-medium">Transit:</span> {venue.public_transit}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  {venue.website_url && (
                    <a
                      href={venue.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Website
                    </a>
                  )}
                  {venue.facebook && (
                    <a
                      href={venue.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Facebook
                    </a>
                  )}
                  {venue.instagram && (
                    <a
                      href={venue.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Instagram
                    </a>
                  )}
                </div>
                <Link
                  href={`/venues/${venue.id}`}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
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

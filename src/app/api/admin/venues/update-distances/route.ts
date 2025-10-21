import { NextRequest, NextResponse } from 'next/server';
import { updateVenueDistances } from '@/lib/venues';
import { requireAdmin } from '@/lib/rbac';

/**
 * POST /api/admin/venues/update-distances
 * Update distance calculations for all venues from Park Street
 * (Admin only endpoint)
 */
export async function POST(request: NextRequest) {
  // Check admin permissions
  const rbacResult = await requireAdmin(request);
  if (rbacResult) return rbacResult;

  try {
    console.log('🔄 Starting venue distance update...');
    const result = await updateVenueDistances();

    console.log(`✅ Distance update complete: ${result.updated} updated, ${result.skipped} skipped`);

    return NextResponse.json({
      success: true,
      message: 'Venue distances updated successfully',
      updated: result.updated,
      skipped: result.skipped,
    });

  } catch (error) {
    console.error('❌ Venue distance update error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update venue distances',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

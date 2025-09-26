import { NextRequest, NextResponse } from 'next/server';
import { validateProjectIds } from '@/lib/utils/project-validation';
import { processBatchDelete, generateBatchResponse } from '@/lib/utils/batch-operations';
import { calculateResourcesFreed } from '@/lib/utils/project-operations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectIds, force = false } = body;

    // Validate request body
    const validation = validateProjectIds(projectIds, 20);
    if (!validation.isValid) {
      return validation.error!;
    }

    // TODO: Replace with actual authentication check
    // const authResult = await verifyAuth();
    // if (!authResult.success) {
    //   return authResult.error;
    // }

    // TODO: Check if user is admin for force deletion
    // const isAdmin = await checkAdminPermissions();
    // if (force && !isAdmin) {
    //   return NextResponse.json(
    //     { error: 'Force deletion requires admin permissions' },
    //     { status: 403 }
    //   );
    // }

    // Process batch deletion
    const results = await processBatchDelete(
      projectIds,
      force
      // currentUserId, // Pass when authentication is implemented
      // isAdmin // Pass when admin check is implemented
    );

    // Calculate resources freed
    const resourcesFreed = calculateResourcesFreed(
      results.successful as Array<{ filesDeleted: number }>
    );

    // Generate response with additional data
    return generateBatchResponse(
      results,
      'delete',
      projectIds.length,
      {
        summary: {
          totalRequested: projectIds.length,
          totalSuccessful: results.successful.length,
          totalFailed: results.failed.length,
          totalSkipped: results.skipped.length,
          forceMode: force
        },
        resourcesFreed,
      }
    );

  } catch (error) {
    console.error('Batch delete failed:', error);
    return NextResponse.json(
      { error: 'Failed to process batch deletion' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { validateProjectIds } from '@/lib/utils/project-validation';
import { processBatchRestore, generateBatchResponse } from '@/lib/utils/batch-operations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectIds } = body;

    // Validate request body
    const validation = validateProjectIds(projectIds, 50);
    if (!validation.isValid) {
      return validation.error!;
    }

    // TODO: Replace with actual authentication check
    // const authResult = await verifyAuth();
    // if (!authResult.success) {
    //   return authResult.error;
    // }

    // Process batch restoration
    const results = await processBatchRestore(
      projectIds
      // currentUserId, // Pass when authentication is implemented
      // isAdmin // Pass when admin check is implemented
    );

    // Generate response
    return generateBatchResponse(
      results,
      'restore',
      projectIds.length
    );

  } catch (error) {
    console.error('Batch restore failed:', error);
    return NextResponse.json(
      { error: 'Failed to process batch restoration' },
      { status: 500 }
    );
  }
}
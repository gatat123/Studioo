import { getAuthHeaders } from '@/lib/api/helpers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface ArchivedProject {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  archivedAt: string;
  archivedBy: string;
  archivedByName: string;
  deletionDate?: string;
  collaborators: number;
  files: number;
  lastActivity: string;
  canRestore: boolean;
  canDelete: boolean;
  tags?: string[];
}

// Get archived projects
export async function getArchivedProjects(
  page: number = 1,
  limit: number = 12,
  sortBy: string = 'archivedAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ projects: ArchivedProject[]; total: number }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    sortOrder,
  });

  const response = await fetch(`${API_URL}/projects/archived?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch archived projects');
  }

  return response.json();
}

// Archive a project
export async function archiveProject(projectId: string): Promise<void> {
  const response = await fetch(`${API_URL}/projects/${projectId}/archive`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to archive project');
  }
}

// Restore archived project
export async function restoreProject(projectId: string): Promise<void> {
  const response = await fetch(`${API_URL}/projects/${projectId}/restore`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to restore project');
  }
}

// Delete archived project permanently
export async function deleteArchivedProject(projectId: string): Promise<void> {
  const response = await fetch(`${API_URL}/projects/${projectId}/archived`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete archived project');
  }
}

// Search archived projects
export async function searchArchivedProjects(
  query: string,
  filters?: {
    ownerId?: string;
    dateFrom?: string;
    dateTo?: string;
    tags?: string[];
  }
): Promise<ArchivedProject[]> {
  const params = new URLSearchParams({ q: query });

  if (filters?.ownerId) params.append('ownerId', filters.ownerId);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));

  const response = await fetch(`${API_URL}/projects/archived/search?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to search archived projects');
  }

  return response.json();
}

// Batch restore projects
export async function batchRestoreProjects(projectIds: string[]): Promise<void> {
  const response = await fetch(`${API_URL}/projects/archived/batch-restore`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to batch restore projects');
  }
}

// Batch delete archived projects
export async function batchDeleteArchivedProjects(projectIds: string[]): Promise<void> {
  const response = await fetch(`${API_URL}/projects/archived/batch-delete`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to batch delete projects');
  }
}

// Get archive statistics
export async function getArchiveStats(): Promise<{
  totalArchived: number;
  pendingDeletion: number;
  archivedThisMonth: number;
  totalSize: number;
}> {
  const response = await fetch(`${API_URL}/projects/archived/stats`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch archive statistics');
  }

  return response.json();
}
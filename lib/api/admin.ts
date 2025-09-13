import { apiRequest } from './client';

// Admin User Management
export const adminAPI = {
  // Get all users
  getUsers: async () => {
    return apiRequest('/api/admin/users', {
      method: 'GET',
    });
  },

  // Delete user
  deleteUser: async (userId: string) => {
    return apiRequest(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // Get all projects
  getProjects: async () => {
    return apiRequest('/api/admin/projects', {
      method: 'GET',
    });
  },

  // View project as admin (invisible)
  viewProject: async (projectId: string) => {
    return apiRequest(`/api/admin/projects/${projectId}/view`, {
      method: 'POST',
    });
  },

  // Delete project
  deleteProject: async (projectId: string) => {
    return apiRequest(`/api/admin/projects/${projectId}`, {
      method: 'DELETE',
    });
  },

  // Get all channels
  getChannels: async () => {
    return apiRequest('/api/admin/channels', {
      method: 'GET',
    });
  },

  // View channel as admin (invisible)
  viewChannel: async (channelId: string) => {
    return apiRequest(`/api/admin/channels/${channelId}/view`, {
      method: 'POST',
    });
  },

  // Delete channel
  deleteChannel: async (channelId: string) => {
    return apiRequest(`/api/admin/channels/${channelId}`, {
      method: 'DELETE',
    });
  },

  // Get admin statistics
  getStatistics: async () => {
    return apiRequest('/api/admin/statistics', {
      method: 'GET',
    });
  },
};
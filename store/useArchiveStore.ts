import { create } from 'zustand';

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
  deletionDate?: string; // 30 days after archiving
  collaborators: number;
  files: number;
  lastActivity: string;
  canRestore: boolean;
  canDelete: boolean;
  tags?: string[];
}

interface ArchiveState {
  // Projects
  archivedProjects: ArchivedProject[];
  loading: boolean;
  error: string | null;

  // Filters
  searchQuery: string;
  sortBy: 'archivedAt' | 'name' | 'deletionDate';
  sortOrder: 'asc' | 'desc';
  filterByOwner: string | null;
  filterByDateRange: [Date | null, Date | null];

  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;

  // Actions
  setArchivedProjects: (projects: ArchivedProject[]) => void;
  addArchivedProject: (project: ArchivedProject) => void;
  removeArchivedProject: (projectId: string) => void;
  updateArchivedProject: (projectId: string, updates: Partial<ArchivedProject>) => void;

  // Filter actions
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: 'archivedAt' | 'name' | 'deletionDate') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setFilterByOwner: (ownerId: string | null) => void;
  setFilterByDateRange: (range: [Date | null, Date | null]) => void;
  resetFilters: () => void;

  // Pagination actions
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  setTotalItems: (total: number) => void;

  // Loading states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getFilteredProjects: () => ArchivedProject[];
  getPaginatedProjects: () => ArchivedProject[];
}

export const useArchiveStore = create<ArchiveState>((set, get) => ({
  // Initial state
  archivedProjects: [],
  loading: false,
  error: null,

  // Filters
  searchQuery: '',
  sortBy: 'archivedAt',
  sortOrder: 'desc',
  filterByOwner: null,
  filterByDateRange: [null, null],

  // Pagination
  currentPage: 1,
  itemsPerPage: 12,
  totalItems: 0,

  // Actions
  setArchivedProjects: (projects) => {
    set({
      archivedProjects: projects,
      totalItems: projects.length,
    });
  },

  addArchivedProject: (project) => {
    set((state) => ({
      archivedProjects: [project, ...state.archivedProjects],
      totalItems: state.totalItems + 1,
    }));
  },

  removeArchivedProject: (projectId) => {
    set((state) => ({
      archivedProjects: state.archivedProjects.filter((p) => p.id !== projectId),
      totalItems: state.totalItems - 1,
    }));
  },

  updateArchivedProject: (projectId, updates) => {
    set((state) => ({
      archivedProjects: state.archivedProjects.map((p) =>
        p.id === projectId ? { ...p, ...updates } : p
      ),
    }));
  },

  // Filter actions
  setSearchQuery: (query) => {
    set({ searchQuery: query, currentPage: 1 });
  },

  setSortBy: (sortBy) => {
    set({ sortBy, currentPage: 1 });
  },

  setSortOrder: (order) => {
    set({ sortOrder: order, currentPage: 1 });
  },

  setFilterByOwner: (ownerId) => {
    set({ filterByOwner: ownerId, currentPage: 1 });
  },

  setFilterByDateRange: (range) => {
    set({ filterByDateRange: range, currentPage: 1 });
  },

  resetFilters: () => {
    set({
      searchQuery: '',
      sortBy: 'archivedAt',
      sortOrder: 'desc',
      filterByOwner: null,
      filterByDateRange: [null, null],
      currentPage: 1,
    });
  },

  // Pagination actions
  setCurrentPage: (page) => {
    set({ currentPage: page });
  },

  setItemsPerPage: (items) => {
    set({ itemsPerPage: items, currentPage: 1 });
  },

  setTotalItems: (total) => {
    set({ totalItems: total });
  },

  // Loading states
  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    set({ error });
  },

  // Computed
  getFilteredProjects: () => {
    const state = get();
    let filtered = [...state.archivedProjects];

    // Search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.ownerName.toLowerCase().includes(query) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Owner filter
    if (state.filterByOwner) {
      filtered = filtered.filter((p) => p.ownerId === state.filterByOwner);
    }

    // Date range filter
    const [startDate, endDate] = state.filterByDateRange;
    if (startDate || endDate) {
      filtered = filtered.filter((p) => {
        const archivedDate = new Date(p.archivedAt);
        return (!startDate || archivedDate >= startDate) &&
               (!endDate || archivedDate <= endDate);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let compareValue;
      switch (state.sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'deletionDate':
          compareValue = (a.deletionDate || '').localeCompare(b.deletionDate || '');
          break;
        case 'archivedAt':
        default:
          compareValue = new Date(a.archivedAt).getTime() - new Date(b.archivedAt).getTime();
          break;
      }
      return state.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  },

  getPaginatedProjects: () => {
    const state = get();
    const filtered = state.getFilteredProjects();
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const end = start + state.itemsPerPage;
    return filtered.slice(start, end);
  },
}));
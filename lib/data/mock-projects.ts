// Mock archived projects data - centralized to avoid duplication
export interface ArchivedProject {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  archivedAt: string;
  archivedBy: string;
  archivedByName: string;
  deletionDate: string;
  collaborators: number;
  files: number;
  canRestore: boolean;
  canDelete: boolean;
  tags: string[];
  [key: string]: unknown;
}

export interface ActiveProject {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  [key: string]: unknown;
}

// Singleton instance of mock data
class MockProjectStore {
  private static instance: MockProjectStore;
  private archivedProjects: ArchivedProject[] = [];
  private activeProjects: ActiveProject[] = [];

  private constructor() {
    this.initializeData();
  }

  public static getInstance(): MockProjectStore {
    if (!MockProjectStore.instance) {
      MockProjectStore.instance = new MockProjectStore();
    }
    return MockProjectStore.instance;
  }

  private initializeData() {
    this.archivedProjects = [
      {
        id: '1',
        name: '2024 브랜드 리뉴얼',
        description: '새로운 브랜드 아이덴티티 디자인 프로젝트',
        ownerId: 'user1',
        ownerName: '김디자인',
        archivedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        archivedBy: 'user1',
        archivedByName: '김디자인',
        deletionDate: new Date(Date.now() + 86400000 * 25).toISOString(),
        collaborators: 3,
        files: 24,
        canRestore: true,
        canDelete: true,
        tags: ['브랜딩', 'UI/UX'],
      },
      {
        id: '2',
        name: '모바일 앱 UI 개선',
        description: 'iOS/Android 앱 UI 전면 개편',
        ownerId: 'user2',
        ownerName: '이개발',
        archivedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        archivedBy: 'user2',
        archivedByName: '이개발',
        deletionDate: new Date(Date.now() + 86400000 * 15).toISOString(),
        collaborators: 5,
        files: 42,
        canRestore: true,
        canDelete: false,
        tags: ['모바일', 'UI디자인'],
      },
      {
        id: '3',
        name: '웹사이트 리디자인',
        description: '반응형 웹사이트 전면 재설계',
        ownerId: 'user3',
        ownerName: '박웹퍼블',
        archivedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        archivedBy: 'user3',
        archivedByName: '박웹퍼블',
        deletionDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        collaborators: 2,
        files: 18,
        canRestore: false,
        canDelete: true,
        tags: ['웹디자인', '반응형'],
      },
    ];
  }

  public getArchivedProjects(): ArchivedProject[] {
    return this.archivedProjects;
  }

  public getActiveProjects(): ActiveProject[] {
    return this.activeProjects;
  }

  public findArchivedProject(id: string): ArchivedProject | undefined {
    return this.archivedProjects.find(p => p.id === id);
  }

  public removeArchivedProject(id: string): boolean {
    const index = this.archivedProjects.findIndex(p => p.id === id);
    if (index !== -1) {
      this.archivedProjects.splice(index, 1);
      return true;
    }
    return false;
  }

  public addActiveProject(project: ActiveProject): void {
    this.activeProjects.push(project);
  }

  public getArchivedProjectIndex(id: string): number {
    return this.archivedProjects.findIndex(p => p.id === id);
  }
}

export const mockProjectStore = MockProjectStore.getInstance();
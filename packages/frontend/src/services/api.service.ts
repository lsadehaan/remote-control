import type {
  User,
  AuthResponse,
  Project,
  ProjectCreate,
  ProjectUpdate,
  ContainerTemplate,
  Credential,
  ApiResponse
} from '@remote-control/shared';

class ApiService {
  private baseUrl = '/api';
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json() as ApiResponse<T>;

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data.data as T;
  }

  // Auth
  async register(email: string, username: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
    this.setToken(response.token);
    return response;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.token);
    return response;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  logout(): void {
    this.setToken(null);
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects');
  }

  async getProject(id: number): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(data: ProjectCreate): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: number, data: ProjectUpdate): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: number): Promise<void> {
    await this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async startProject(id: number): Promise<Project> {
    return this.request<Project>(`/projects/${id}/start`, {
      method: 'POST',
    });
  }

  async stopProject(id: number): Promise<Project> {
    return this.request<Project>(`/projects/${id}/stop`, {
      method: 'POST',
    });
  }

  async restartProject(id: number): Promise<Project> {
    return this.request<Project>(`/projects/${id}/restart`, {
      method: 'POST',
    });
  }

  async getProjectLogs(id: number, tail?: number): Promise<{ logs: string }> {
    const params = tail ? `?tail=${tail}` : '';
    return this.request<{ logs: string }>(`/projects/${id}/logs${params}`);
  }

  // Project Environment Variables
  async getProjectEnvVars(projectId: number): Promise<EnvVar[]> {
    return this.request<EnvVar[]>(`/projects/${projectId}/env`);
  }

  async setProjectEnvVar(projectId: number, name: string, value: string): Promise<EnvVar> {
    return this.request<EnvVar>(`/projects/${projectId}/env/${name}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  async deleteProjectEnvVar(projectId: number, name: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/env/${name}`, {
      method: 'DELETE',
    });
  }

  // Templates
  async getTemplates(): Promise<ContainerTemplate[]> {
    return this.request<ContainerTemplate[]>('/templates');
  }

  // Credentials
  async getCredentials(): Promise<Credential[]> {
    return this.request<Credential[]>('/credentials');
  }

  async deleteCredential(id: number): Promise<void> {
    await this.request<void>(`/credentials/${id}`, {
      method: 'DELETE',
    });
  }

  async startCredentialSetup(name: string, cliType: string): Promise<CredentialSetupSession> {
    return this.request<CredentialSetupSession>('/credentials/setup/start', {
      method: 'POST',
      body: JSON.stringify({ name, cliType }),
    });
  }

  async getCredentialSetupStatus(sessionId: number): Promise<CredentialSetupStatus> {
    return this.request<CredentialSetupStatus>(`/credentials/setup/${sessionId}/status`);
  }

  async completeCredentialSetup(sessionId: number, name: string): Promise<Credential> {
    return this.request<Credential>(`/credentials/setup/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async cancelCredentialSetup(sessionId: number): Promise<void> {
    await this.request<void>(`/credentials/setup/${sessionId}/cancel`, {
      method: 'POST',
    });
  }
}

interface EnvVar {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface CredentialSetupSession {
  sessionId: number;
  containerId: string;
  cliType: string;
  expiresAt: string;
  instructions: string;
}

interface CredentialSetupStatus {
  sessionId: number;
  status: string;
  cliType: string;
  containerId: string;
  expiresAt: string;
}

export const apiService = new ApiService();

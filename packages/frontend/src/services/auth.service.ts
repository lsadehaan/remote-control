import type { User } from '@remote-control/shared';
import { apiService } from './api.service.js';

type AuthChangeCallback = (user: User | null) => void;

class AuthService {
  private user: User | null = null;
  private listeners: Set<AuthChangeCallback> = new Set();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const token = apiService.getToken();
    if (token) {
      try {
        this.user = await apiService.getMe();
        this.notifyListeners();
      } catch {
        apiService.setToken(null);
        this.user = null;
      }
    }
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  async login(email: string, password: string): Promise<User> {
    const response = await apiService.login(email, password);
    this.user = response.user;
    this.notifyListeners();
    return response.user;
  }

  async register(email: string, username: string, password: string): Promise<User> {
    const response = await apiService.register(email, username, password);
    this.user = response.user;
    this.notifyListeners();
    return response.user;
  }

  logout(): void {
    apiService.logout();
    this.user = null;
    this.notifyListeners();
  }

  subscribe(callback: AuthChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.user);
    }
  }
}

export const authService = new AuthService();

export type Theme = 'dark' | 'light';

type ThemeListener = (theme: Theme) => void;

class ThemeService {
  private theme: Theme;
  private listeners: Set<ThemeListener> = new Set();

  constructor() {
    // Load saved theme or default to dark
    const saved = localStorage.getItem('theme') as Theme | null;
    this.theme = saved || 'dark';
    this.applyTheme();
  }

  getTheme(): Theme {
    return this.theme;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    localStorage.setItem('theme', theme);
    this.applyTheme();
    this.notify();
  }

  toggle(): void {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    listener(this.theme);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.theme);
    }
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.theme);
  }
}

export const themeService = new ThemeService();

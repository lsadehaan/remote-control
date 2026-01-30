import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Router } from '@vaadin/router';
import type { User } from '@remote-control/shared';
import { authService } from '../services/auth.service.js';
import { themeService, type Theme } from '../services/theme.service.js';

import './pages/login-page.js';
import './pages/dashboard-page.js';
import './pages/project-page.js';
import './pages/credentials-page.js';
import './toast-container.js';

@customElement('app-shell')
export class AppShell extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      height: 56px;
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 600;
      font-size: 1.1rem;
      color: var(--color-text);
    }

    .logo-icon {
      width: 28px;
      height: 28px;
      background: var(--color-primary);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    nav {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .nav-link {
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      padding: 0.4rem 0.75rem;
      border-radius: var(--radius-sm);
      transition: all 0.2s;
    }

    .nav-link:hover {
      color: var(--color-text);
      background: var(--color-bg-tertiary);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--color-text-secondary);
    }

    .logout-btn {
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text);
      padding: 0.4rem 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .logout-btn:hover {
      border-color: var(--color-error);
      color: var(--color-error);
    }

    .theme-toggle {
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text);
      padding: 0.4rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .theme-toggle:hover {
      background: var(--color-bg-tertiary);
    }

    main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    #outlet {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  `;

  @state()
  private user: User | null = null;

  @state()
  private loading = true;

  @state()
  private theme: Theme = 'dark';

  private router!: Router;
  private themeUnsubscribe?: () => void;

  async connectedCallback() {
    super.connectedCallback();

    // Initialize auth
    await authService.init();
    this.user = authService.getUser();
    this.loading = false;

    // Subscribe to auth changes
    authService.subscribe((user) => {
      this.user = user;
      this.updateRoutes();
    });

    // Subscribe to theme changes
    this.themeUnsubscribe = themeService.subscribe((theme) => {
      this.theme = theme;
    });

    // Initialize router after first render
    this.updateComplete.then(() => {
      this.initRouter();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.themeUnsubscribe?.();
  }

  private initRouter() {
    const outlet = this.shadowRoot?.getElementById('outlet');
    if (!outlet) return;

    this.router = new Router(outlet);
    this.updateRoutes();
  }

  private updateRoutes() {
    if (!this.router) return;

    if (this.user) {
      this.router.setRoutes([
        { path: '/', component: 'dashboard-page' },
        { path: '/project/:id', component: 'project-page' },
        { path: '/credentials', component: 'credentials-page' },
        { path: '(.*)', redirect: '/' },
      ]);
    } else {
      this.router.setRoutes([
        { path: '/', component: 'login-page' },
        { path: '/login', component: 'login-page' },
        { path: '(.*)', redirect: '/login' },
      ]);
    }
  }

  private handleLogout() {
    authService.logout();
  }

  private handleToggleTheme() {
    themeService.toggle();
  }

  private renderThemeIcon() {
    if (this.theme === 'dark') {
      // Sun icon for switching to light
      return html`
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      `;
    } else {
      // Moon icon for switching to dark
      return html`
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      `;
    }
  }

  render() {
    if (this.loading) {
      return html`<div style="display:flex;align-items:center;justify-content:center;height:100vh;">Loading...</div>`;
    }

    return html`
      <header>
        <a href="/" class="logo">
          <div class="logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          Remote Control
        </a>
        <nav>
          ${this.user ? html`
            <a href="/credentials" class="nav-link">Credentials</a>
            <span class="user-info">
              ${this.user.username} (${this.user.role})
            </span>
            <button class="logout-btn" @click=${this.handleLogout}>
              Logout
            </button>
          ` : ''}
          <button class="theme-toggle" @click=${this.handleToggleTheme} title="Toggle theme">
            ${this.renderThemeIcon()}
          </button>
        </nav>
      </header>
      <main>
        <div id="outlet"></div>
      </main>
      <toast-container></toast-container>
    `;
  }
}

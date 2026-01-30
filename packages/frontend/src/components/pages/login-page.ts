import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { authService } from '../../services/auth.service.js';
import { toastService } from '../../services/toast.service.js';

@customElement('login-page')
export class LoginPage extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      padding: 2rem;
    }

    .card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 2rem;
      width: 100%;
      max-width: 400px;
    }

    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      text-align: center;
    }

    .subtitle {
      color: var(--color-text-secondary);
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .tabs {
      display: flex;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }

    .tab {
      flex: 1;
      padding: 0.75rem;
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }

    .tab.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }

    .form-group {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: 0.375rem;
    }

    input {
      width: 100%;
      padding: 0.625rem 0.75rem;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text);
      font-size: 0.9rem;
      transition: border-color 0.2s;
    }

    input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .submit-btn {
      width: 100%;
      padding: 0.75rem;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 0.5rem;
    }

    .submit-btn:hover {
      background: var(--color-primary-hover);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--color-error);
      color: var(--color-error);
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
  `;

  @state()
  private mode: 'login' | 'register' = 'login';

  @state()
  private email = '';

  @state()
  private username = '';

  @state()
  private password = '';

  @state()
  private loading = false;

  @state()
  private error = '';

  private async handleSubmit(e: Event) {
    e.preventDefault();
    this.error = '';
    this.loading = true;

    try {
      if (this.mode === 'login') {
        await authService.login(this.email, this.password);
        toastService.success('Welcome back!');
      } else {
        await authService.register(this.email, this.username, this.password);
        toastService.success('Account created successfully');
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <div class="card">
        <h1>Remote Control</h1>
        <p class="subtitle">Manage your AI coding agents</p>

        <div class="tabs">
          <button
            class="tab ${this.mode === 'login' ? 'active' : ''}"
            @click=${() => { this.mode = 'login'; this.error = ''; }}
          >
            Login
          </button>
          <button
            class="tab ${this.mode === 'register' ? 'active' : ''}"
            @click=${() => { this.mode = 'register'; this.error = ''; }}
          >
            Register
          </button>
        </div>

        ${this.error ? html`<div class="error">${this.error}</div>` : ''}

        <form @submit=${this.handleSubmit}>
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              autocomplete="email"
              .value=${this.email}
              @input=${(e: Event) => this.email = (e.target as HTMLInputElement).value}
              required
            />
          </div>

          ${this.mode === 'register' ? html`
            <div class="form-group">
              <label for="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                autocomplete="username"
                .value=${this.username}
                @input=${(e: Event) => this.username = (e.target as HTMLInputElement).value}
                required
                minlength="3"
              />
            </div>
          ` : ''}

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              autocomplete=${this.mode === 'register' ? 'new-password' : 'current-password'}
              .value=${this.password}
              @input=${(e: Event) => this.password = (e.target as HTMLInputElement).value}
              required
              minlength="8"
            />
          </div>

          <button type="submit" class="submit-btn" ?disabled=${this.loading}>
            ${this.loading ? 'Loading...' : (this.mode === 'login' ? 'Login' : 'Register')}
          </button>
        </form>
      </div>
    `;
  }
}

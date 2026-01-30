import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { apiService } from '../services/api.service.js';

// Import lit-shell.js UI component
import 'lit-shell.js/ui/browser';

@customElement('terminal-view')
export class TerminalView extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex: 1;
      background: #1e1e1e;
      overflow: hidden;
    }

    lit-shell-terminal {
      flex: 1;
      --ls-bg: #1e1e1e;
      --ls-bg-header: #2d2d2d;
      --ls-text: #e0e0e0;
      --ls-text-muted: #808080;
      --ls-border: #3e3e3e;
      --ls-terminal-bg: #0f0f0f;
      --ls-terminal-fg: #e0e0e0;
      --ls-terminal-cursor: #e0e0e0;
      --ls-terminal-selection: #6366f150;
      --ls-btn-bg: #3c3c3c;
      --ls-btn-text: #e0e0e0;
      --ls-btn-hover: #4a4a4a;
      --ls-status-connected: #22c55e;
      --ls-status-disconnected: #ef4444;
    }

    .not-running {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--color-text-secondary);
      flex-direction: column;
      gap: 0.5rem;
    }

    .error {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--color-error);
    }
  `;

  @property({ type: Number })
  projectId = 0;

  @property({ type: String })
  containerId = '';

  @state()
  private wsUrl = '';

  @state()
  private error = '';

  connectedCallback() {
    super.connectedCallback();
    this.setupWebSocketUrl();
  }

  private setupWebSocketUrl() {
    const token = apiService.getToken();
    if (!token) {
      this.error = 'Not authenticated';
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.wsUrl = `${protocol}//${window.location.host}/ws/terminal?projectId=${this.projectId}&token=${token}`;
  }

  render() {
    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    if (!this.wsUrl) {
      return html`<div class="not-running">Initializing terminal...</div>`;
    }

    return html`
      <lit-shell-terminal
        url=${this.wsUrl}
        theme="dark"
        auto-connect
        auto-spawn
        no-header
      ></lit-shell-terminal>
    `;
  }
}

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { apiService } from '../services/api.service.js';

// Import x-files.js UI component
import 'x-files.js/ui/browser';

@customElement('file-browser')
export class FileBrowser extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    x-files-browser {
      flex: 1;
      --xf-bg: var(--color-bg);
      --xf-bg-secondary: var(--color-bg-secondary);
      --xf-text: var(--color-text);
      --xf-text-muted: var(--color-text-secondary);
      --xf-border: var(--color-border);
      --xf-primary: var(--color-primary);
      --xf-folder: var(--color-warning);
      --xf-error: var(--color-error);
      --xf-success: var(--color-success);
    }

    .not-connected {
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
  projectId!: number;

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
    this.wsUrl = `${protocol}//${window.location.host}/ws/files?projectId=${this.projectId}&token=${token}`;
  }

  private handleSelect(e: CustomEvent) {
    console.log('File selected:', e.detail.file);
  }

  private handleOpen(e: CustomEvent) {
    console.log('File opened:', e.detail.file);
  }

  render() {
    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    if (!this.wsUrl) {
      return html`<div class="not-connected">Initializing file browser...</div>`;
    }

    return html`
      <x-files-browser
        url=${this.wsUrl}
        path="/"
        @select=${this.handleSelect}
        @open=${this.handleOpen}
      ></x-files-browser>
    `;
  }
}

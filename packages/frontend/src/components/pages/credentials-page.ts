import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { Credential } from '@remote-control/shared';
import { CLI_TYPES } from '@remote-control/shared';
import { apiService } from '../../services/api.service.js';
import { toastService } from '../../services/toast.service.js';
import '../terminal-view.js';

interface SetupSession {
  sessionId: number;
  containerId: string;
  cliType: string;
  expiresAt: string;
  instructions: string;
}

@customElement('credentials-page')
export class CredentialsPage extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 1.5rem;
      overflow: auto;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }

    .add-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .add-btn:hover {
      opacity: 0.9;
    }

    .credentials-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .credential-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .credential-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .credential-name {
      font-weight: 500;
    }

    .credential-meta {
      font-size: 0.8rem;
      color: var(--color-text-secondary);
    }

    .credential-type {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-family: var(--font-mono);
    }

    .delete-btn {
      padding: 0.4rem 0.75rem;
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text-secondary);
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .delete-btn:hover {
      border-color: var(--color-error);
      color: var(--color-error);
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--color-text-secondary);
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .modal {
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid var(--color-border);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.1rem;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
    }

    .modal-body {
      flex: 1;
      padding: 1rem;
      overflow: auto;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.625rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text);
      font-size: 0.875rem;
    }

    .instructions {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 1rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      white-space: pre-wrap;
    }

    .terminal-container {
      height: 300px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem;
      border-top: 1px solid var(--color-border);
    }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text);
    }

    .btn-secondary:hover {
      border-color: var(--color-text-secondary);
    }

    .btn-primary {
      background: var(--color-primary);
      border: 1px solid var(--color-primary);
      color: white;
    }

    .btn-primary:hover {
      opacity: 0.9;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--color-text-secondary);
      text-decoration: none;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .back-link:hover {
      color: var(--color-text);
    }
  `;

  @state()
  private credentials: Credential[] = [];

  @state()
  private loading = true;

  @state()
  private showSetupModal = false;

  @state()
  private setupStep: 'form' | 'auth' | 'complete' = 'form';

  @state()
  private setupSession: SetupSession | null = null;

  @state()
  private credentialName = '';

  @state()
  private selectedCliType = 'claude-code';

  @state()
  private actionLoading = false;

  connectedCallback() {
    super.connectedCallback();
    this.loadCredentials();
  }

  private async loadCredentials() {
    try {
      this.credentials = await apiService.getCredentials();
    } catch (err) {
      console.error('Failed to load credentials:', err);
      toastService.error('Failed to load credentials');
    } finally {
      this.loading = false;
    }
  }

  private async handleDelete(credential: Credential) {
    if (!confirm(`Delete credential "${credential.name}"?`)) return;

    try {
      await apiService.deleteCredential(credential.id);
      toastService.success('Credential deleted');
      await this.loadCredentials();
    } catch (err) {
      console.error('Failed to delete credential:', err);
      toastService.error('Failed to delete credential');
    }
  }

  private openSetupModal() {
    this.showSetupModal = true;
    this.setupStep = 'form';
    this.setupSession = null;
    this.credentialName = '';
    this.selectedCliType = 'claude-code';
  }

  private closeSetupModal() {
    // Cancel any active session
    if (this.setupSession) {
      apiService.cancelCredentialSetup(this.setupSession.sessionId).catch(() => {});
    }
    this.showSetupModal = false;
    this.setupSession = null;
  }

  private async startSetup() {
    if (!this.credentialName.trim()) return;

    this.actionLoading = true;
    try {
      this.setupSession = await apiService.startCredentialSetup(
        this.credentialName,
        this.selectedCliType
      );
      this.setupStep = 'auth';
      toastService.info('Setup session started. Complete authentication in the terminal.');
    } catch (err) {
      console.error('Failed to start setup:', err);
      toastService.error('Failed to start credential setup');
    } finally {
      this.actionLoading = false;
    }
  }

  private async completeSetup() {
    if (!this.setupSession) return;

    this.actionLoading = true;
    try {
      await apiService.completeCredentialSetup(
        this.setupSession.sessionId,
        this.credentialName
      );
      this.setupStep = 'complete';
      toastService.success('Credential saved successfully');
      await this.loadCredentials();

      // Close modal after a short delay
      setTimeout(() => {
        this.closeSetupModal();
      }, 2000);
    } catch (err) {
      console.error('Failed to complete setup:', err);
      toastService.error(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      this.actionLoading = false;
    }
  }

  private formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  render() {
    return html`
      <a href="/" class="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Dashboard
      </a>

      <div class="header">
        <h1>Credentials</h1>
        <button class="add-btn" @click=${this.openSetupModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Credential
        </button>
      </div>

      ${this.loading ? html`
        <div class="empty-state">Loading credentials...</div>
      ` : this.credentials.length === 0 ? html`
        <div class="empty-state">
          <p>No credentials stored yet.</p>
          <p>Add credentials to automatically authenticate CLI tools in your containers.</p>
        </div>
      ` : html`
        <div class="credentials-list">
          ${this.credentials.map(cred => html`
            <div class="credential-card">
              <div class="credential-info">
                <span class="credential-name">${cred.name}</span>
                <span class="credential-meta">
                  <span class="credential-type">${cred.cliType}</span>
                  &middot; Added ${this.formatDate(cred.createdAt)}
                </span>
              </div>
              <button class="delete-btn" @click=${() => this.handleDelete(cred)}>
                Delete
              </button>
            </div>
          `)}
        </div>
      `}

      ${this.showSetupModal ? html`
        <div class="modal-overlay" @click=${(e: Event) => e.target === e.currentTarget && this.closeSetupModal()}>
          <div class="modal">
            <div class="modal-header">
              <h2>
                ${this.setupStep === 'form' ? 'Add Credential' :
                  this.setupStep === 'auth' ? 'Authenticate CLI' :
                  'Setup Complete'}
              </h2>
              <button class="close-btn" @click=${this.closeSetupModal}>&times;</button>
            </div>

            <div class="modal-body">
              ${this.setupStep === 'form' ? html`
                <div class="form-group">
                  <label for="cred-name">Credential Name</label>
                  <input
                    id="cred-name"
                    type="text"
                    placeholder="e.g., My Claude Code Credentials"
                    .value=${this.credentialName}
                    @input=${(e: Event) => this.credentialName = (e.target as HTMLInputElement).value}
                  />
                </div>
                <div class="form-group">
                  <label for="cli-type">CLI Type</label>
                  <select
                    id="cli-type"
                    .value=${this.selectedCliType}
                    @change=${(e: Event) => this.selectedCliType = (e.target as HTMLSelectElement).value}
                  >
                    ${CLI_TYPES.map(type => html`
                      <option value=${type}>${type}</option>
                    `)}
                  </select>
                </div>
              ` : this.setupStep === 'auth' && this.setupSession ? html`
                <div class="instructions">${this.setupSession.instructions}</div>
                <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
                  Complete the authentication in the terminal below, then click "Complete Setup".
                </p>
                <div class="terminal-container">
                  <terminal-view .projectId=${0} .containerId=${this.setupSession.containerId}></terminal-view>
                </div>
              ` : html`
                <div style="text-align: center; padding: 2rem;">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <p style="margin-top: 1rem;">Credential saved successfully!</p>
                </div>
              `}
            </div>

            ${this.setupStep !== 'complete' ? html`
              <div class="modal-footer">
                <button class="btn btn-secondary" @click=${this.closeSetupModal}>
                  Cancel
                </button>
                ${this.setupStep === 'form' ? html`
                  <button
                    class="btn btn-primary"
                    @click=${this.startSetup}
                    ?disabled=${!this.credentialName.trim() || this.actionLoading}
                  >
                    ${this.actionLoading ? 'Starting...' : 'Start Setup'}
                  </button>
                ` : html`
                  <button
                    class="btn btn-primary"
                    @click=${this.completeSetup}
                    ?disabled=${this.actionLoading}
                  >
                    ${this.actionLoading ? 'Saving...' : 'Complete Setup'}
                  </button>
                `}
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
    `;
  }
}

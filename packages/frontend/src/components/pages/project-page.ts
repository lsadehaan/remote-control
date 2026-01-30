import { LitElement, html, css } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import type { Project } from '@remote-control/shared';
import { apiService } from '../../services/api.service.js';
import { toastService } from '../../services/toast.service.js';
import '../terminal-view.js';
import '../file-browser.js';

@customElement('project-page')
export class ProjectPage extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.5rem;
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border);
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .back-btn:hover {
      border-color: var(--color-text-secondary);
    }

    .project-info h1 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
    }

    .project-info .meta {
      color: var(--color-text-secondary);
      font-size: 0.8rem;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-running {
      background: rgba(34, 197, 94, 0.15);
      color: var(--color-success);
    }

    .status-stopped {
      background: rgba(239, 68, 68, 0.15);
      color: var(--color-error);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.4rem 0.75rem;
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text);
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: var(--color-border);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn.start {
      background: rgba(34, 197, 94, 0.15);
      border-color: var(--color-success);
      color: var(--color-success);
    }

    .action-btn.stop {
      background: rgba(239, 68, 68, 0.15);
      border-color: var(--color-error);
      color: var(--color-error);
    }

    .tabs {
      display: flex;
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border);
    }

    .tab {
      padding: 0.75rem 1.25rem;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab:hover {
      color: var(--color-text);
    }

    .tab.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }

    .content {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .tab-panel {
      flex: 1;
      display: none;
      overflow: hidden;
    }

    .tab-panel.active {
      display: flex;
    }

    .logs-panel {
      flex-direction: column;
      padding: 1rem;
    }

    .logs-container {
      flex: 1;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      overflow: auto;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      padding: 1rem;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .env-panel {
      flex-direction: column;
      padding: 1rem;
      gap: 1rem;
    }

    .env-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .env-header h2 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }

    .env-add-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.4rem 0.75rem;
      background: var(--color-primary);
      border: none;
      border-radius: var(--radius-sm);
      color: white;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .env-add-btn:hover {
      opacity: 0.9;
    }

    .env-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .env-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }

    .env-name {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .env-actions {
      display: flex;
      gap: 0.5rem;
    }

    .env-delete-btn {
      padding: 0.25rem 0.5rem;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      font-size: 0.75rem;
      cursor: pointer;
    }

    .env-delete-btn:hover {
      border-color: var(--color-error);
      color: var(--color-error);
    }

    .env-form {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }

    .env-form input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text);
      font-size: 0.875rem;
    }

    .env-form input.env-name-input {
      flex: 0 0 200px;
      font-family: var(--font-mono);
      text-transform: uppercase;
    }

    .env-form-actions {
      display: flex;
      gap: 0.5rem;
    }

    .env-save-btn {
      padding: 0.5rem 1rem;
      background: var(--color-primary);
      border: none;
      border-radius: var(--radius-sm);
      color: white;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .env-cancel-btn {
      padding: 0.5rem 1rem;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text);
      font-size: 0.8rem;
      cursor: pointer;
    }

    .env-empty {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-secondary);
    }

    .env-note {
      font-size: 0.8rem;
      color: var(--color-text-secondary);
      padding: 0.75rem;
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-sm);
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--color-text-secondary);
    }

    .error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 1rem;
      color: var(--color-error);
    }
  `;

  @property({ type: Object })
  location!: { params: { id: string } };

  @state()
  private project: Project | null = null;

  @state()
  private loading = true;

  @state()
  private error = '';

  @state()
  private activeTab: 'terminal' | 'files' | 'env' | 'logs' = 'terminal';

  @state()
  private logs = '';

  @state()
  private actionLoading = false;

  @state()
  private envVars: Array<{ id: number; name: string; created_at: string; updated_at: string }> = [];

  @state()
  private showEnvForm = false;

  @state()
  private newEnvName = '';

  @state()
  private newEnvValue = '';

  @state()
  private envLoading = false;

  connectedCallback() {
    super.connectedCallback();
    this.loadProject();
  }

  private async loadProject() {
    try {
      const projectId = Number(this.location.params.id);
      this.project = await apiService.getProject(projectId);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load project';
      toastService.error(this.error);
    } finally {
      this.loading = false;
    }
  }

  private async handleStart() {
    if (!this.project) return;
    this.actionLoading = true;
    try {
      this.project = await apiService.startProject(this.project.id);
      toastService.success('Container started');
    } catch (err) {
      console.error('Failed to start:', err);
      toastService.error('Failed to start container');
    } finally {
      this.actionLoading = false;
    }
  }

  private async handleStop() {
    if (!this.project) return;
    this.actionLoading = true;
    try {
      this.project = await apiService.stopProject(this.project.id);
      toastService.success('Container stopped');
    } catch (err) {
      console.error('Failed to stop:', err);
      toastService.error('Failed to stop container');
    } finally {
      this.actionLoading = false;
    }
  }

  private async handleRestart() {
    if (!this.project) return;
    this.actionLoading = true;
    try {
      this.project = await apiService.restartProject(this.project.id);
      toastService.success('Container restarted');
    } catch (err) {
      console.error('Failed to restart:', err);
      toastService.error('Failed to restart container');
    } finally {
      this.actionLoading = false;
    }
  }

  private async loadLogs() {
    if (!this.project) return;
    try {
      const result = await apiService.getProjectLogs(this.project.id, 500);
      this.logs = result.logs;
    } catch (err) {
      console.error('Failed to load logs:', err);
      toastService.error('Failed to load logs');
    }
  }

  private async loadEnvVars() {
    if (!this.project) return;
    try {
      this.envVars = await apiService.getProjectEnvVars(this.project.id);
    } catch (err) {
      console.error('Failed to load env vars:', err);
      toastService.error('Failed to load environment variables');
    }
  }

  private async handleAddEnvVar() {
    if (!this.project || !this.newEnvName.trim()) return;

    // Validate name format
    const nameRegex = /^[A-Z_][A-Z0-9_]*$/;
    if (!nameRegex.test(this.newEnvName.toUpperCase())) {
      toastService.error('Name must be uppercase letters, numbers, and underscores');
      return;
    }

    this.envLoading = true;
    try {
      await apiService.setProjectEnvVar(
        this.project.id,
        this.newEnvName.toUpperCase(),
        this.newEnvValue
      );
      toastService.success('Environment variable added');
      this.showEnvForm = false;
      this.newEnvName = '';
      this.newEnvValue = '';
      await this.loadEnvVars();
    } catch (err) {
      console.error('Failed to add env var:', err);
      toastService.error('Failed to add environment variable');
    } finally {
      this.envLoading = false;
    }
  }

  private async handleDeleteEnvVar(name: string) {
    if (!this.project) return;
    if (!confirm(`Delete environment variable "${name}"?`)) return;

    try {
      await apiService.deleteProjectEnvVar(this.project.id, name);
      toastService.success('Environment variable deleted');
      await this.loadEnvVars();
    } catch (err) {
      console.error('Failed to delete env var:', err);
      toastService.error('Failed to delete environment variable');
    }
  }

  private setActiveTab(tab: 'terminal' | 'files' | 'env' | 'logs') {
    this.activeTab = tab;
    if (tab === 'logs') {
      this.loadLogs();
    } else if (tab === 'env') {
      this.loadEnvVars();
    }
  }

  private goBack() {
    window.location.href = '/';
  }

  private isRunning(): boolean {
    return this.project?.containerStatus === 'running';
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading project...</div>`;
    }

    if (this.error || !this.project) {
      return html`
        <div class="error">
          <span>${this.error || 'Project not found'}</span>
          <button class="back-btn" @click=${this.goBack}>Go Back</button>
        </div>
      `;
    }

    const isRunning = this.isRunning();

    return html`
      <div class="toolbar">
        <div class="toolbar-left">
          <button class="back-btn" @click=${this.goBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <div class="project-info">
            <h1>${this.project.name}</h1>
            <span class="meta">${this.project.cliType}</span>
          </div>
        </div>
        <div class="toolbar-right">
          <span class="status-badge ${isRunning ? 'status-running' : 'status-stopped'}">
            <span class="status-dot"></span>
            ${this.project.containerStatus || 'Not created'}
          </span>
          ${isRunning ? html`
            <button class="action-btn stop" @click=${this.handleStop} ?disabled=${this.actionLoading}>
              Stop
            </button>
            <button class="action-btn" @click=${this.handleRestart} ?disabled=${this.actionLoading}>
              Restart
            </button>
          ` : html`
            <button class="action-btn start" @click=${this.handleStart} ?disabled=${this.actionLoading}>
              Start
            </button>
          `}
        </div>
      </div>

      <div class="tabs">
        <button
          class="tab ${this.activeTab === 'terminal' ? 'active' : ''}"
          @click=${() => this.setActiveTab('terminal')}
        >
          Terminal
        </button>
        <button
          class="tab ${this.activeTab === 'files' ? 'active' : ''}"
          @click=${() => this.setActiveTab('files')}
        >
          Files
        </button>
        <button
          class="tab ${this.activeTab === 'env' ? 'active' : ''}"
          @click=${() => this.setActiveTab('env')}
        >
          Environment
        </button>
        <button
          class="tab ${this.activeTab === 'logs' ? 'active' : ''}"
          @click=${() => this.setActiveTab('logs')}
        >
          Logs
        </button>
      </div>

      <div class="content">
        <div class="tab-panel ${this.activeTab === 'terminal' ? 'active' : ''}">
          ${isRunning ? html`
            <terminal-view .projectId=${this.project.id}></terminal-view>
          ` : html`
            <div class="loading">Start the container to access the terminal</div>
          `}
        </div>

        <div class="tab-panel ${this.activeTab === 'files' ? 'active' : ''}">
          <file-browser .projectId=${this.project.id}></file-browser>
        </div>

        <div class="tab-panel env-panel ${this.activeTab === 'env' ? 'active' : ''}">
          <div class="env-header">
            <h2>Environment Variables</h2>
            <button class="env-add-btn" @click=${() => this.showEnvForm = true}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Variable
            </button>
          </div>

          <div class="env-note">
            Environment variables are injected when the container starts. Restart the container to apply changes.
          </div>

          ${this.showEnvForm ? html`
            <div class="env-form">
              <input
                class="env-name-input"
                type="text"
                placeholder="VARIABLE_NAME"
                .value=${this.newEnvName}
                @input=${(e: Event) => this.newEnvName = (e.target as HTMLInputElement).value.toUpperCase()}
              />
              <input
                type="text"
                placeholder="value"
                .value=${this.newEnvValue}
                @input=${(e: Event) => this.newEnvValue = (e.target as HTMLInputElement).value}
              />
              <div class="env-form-actions">
                <button
                  class="env-save-btn"
                  @click=${this.handleAddEnvVar}
                  ?disabled=${this.envLoading || !this.newEnvName.trim()}
                >
                  ${this.envLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  class="env-cancel-btn"
                  @click=${() => { this.showEnvForm = false; this.newEnvName = ''; this.newEnvValue = ''; }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ` : ''}

          ${this.envVars.length === 0 ? html`
            <div class="env-empty">
              No environment variables configured.
            </div>
          ` : html`
            <div class="env-list">
              ${this.envVars.map(env => html`
                <div class="env-item">
                  <span class="env-name">${env.name}</span>
                  <div class="env-actions">
                    <button class="env-delete-btn" @click=${() => this.handleDeleteEnvVar(env.name)}>
                      Delete
                    </button>
                  </div>
                </div>
              `)}
            </div>
          `}
        </div>

        <div class="tab-panel logs-panel ${this.activeTab === 'logs' ? 'active' : ''}">
          <div class="logs-container">${this.logs || 'No logs available'}</div>
        </div>
      </div>
    `;
  }
}

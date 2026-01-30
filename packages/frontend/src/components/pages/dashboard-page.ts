import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { Project, ContainerTemplate } from '@remote-control/shared';
import { apiService } from '../../services/api.service.js';
import { toastService } from '../../services/toast.service.js';

@customElement('dashboard-page')
export class DashboardPage extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .new-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .new-btn:hover {
      background: var(--color-primary-hover);
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .project-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .project-card:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }

    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .project-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .project-status {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
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

    .status-none {
      background: rgba(160, 160, 160, 0.15);
      color: var(--color-text-secondary);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .project-type {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }

    .project-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-border);
      color: var(--color-text-secondary);
      font-size: 0.8rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--color-text-secondary);
    }

    .empty-state p {
      margin-bottom: 1rem;
    }

    /* Modal styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .modal {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      width: 100%;
      max-width: 450px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: 0.375rem;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 0.625rem 0.75rem;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text);
      font-size: 0.9rem;
    }

    .form-group textarea {
      resize: vertical;
      min-height: 80px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .cancel-btn {
      padding: 0.625rem 1rem;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text);
      font-size: 0.9rem;
      cursor: pointer;
    }

    .cancel-btn:hover {
      border-color: var(--color-text-secondary);
    }

    .create-btn {
      padding: 0.625rem 1rem;
      background: var(--color-primary);
      border: none;
      border-radius: var(--radius-sm);
      color: white;
      font-size: 0.9rem;
      cursor: pointer;
    }

    .create-btn:hover {
      background: var(--color-primary-hover);
    }

    .create-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;

  @state()
  private projects: Project[] = [];

  @state()
  private templates: ContainerTemplate[] = [];

  @state()
  private loading = true;

  @state()
  private showModal = false;

  @state()
  private newProject = {
    name: '',
    description: '',
    templateId: 0,
  };

  @state()
  private creating = false;

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  private async loadData() {
    try {
      const [projects, templates] = await Promise.all([
        apiService.getProjects(),
        apiService.getTemplates(),
      ]);
      this.projects = projects;
      this.templates = templates;
      if (templates.length > 0 && this.templates[0]) {
        this.newProject.templateId = this.templates[0].id;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toastService.error('Failed to load projects');
    } finally {
      this.loading = false;
    }
  }

  private openModal() {
    this.showModal = true;
    this.newProject = {
      name: '',
      description: '',
      templateId: this.templates[0]?.id ?? 0,
    };
  }

  private closeModal() {
    this.showModal = false;
  }

  private async createProject(e: Event) {
    e.preventDefault();
    if (!this.newProject.name || !this.newProject.templateId) return;

    this.creating = true;
    try {
      const template = this.templates.find(t => t.id === this.newProject.templateId);
      if (!template) return;

      const project = await apiService.createProject({
        name: this.newProject.name,
        description: this.newProject.description || undefined,
        cliType: template.cliType,
        templateId: this.newProject.templateId,
      });

      this.projects = [project, ...this.projects];
      this.closeModal();
      toastService.success(`Project "${project.name}" created`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toastService.error('Failed to create project');
    } finally {
      this.creating = false;
    }
  }

  private navigateToProject(projectId: number) {
    window.location.href = `/project/${projectId}`;
  }

  private getStatusClass(status: string | null): string {
    switch (status) {
      case 'running':
        return 'status-running';
      case 'exited':
      case 'dead':
        return 'status-stopped';
      default:
        return 'status-none';
    }
  }

  private formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  render() {
    if (this.loading) {
      return html`<div style="text-align:center;padding:2rem;">Loading...</div>`;
    }

    return html`
      <div class="header">
        <h1>Projects</h1>
        <button class="new-btn" @click=${this.openModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Project
        </button>
      </div>

      ${this.projects.length === 0 ? html`
        <div class="empty-state">
          <p>No projects yet. Create your first project to get started.</p>
          <button class="new-btn" @click=${this.openModal}>Create Project</button>
        </div>
      ` : html`
        <div class="projects-grid">
          ${this.projects.map(project => html`
            <div class="project-card" @click=${() => this.navigateToProject(project.id)}>
              <div class="project-header">
                <span class="project-name">${project.name}</span>
                <span class="project-status ${this.getStatusClass(project.containerStatus)}">
                  <span class="status-dot"></span>
                  ${project.containerStatus || 'Not created'}
                </span>
              </div>
              <div class="project-type">${project.cliType}</div>
              <div class="project-meta">
                <span>Created ${this.formatDate(project.createdAt)}</span>
              </div>
            </div>
          `)}
        </div>
      `}

      ${this.showModal ? html`
        <div class="modal-overlay" @click=${(e: Event) => e.target === e.currentTarget && this.closeModal()}>
          <div class="modal">
            <h2>New Project</h2>
            <form @submit=${this.createProject}>
              <div class="form-group">
                <label>Name</label>
                <input
                  type="text"
                  required
                  .value=${this.newProject.name}
                  @input=${(e: Event) => this.newProject = { ...this.newProject, name: (e.target as HTMLInputElement).value }}
                />
              </div>

              <div class="form-group">
                <label>Template</label>
                <select
                  required
                  .value=${String(this.newProject.templateId)}
                  @change=${(e: Event) => this.newProject = { ...this.newProject, templateId: Number((e.target as HTMLSelectElement).value) }}
                >
                  ${this.templates.map(template => html`
                    <option value=${template.id}>${template.name}</option>
                  `)}
                </select>
              </div>

              <div class="form-group">
                <label>Description (optional)</label>
                <textarea
                  .value=${this.newProject.description}
                  @input=${(e: Event) => this.newProject = { ...this.newProject, description: (e.target as HTMLTextAreaElement).value }}
                ></textarea>
              </div>

              <div class="modal-actions">
                <button type="button" class="cancel-btn" @click=${this.closeModal}>Cancel</button>
                <button type="submit" class="create-btn" ?disabled=${this.creating}>
                  ${this.creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}
    `;
  }
}

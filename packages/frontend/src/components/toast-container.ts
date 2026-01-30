import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { toastService, type Toast } from '../services/toast.service.js';

@customElement('toast-container')
export class ToastContainer extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 1000;
      display: flex;
      flex-direction: column-reverse;
      gap: 0.75rem;
      max-width: 400px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.2s ease-out;
      pointer-events: auto;
    }

    .toast.removing {
      animation: slideOut 0.2s ease-in forwards;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideOut {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }

    .toast-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
    }

    .toast-content {
      flex: 1;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .toast-close {
      flex-shrink: 0;
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .toast-close:hover {
      opacity: 1;
    }

    /* Type-specific styles */
    .toast.success {
      border-left: 3px solid var(--color-success);
    }

    .toast.success .toast-icon {
      color: var(--color-success);
    }

    .toast.error {
      border-left: 3px solid var(--color-error);
    }

    .toast.error .toast-icon {
      color: var(--color-error);
    }

    .toast.info {
      border-left: 3px solid var(--color-primary);
    }

    .toast.info .toast-icon {
      color: var(--color-primary);
    }

    .toast.warning {
      border-left: 3px solid var(--color-warning, #f59e0b);
    }

    .toast.warning .toast-icon {
      color: var(--color-warning, #f59e0b);
    }
  `;

  @state()
  private toasts: Toast[] = [];

  private unsubscribe?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = toastService.subscribe((toasts) => {
      this.toasts = toasts;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  private handleClose(id: string) {
    const toast = this.shadowRoot?.querySelector(`[data-id="${id}"]`);
    if (toast) {
      toast.classList.add('removing');
      setTimeout(() => toastService.remove(id), 200);
    } else {
      toastService.remove(id);
    }
  }

  private renderIcon(type: Toast['type']) {
    switch (type) {
      case 'success':
        return html`
          <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        `;
      case 'error':
        return html`
          <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        `;
      case 'info':
        return html`
          <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        `;
      case 'warning':
        return html`
          <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        `;
    }
  }

  render() {
    return html`
      ${this.toasts.map(toast => html`
        <div class="toast ${toast.type}" data-id="${toast.id}">
          ${this.renderIcon(toast.type)}
          <div class="toast-content">${toast.message}</div>
          <button class="toast-close" @click=${() => this.handleClose(toast.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `)}
    `;
  }
}

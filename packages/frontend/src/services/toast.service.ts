export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

type ToastListener = (toasts: Toast[]) => void;

class ToastService {
  private toasts: Toast[] = [];
  private listeners: Set<ToastListener> = new Set();
  private counter = 0;

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener([...this.toasts]);
    }
  }

  private add(type: ToastType, message: string, duration = 5000): string {
    const id = `toast-${++this.counter}`;
    const toast: Toast = { id, type, message, duration };

    this.toasts = [...this.toasts, toast];
    this.notify();

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }

    return id;
  }

  remove(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  success(message: string, duration?: number): string {
    return this.add('success', message, duration);
  }

  error(message: string, duration?: number): string {
    return this.add('error', message, duration);
  }

  info(message: string, duration?: number): string {
    return this.add('info', message, duration);
  }

  warning(message: string, duration?: number): string {
    return this.add('warning', message, duration);
  }
}

export const toastService = new ToastService();

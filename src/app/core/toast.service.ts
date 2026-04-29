import { Injectable, signal } from '@angular/core';
import { ToastItem } from './social.models';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly stack = signal<ToastItem[]>([]);

  readonly toasts = this.stack.asReadonly();

  show(
    title: string,
    message: string,
    tone: ToastItem['tone'] = 'neutral',
    durationMs = 3200,
  ): void {
    const toast: ToastItem = {
      id: `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      message,
      tone,
    };

    this.stack.update((items) => [...items, toast]);
    window.setTimeout(() => this.dismiss(toast.id), durationMs);
  }

  dismiss(id: string): void {
    this.stack.update((items) => items.filter((toast) => toast.id !== id));
  }
}

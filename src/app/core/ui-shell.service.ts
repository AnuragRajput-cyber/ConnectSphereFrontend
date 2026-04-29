import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class UiShellService {
  private readonly router = inject(Router);

  openAuth(redirectUrl?: string): void {
    void this.router.navigate(['/login'], {
      queryParams: redirectUrl ? { redirect: redirectUrl } : undefined,
    });
  }

  closeAuth(): void {
    // Auth is route-based now, so there is nothing modal-specific to close.
  }
}

import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { AdminSystemOverviewResponse } from '../../core/social.models';

@Component({
  selector: 'app-system-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent],
  templateUrl: './system-dashboard.html',
  styleUrl: './system-dashboard.scss',
})
export class SystemDashboardPage {
  private readonly api = inject(ConnectSphereApiService);

  readonly loading = signal(true);
  readonly overview = signal<AdminSystemOverviewResponse | null>(null);

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  isHealthy(status: string): boolean {
    return status.toUpperCase() === 'UP';
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.overview.set(await this.api.getAdminSystemOverview());
    } finally {
      this.loading.set(false);
    }
  }
}

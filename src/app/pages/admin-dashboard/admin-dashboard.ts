import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { AdminPlatformOverviewResponse, AdminUserResponse, ReportResolutionAction, ReportResponse } from '../../core/social.models';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EmptyStateComponent],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardPage {
  private readonly api = inject(ConnectSphereApiService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionService);

  readonly loading = signal(true);
  readonly overview = signal<AdminPlatformOverviewResponse | null>(null);
  readonly users = signal<AdminUserResponse[]>([]);
  readonly reports = signal<ReportResponse[]>([]);
  readonly busyUserId = signal<string | null>(null);
  readonly busyReportId = signal<string | null>(null);
  readonly broadcastMessage = signal('');
  readonly sendingBroadcast = signal(false);

  constructor() {
    effect(() => {
      void this.load();
    });
  }

  async suspend(userId: string): Promise<void> {
    this.busyUserId.set(userId);
    try {
      await this.api.suspendUser(userId);
      this.users.update((items) => items.map((user) => user.userId === userId ? { ...user, active: false } : user));
      this.toast.show('User suspended', 'The account was suspended successfully.', 'success');
      await this.refreshOverview();
    } catch {
      this.toast.show('Action failed', 'Could not suspend this account.', 'warning');
    } finally {
      this.busyUserId.set(null);
    }
  }

  async reactivate(userId: string): Promise<void> {
    this.busyUserId.set(userId);
    try {
      await this.api.reactivateUser(userId);
      this.users.update((items) => items.map((user) => user.userId === userId ? { ...user, active: true } : user));
      this.toast.show('User reactivated', 'The account is active again.', 'success');
      await this.refreshOverview();
    } catch {
      this.toast.show('Action failed', 'Could not reactivate this account.', 'warning');
    } finally {
      this.busyUserId.set(null);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const confirmed = window.confirm('Delete this user permanently?');
    if (!confirmed) {
      return;
    }

    this.busyUserId.set(userId);
    try {
      await this.api.deleteUserAsAdmin(userId);
      this.users.update((items) => items.filter((user) => user.userId !== userId));
      this.toast.show('User deleted', 'The account was permanently deleted.', 'success');
      await this.refreshOverview();
    } catch {
      this.toast.show('Delete failed', 'Could not delete this account.', 'warning');
    } finally {
      this.busyUserId.set(null);
    }
  }

  async resolveReport(report: ReportResponse, action: ReportResolutionAction): Promise<void> {
    const notes = window.prompt('Optional moderation note', report.resolutionNotes ?? '') ?? '';
    this.busyReportId.set(report.reportId);
    try {
      const resolved = await this.api.resolveReport(report.reportId, action, notes);
      this.reports.update((items) => items.map((item) => item.reportId === resolved.reportId ? resolved : item));
      this.toast.show('Report updated', `The report was ${resolved.status.toLowerCase()}.`, 'success');
    } catch {
      this.toast.show('Resolution failed', 'Could not update this report.', 'warning');
    } finally {
      this.busyReportId.set(null);
    }
  }

  async sendBroadcast(): Promise<void> {
    const currentUser = this.session.user();
    const message = this.broadcastMessage().trim();
    if (!currentUser || !message) {
      return;
    }

    const recipientIds = Array.from(new Set(this.users().filter((user) => user.active).map((user) => user.userId)));
    if (!recipientIds.length) {
      this.toast.show('No recipients', 'There are no active users to notify.', 'neutral');
      return;
    }

    this.sendingBroadcast.set(true);
    try {
      await this.api.sendBulkNotifications({
        recipientIds,
        actorId: currentUser.userId,
        type: 'BROADCAST',
        message,
        targetType: 'SYSTEM',
      });
      this.broadcastMessage.set('');
      this.toast.show('Broadcast sent', 'The platform-wide notification was dispatched.', 'success');
    } catch {
      this.toast.show('Broadcast failed', 'Could not send the broadcast notification.', 'warning');
    } finally {
      this.sendingBroadcast.set(false);
    }
  }

  trackUser(index: number, user: AdminUserResponse): string {
    return user.userId || String(index);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [overview, users, reports] = await Promise.all([
        this.api.getAdminPlatformOverview(),
        this.api.getAdminUsers(),
        this.api.getAdminReports('OPEN').catch(() => []),
      ]);
      this.overview.set(overview);
      this.users.set(users);
      this.reports.set(reports);
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshOverview(): Promise<void> {
    this.overview.set(await this.api.getAdminPlatformOverview());
  }
}

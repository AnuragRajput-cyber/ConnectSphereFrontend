import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';
import { NotificationItemComponent } from '../../components/notification-item/notification-item';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { EnrichedUser, FollowResponse, NotificationResponse } from '../../core/social.models';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { UiShellService } from '../../core/ui-shell.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, NotificationItemComponent, EmptyStateComponent],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications {
  private readonly api = inject(ConnectSphereApiService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly shell = inject(UiShellService);
  private readonly destroyRef = inject(DestroyRef);

  readonly filter = signal<'all' | 'unread'>('all');
  readonly items = signal<NotificationResponse[]>([]);
  readonly followRequests = signal<FollowResponse[]>([]);
  readonly loading = signal(true);
  readonly currentUser = this.session.user;
  readonly actors = signal<Record<string, EnrichedUser>>({});
  readonly notifications = computed(() =>
    this.filter() === 'all'
      ? this.items()
      : this.items().filter((item) => !item.read),
  );
  readonly unreadCount = computed(() => this.items().filter((item) => !item.read).length);
  readonly sections = computed(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - 7);

    const buckets = [
      { label: 'New', items: [] as NotificationResponse[] },
      { label: 'Today', items: [] as NotificationResponse[] },
      { label: 'This Week', items: [] as NotificationResponse[] },
      { label: 'Earlier', items: [] as NotificationResponse[] },
    ];

    for (const item of this.notifications()) {
      const createdAt = new Date(item.createdAt);
      if (!item.read) {
        buckets[0].items.push(item);
        continue;
      }
      if (createdAt >= startOfToday) {
        buckets[1].items.push(item);
        continue;
      }
      if (createdAt >= startOfWeek) {
        buckets[2].items.push(item);
        continue;
      }
      buckets[3].items.push(item);
    }

    return buckets.filter((bucket) => bucket.items.length);
  });

  constructor() {
    effect(() => {
      this.currentUser();
      void this.load();
    });

    interval(15000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.load());
  }

  actorName(actorId: string | null): string {
    if (!actorId) {
      return 'ConnectSphere';
    }
    return this.actors()[actorId]?.fullName || 'ConnectSphere user';
  }

  actorAvatar(actorId: string | null): string | null {
    if (!actorId) {
      return null;
    }
    return this.actors()[actorId]?.profilePicUrl ?? null;
  }

  async acceptRequest(followId: string): Promise<void> {
    try {
      const accepted = await this.api.acceptFollowRequest(followId);
      this.followRequests.update((items) => items.filter((item) => item.followId !== followId));
      const requester = this.actors()[accepted.followerId];
      this.toast.show('Request accepted', `${requester?.fullName || 'The user'} can follow you now.`, 'success');
    } catch {
      this.toast.show('Action failed', 'Could not accept this follow request.', 'warning');
    }
  }

  async rejectRequest(followId: string): Promise<void> {
    try {
      await this.api.rejectFollowRequest(followId);
      this.followRequests.update((items) => items.filter((item) => item.followId !== followId));
      this.toast.show('Request removed', 'The follow request was declined.', 'neutral');
    } catch {
      this.toast.show('Action failed', 'Could not reject this follow request.', 'warning');
    }
  }

  async openRequesterProfile(followerId: string): Promise<void> {
    await this.router.navigate(['/profile', followerId]);
  }

  async mark(notificationId: string): Promise<void> {
    try {
      const updated = await this.api.markNotificationRead(notificationId);
      this.items.update((items) =>
        items.map((item) => (item.notificationId === notificationId ? updated : item)),
      );
    } catch {
      this.toast.show('Update failed', 'Notification could not be marked as read.', 'warning');
    }
  }

  async markAll(): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.shell.openAuth();
      return;
    }

    try {
      const updated = await this.api.markAllNotificationsRead(user.userId);
      this.items.update((items) =>
        items.map((item) => updated.find((entry) => entry.notificationId === item.notificationId) ?? item),
      );
      this.toast.show('All read', 'marked everything as read.', 'success');
    } catch {
      this.toast.show('Update failed', 'Could not mark all notifications as read.', 'warning');
    }
  }

  async remove(notificationId: string): Promise<void> {
    try {
      await this.api.deleteNotification(notificationId);
      this.items.update((items) => items.filter((item) => item.notificationId !== notificationId));
      this.toast.show('Deleted', 'The notification was removed.', 'neutral');
    } catch {
      this.toast.show('Delete failed', 'Could not delete the notification.', 'warning');
    }
  }

  async open(item: NotificationResponse): Promise<void> {
    if (!item.read) {
      await this.mark(item.notificationId);
    }

    switch (item.targetType) {
      case 'USER':
        if (item.targetId) {
          await this.router.navigate(['/profile', item.targetId]);
        }
        return;
      case 'POST':
        if (item.targetId) {
          await this.router.navigate(['/post', item.targetId]);
        }
        return;
      case 'STORY':
        if (item.targetId) {
          await this.router.navigate(['/feed'], { queryParams: { story: item.targetId } });
        }
        return;
      default:
        await this.router.navigate(['/feed']);
    }
  }

  private async load(): Promise<void> {
    const user = this.currentUser();
    this.items.set([]);
    this.followRequests.set([]);
    if (!user) {
      this.loading.set(false);
      return;
    }

    try {
      this.loading.set(true);
      const [items, followRequests] = await Promise.all([
        this.api.getNotifications(user.userId),
        this.api.getPendingFollowRequests(user.userId).catch(() => []),
      ]);
      this.items.set(items);
      this.followRequests.set(followRequests);

      const actorIds = Array.from(
        new Set([
          ...items.map((item) => item.actorId).filter((item): item is string => !!item),
          ...followRequests.map((item) => item.followerId),
        ]),
      );
      const profiles = await Promise.all(
        actorIds.map(async (actorId) => {
          try {
            const profile = await this.api.getPublicUserProfile(actorId);
            return [actorId, profile] as const;
          } catch {
            return null;
          }
        }),
      );

      this.actors.set(
        profiles.reduce<Record<string, EnrichedUser>>((state, entry) => {
          if (!entry) {
            return state;
          }
          state[entry[0]] = entry[1];
          return state;
        }, {}),
      );
    } finally {
      this.loading.set(false);
    }
  }
}

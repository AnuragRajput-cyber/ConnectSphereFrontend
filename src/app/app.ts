import { CommonModule } from '@angular/common';
import { DestroyRef, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, interval } from 'rxjs';
import { SidebarComponent } from './components/sidebar/sidebar';
import { ToastStackComponent } from './components/toast-stack/toast-stack';
import { ConnectSphereApiService } from './core/connectsphere-api.service';
import { SessionService } from './core/session.service';
import { ToastService } from './core/toast.service';
import { UiShellService } from './core/ui-shell.service';
import { UserDirectoryService } from './core/user-directory.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    ToastStackComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly api = inject(ConnectSphereApiService);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly shell = inject(UiShellService);
  private readonly directory = inject(UserDirectoryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = this.session.user;
  readonly isAuthenticated = this.session.isAuthenticated;
  readonly unreadNotifications = signal(0);
  readonly conversationCount = signal(0);
  readonly currentPath = signal(this.router.url);
  readonly chromeVisible = computed(() => !/^\/(login|register)(\/|$)/.test(this.currentPath()));

  constructor() {
    void this.session.hydrateProfile().then((user) => this.directory.storeCurrentUser(user));

    effect(() => {
      const user = this.currentUser();
      this.directory.storeCurrentUser(user);

      if (!user) {
        this.unreadNotifications.set(0);
        this.conversationCount.set(0);
        return;
      }

      void this.loadChromeCounters(user.userId);
    });

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.currentPath.set(event.urlAfterRedirects));

    interval(15000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const userId = this.currentUser()?.userId;
        if (userId) {
          void this.loadChromeCounters(userId);
        }
      });
  }

  openAuth(): void {
    this.shell.openAuth(this.currentPath());
  }

  async logout(): Promise<void> {
    await this.session.logout();
    this.toast.show('Signed out', 'Your session has been cleared.', 'neutral');
    void this.router.navigateByUrl('/feed');
  }

  private async loadChromeCounters(userId: string): Promise<void> {
    try {
      const [notificationCount] = await Promise.all([
        this.api.getUnreadNotificationsCount(userId),
      ]);
      this.unreadNotifications.set(notificationCount.count);
      this.conversationCount.set(0);
    } catch {
      this.unreadNotifications.set(0);
      this.conversationCount.set(0);
    }
  }
}

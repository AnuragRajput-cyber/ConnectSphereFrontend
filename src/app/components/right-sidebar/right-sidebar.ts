import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { HashtagResponse, UserProfile, UserSummary } from '../../core/social.models';
import { UserCardComponent } from '../user-card/user-card';

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [CommonModule, UserCardComponent],
  templateUrl: './right-sidebar.html',
  styleUrl: './right-sidebar.scss',
})
export class RightSidebarComponent {
  readonly currentUser = input<UserProfile | null>(null);
  readonly discoverUsers = input<UserSummary[]>([]);
  readonly followingIds = input<Record<string, true>>({});
  readonly pendingIds = input<Record<string, true>>({});
  readonly trending = input<HashtagResponse[]>([]);
  readonly followClicked = output<string>();
  readonly profileClicked = output<string>();
  readonly authRequested = output<void>();
  readonly visibleDiscoverUsers = computed(() =>
    this.discoverUsers().filter((user) => user.userId !== this.currentUser()?.userId),
  );

  follow(userId: string): void {
    if (!this.currentUser()) {
      this.authRequested.emit();
      return;
    }
    if (userId === this.currentUser()?.userId) {
      return;
    }
    this.followClicked.emit(userId);
  }

  isFollowing(userId: string): boolean {
    return !!this.followingIds()[userId];
  }

  isPending(userId: string): boolean {
    return !!this.pendingIds()[userId];
  }
}

import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
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
  readonly hashtagClicked = output<string>();
  readonly authRequested = output<void>();
  readonly showAllSuggestions = signal(false);
  readonly visibleDiscoverUsers = computed(() =>
    this.discoverUsers().filter((user) => user.userId !== this.currentUser()?.userId),
  );
  readonly suggestionsPreview = computed(() =>
    this.showAllSuggestions() ? this.visibleDiscoverUsers() : this.visibleDiscoverUsers().slice(0, 3),
  );
  readonly hasMoreSuggestions = computed(() => this.visibleDiscoverUsers().length > 3);

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

  toggleSuggestions(): void {
    this.showAllSuggestions.update((value) => !value);
  }

  openHashtag(tag: string): void {
    this.hashtagClicked.emit(tag);
  }
}

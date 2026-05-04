import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RightSidebarComponent } from '../../components/right-sidebar/right-sidebar';
import { PostCardComponent } from '../../components/post-card/post-card';
import { UiIconComponent } from '../../components/ui-icon/ui-icon';
import { UserCardComponent } from '../../components/user-card/user-card';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { ExploreResults, FeedCardView, FollowResponse, PostResponse, UserSummary } from '../../core/social.models';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { UiShellService } from '../../core/ui-shell.service';
import { UserDirectoryService } from '../../core/user-directory.service';


@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, UserCardComponent, RightSidebarComponent, UiIconComponent, PostCardComponent],
  templateUrl: './explore.html',
  styleUrl: './explore.scss',
})
export class Explore {
  private readonly api = inject(ConnectSphereApiService);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly shell = inject(UiShellService);
  private readonly router = inject(Router);
  private readonly directory = inject(UserDirectoryService);

  readonly query = signal('');
  readonly loading = signal(true);
  readonly results = signal<ExploreResults>({
    users: [],
    posts: [],
    hashtags: [],
  });
  readonly currentUser = this.session.user;
  readonly followingIds = signal<Record<string, true>>({});
  readonly pendingIds = signal<Record<string, true>>({});
  readonly suggestedUsers = signal<UserSummary[]>([]);
  readonly featuredUsers = computed(() => this.results().users.slice(0, 8));
  readonly mediaPosts = computed(() => this.results().posts.filter((post) => !!post.mediaUrls.length));
  readonly categoryTags = computed(() => this.results().hashtags.slice(0, 8));
  readonly topPosts = computed(() =>
    [...this.mediaPosts()]
      .sort((left, right) => {
        const leftScore = left.likesCount * 2 + left.commentsCount;
        const rightScore = right.likesCount * 2 + right.commentsCount;
        return rightScore - leftScore;
      })
      .slice(0, 9),
  );
  readonly topPostViews = computed<FeedCardView[]>(() =>
    this.topPosts().map((post) => ({
      post,
      author: this.directory.get(post.authorId) ?? null,
      comments: [],
      commentsLoaded: false,
      likePulse: false,
    })),
  );

  constructor() {
    effect(() => {
      this.currentUser();
      void this.loadResults();
    });
  }

  async search(): Promise<void> {
    await this.loadResults();
  }

  openAuth(): void {
    this.shell.openAuth();
  }

  async follow(user: UserSummary): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser) {
      this.shell.openAuth();
      return;
    }
    if (currentUser.userId === user.userId) {
      this.toast.show('Action blocked', 'You cannot follow your own account.', 'neutral');
      return;
    }

    try {
      if (this.followingIds()[user.userId]) {
        await this.api.unfollowUser(currentUser.userId, user.userId);
        this.followingIds.update((state) => {
          const next = { ...state };
          delete next[user.userId];
          return next;
        });
        this.toast.show('Unfollowed', `${user.fullName} was removed from your following list.`, 'neutral');
        return;
      }

      if (this.pendingIds()[user.userId]) {
        const relationship = await this.api.getFollowRelationship(currentUser.userId, user.userId);
        if (relationship.followId) {
          await this.api.rejectFollowRequest(relationship.followId);
        }
        this.pendingIds.update((state) => {
          const next = { ...state };
          delete next[user.userId];
          return next;
        });
        this.toast.show('Request cancelled', 'The follow request was cancelled.', 'neutral');
        return;
      }

      const profile = await this.api.getPublicUserProfile(user.userId);
      const response = await this.api.followUser(
        currentUser.userId,
        user.userId,
        profile.privateAccount ? 'PENDING' : 'ACTIVE',
      );
      if (response.status === 'PENDING') {
        this.pendingIds.update((state) => ({ ...state, [user.userId]: true }));
        this.toast.show('Request sent', `${user.fullName} will need to approve your request.`, 'success');
      } else {
        this.followingIds.update((state) => ({ ...state, [user.userId]: true }));
        this.toast.show('Followed', `${user.fullName} is now in your network.`, 'success');
      }
    } catch {
      this.toast.show('Follow failed', 'The follow request could not be completed.', 'warning');
    }
  }

  async message(user: UserSummary): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser) {
      this.shell.openAuth();
      return;
    }
    if (currentUser.userId === user.userId) {
      this.toast.show('Action blocked', 'You cannot start a chat with your own account.', 'neutral');
      return;
    }

    this.directory.storeSummaries([user]);
    await this.router.navigate(['/messages'], {
      queryParams: { with: user.userId },
    });
  }

  async followSuggested(userId: string): Promise<void> {
    const user = [...this.suggestedUsers(), ...this.results().users].find((item) => item.userId === userId);
    if (user) {
      await this.follow(user);
    }
  }

  openProfile(userId: string): void {
    void this.router.navigate(['/profile', userId]);
  }

  openPost(postId: string): void {
    void this.router.navigate(['/post', postId]);
  }

  openHashtag(tag: string): void {
    this.query.set(tag.startsWith('#') ? tag : `#${tag}`);
    void this.loadResults();
  }

  isFollowing(userId: string): boolean {
    return !!this.followingIds()[userId];
  }

  postSummary(post: PostResponse): string {
    return post.content?.trim() || 'Media post';
  }

  private async loadResults(): Promise<void> {
    this.loading.set(true);
    const query = this.query().trim();
    try {
      let users: UserSummary[] = [];
      let posts: PostResponse[] = [];
      let hashtags: ExploreResults['hashtags'] = [];

      if (!query) {
        const trending = await this.api.getTrendingHashtags().catch(() => []);
        hashtags = trending;

        const ids = Array.from(
          new Set(
            (
              await Promise.all(
                trending.slice(0, 4).map((tag) => this.api.getPostsByHashtag(tag.tag).catch(() => [])),
              )
            ).flat(),
          ),
        );

        const loadedPosts = await Promise.all(
          ids.slice(0, 8).map((postId) => this.api.getPostById(postId).catch(() => null)),
        );
        posts = loadedPosts.filter((item): item is PostResponse => !!item && !item.deleted);
      } else {
        [users, posts, hashtags] = await Promise.all([
          this.api.searchUsersViaSearch(query).catch(() => []),
          this.api.searchPosts(query).catch(() => []),
          this.api.searchHashtags(query).catch(() => []),
        ]);
      }

      this.directory.storeSummaries(users);
      
      // Filter out current user from results
      const currentUser = this.currentUser();
      const filteredUsers = currentUser 
        ? users.filter((user) => user.userId !== currentUser.userId)
        : users;
      
      this.results.set({
        users: filteredUsers,
        posts,
        hashtags,
      });

      if (currentUser) {
        const [following, outgoingPending] = await Promise.all([
          this.api.getFollowing(currentUser.userId).catch(() => []),
          this.api.getOutgoingPendingRequests(currentUser.userId).catch(() => []),
        ]);
        const suggestedUsers = await this.loadSuggestedUsers(currentUser.userId, following);
        this.followingIds.set(
          following.reduce<Record<string, true>>((state, item) => {
            state[item.followeeId] = true;
            return state;
          }, {}),
        );
        this.pendingIds.set(
          outgoingPending.reduce<Record<string, true>>((state, item) => {
            state[item.followeeId] = true;
            return state;
          }, {}),
        );
        this.suggestedUsers.set(
          suggestedUsers
            .filter((user) => user.userId !== currentUser.userId)
            .slice(0, 5),
        );
      } else {
        this.suggestedUsers.set([]);
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSuggestedUsers(userId: string, following: FollowResponse[] = []): Promise<UserSummary[]> {
    return this.api.getFriendOfFriendSuggestions(userId, following);
  }
}

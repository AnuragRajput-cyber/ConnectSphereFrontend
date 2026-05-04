import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';
import { MentionTextComponent } from '../../components/mention-text/mention-text';
import { ProfileHeaderComponent } from '../../components/profile-header/profile-header';
import { RightSidebarComponent } from '../../components/right-sidebar/right-sidebar';
import { UiIconComponent } from '../../components/ui-icon/ui-icon';
import { UserCardComponent } from '../../components/user-card/user-card';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { FollowResponse, HashtagResponse, PostResponse, PublicUserProfile, UserProfile, UserSummary } from '../../core/social.models';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { buildAvatarDataUri } from '../../core/visuals';
import { UserDirectoryService } from '../../core/user-directory.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProfileHeaderComponent, RightSidebarComponent, EmptyStateComponent, UiIconComponent, UserCardComponent, MentionTextComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly api = inject(ConnectSphereApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly directory = inject(UserDirectoryService);

  readonly currentUser = this.session.user;
  readonly viewedUserId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly posts = signal<PostResponse[]>([]);
  readonly counts = signal({
    posts: 0,
    followers: 0,
    following: 0,
  });
  readonly viewedUser = signal<UserProfile | PublicUserProfile | null>(null);
  readonly tab = signal<'posts' | 'media' | 'about'>('posts');
  readonly form = signal({
    username: '',
    email: '',
    fullName: '',
    bio: '',
    profilePicUrl: '',
    bannerUrl: '',
    privateAccount: false,
  });
  readonly saving = signal(false);
  readonly uploadingImage = signal(false);
  readonly uploadingBanner = signal(false);
  readonly followPending = signal(false);
  readonly following = signal(false);
  readonly followRequested = signal(false);
  readonly discoverUsers = signal<UserSummary[]>([]);
  readonly discoverFollowingIds = signal<Record<string, true>>({});
  readonly discoverPendingIds = signal<Record<string, true>>({});
  readonly trending = signal<HashtagResponse[]>([]);
  readonly followListMode = signal<'followers' | 'following' | null>(null);
  readonly followListUsers = signal<PublicUserProfile[]>([]);
  readonly followListLoading = signal(false);
  readonly followListTitle = computed(() => {
    const mode = this.followListMode();
    if (!mode) {
      return '';
    }
    return mode === 'followers' ? 'Followers' : 'Following';
  });
  readonly isOwnProfile = computed(() => {
    const routeUserId = this.viewedUserId();
    const currentUserId = this.currentUser()?.userId;
    return !routeUserId || routeUserId === 'me' || routeUserId === currentUserId;
  });
  readonly contentLocked = computed(() => {
    const user = this.displayUser();
    if (!user || this.isOwnProfile()) {
      return false;
    }
    return user.privateAccount && !this.following();
  });
  readonly mediaPosts = computed(() => this.posts().filter((post) => post.mediaUrls.length));

  constructor() {
    this.route.paramMap.subscribe((params) => this.viewedUserId.set(params.get('userId')));

    effect(() => {
      this.currentUser();
      this.viewedUserId();
      void this.load();
    });
  }

  displayUser(): UserProfile | PublicUserProfile | null {
    return this.isOwnProfile() ? this.currentUser() : this.viewedUser();
  }

  avatar(): string {
    const user = this.displayUser();
    const label = user?.fullName || 'Profile';
    const seed = user?.userId || 'profile';
    const url = this.isOwnProfile() ? this.form().profilePicUrl || user?.profilePicUrl : user?.profilePicUrl;
    return url || buildAvatarDataUri(label, seed);
  }

  bannerUrl(): string | null {
    const user = this.displayUser();
    if (!user) {
      return null;
    }
    return this.isOwnProfile() ? this.form().bannerUrl || user.bannerUrl : user.bannerUrl;
  }

  async save(): Promise<void> {
    const user = this.currentUser();
    if (!user || !this.isOwnProfile()) {
      return;
    }

    this.saving.set(true);
    try {
      // Store current form values before saving (in case the API doesn't return them)
      const currentForm = this.form();
      
      const updated = await this.session.updateProfile(this.form());
      this.viewedUser.set(updated);
      
      // Preserve banner and profile pic URLs if the response doesn't include them
      this.form.set({
        username: updated.username,
        email: updated.email,
        fullName: updated.fullName,
        bio: updated.bio || '',
        profilePicUrl: updated.profilePicUrl || currentForm.profilePicUrl,
        bannerUrl: updated.bannerUrl || currentForm.bannerUrl,
        privateAccount: updated.privateAccount,
      });
      
      this.toast.show('Profile updated', 'Your profile changes were saved.', 'success');
    } catch {
      this.toast.show('Update failed', 'Could not update the profile.', 'warning');
    } finally {
      this.saving.set(false);
    }
  }

  async uploadProfilePicture(event: Event): Promise<void> {
    const user = this.currentUser();
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!user || !file || !this.isOwnProfile()) {
      return;
    }

    this.uploadingImage.set(true);
    try {
      const media = await this.api.uploadMedia(user.userId, file);
      this.form.update((form) => ({
        ...form,
        profilePicUrl: media.url,
      }));
      await this.save();
    } catch {
      this.toast.show('Upload failed', 'Could not upload the profile picture.', 'warning');
    } finally {
      this.uploadingImage.set(false);
    }
  }

  async uploadBannerImage(event: Event): Promise<void> {
    const user = this.currentUser();
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!user || !file || !this.isOwnProfile()) {
      return;
    }

    this.uploadingBanner.set(true);
    try {
      const media = await this.api.uploadMedia(user.userId, file);
      // Store the media URL before saving
      const newBannerUrl = media.url;
      
      // Update the form with the new banner URL
      this.form.update((form) => ({
        ...form,
        bannerUrl: newBannerUrl,
      }));
      
      // Save the profile
      await this.save();
      
      // If save succeeds but doesn't return the banner URL, ensure it's preserved
      if (!this.form().bannerUrl) {
        this.form.update((form) => ({
          ...form,
          bannerUrl: newBannerUrl,
        }));
      }
      
      this.toast.show('Banner updated', 'Your banner image has been changed.', 'success');
    } catch (error) {
      this.toast.show('Upload failed', 'Could not upload the banner image.', 'warning');
      console.error('Banner upload error:', error);
    } finally {
      this.uploadingBanner.set(false);
      // Reset the input element
      (event.target as HTMLInputElement).value = '';
    }
  }

  openPost(postId: string): void {
    void this.router.navigate(['/post', postId]);
  }

  openProfile(userId: string): void {
    this.closeFollowList();
    void this.router.navigate(['/profile', userId]);
  }

  async openFollowList(mode: 'followers' | 'following'): Promise<void> {
    const user = this.displayUser();
    if (!user) {
      return;
    }

    if (this.contentLocked()) {
      this.toast.show('Private account', 'Follow this user to view their network.', 'neutral');
      return;
    }

    this.followListMode.set(mode);
    this.followListUsers.set([]);
    this.followListLoading.set(true);

    try {
      const relationships = mode === 'followers'
        ? await this.api.getFollowers(user.userId)
        : await this.api.getFollowing(user.userId);
      const userIds = this.followListUserIds(mode, relationships);
      const profiles = await Promise.all(
        userIds.map((userId) => this.api.getPublicUserProfile(userId).catch(() => null)),
      );
      const users = profiles.filter((profile): profile is PublicUserProfile => !!profile && profile.active);
      users.forEach((profile) => this.directory.storePublicProfile(profile));
      this.followListUsers.set(users);
    } catch {
      this.toast.show('Network unavailable', `Could not load ${mode}.`, 'warning');
    } finally {
      this.followListLoading.set(false);
    }
  }

  closeFollowList(): void {
    this.followListMode.set(null);
    this.followListUsers.set([]);
    this.followListLoading.set(false);
  }

  async followFromList(userId: string): Promise<void> {
    await this.followSuggested(userId);
    const mode = this.followListMode();
    if (mode) {
      await this.openFollowList(mode);
    }
  }

  async messageUser(userId: string): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser || currentUser.userId === userId) {
      return;
    }

    this.closeFollowList();
    await this.router.navigate(['/messages'], {
      queryParams: { with: userId },
    });
  }

  async toggleFollow(): Promise<void> {
    const currentUser = this.currentUser();
    const viewedUser = this.viewedUser();
    if (!currentUser || !viewedUser || this.isOwnProfile()) {
      return;
    }

    this.followPending.set(true);
    try {
      if (this.following()) {
        await this.api.unfollowUser(currentUser.userId, viewedUser.userId);
        this.following.set(false);
        this.followRequested.set(false);
        this.counts.update((value) => ({ ...value, followers: Math.max(0, value.followers - 1) }));
      } else if (this.followRequested()) {
        const relationship = await this.api.getFollowRelationship(currentUser.userId, viewedUser.userId);
        if (relationship.followId) {
          await this.api.rejectFollowRequest(relationship.followId);
        } else {
          await this.api.unfollowUser(currentUser.userId, viewedUser.userId);
        }
        this.followRequested.set(false);
        this.toast.show('Request cancelled', 'The follow request was removed.', 'neutral');
      } else {
        const response = await this.api.followUser(
          currentUser.userId,
          viewedUser.userId,
          viewedUser.privateAccount ? 'PENDING' : 'ACTIVE',
        );
        this.following.set(response.status === 'ACTIVE');
        this.followRequested.set(response.status === 'PENDING');
        if (response.status === 'ACTIVE') {
          this.counts.update((value) => ({ ...value, followers: value.followers + 1 }));
        } else {
          this.toast.show('Request sent', 'This account is private, so a follow request was sent.', 'success');
        }
      }
    } catch {
      this.toast.show('Follow update failed', 'Could not update the follow state.', 'warning');
    } finally {
      this.followPending.set(false);
    }
  }

  async messageViewedUser(): Promise<void> {
    const currentUser = this.currentUser();
    const viewedUser = this.viewedUser();
    if (!currentUser || !viewedUser || currentUser.userId === viewedUser.userId) {
      return;
    }

    await this.router.navigate(['/messages'], {
      queryParams: { with: viewedUser.userId },
    });
  }

  async reportViewedUser(): Promise<void> {
    const currentUser = this.currentUser();
    const viewedUser = this.viewedUser();
    if (!currentUser || !viewedUser || this.isOwnProfile()) {
      return;
    }

    const reason = window.prompt('Why are you reporting this account?', 'Harassment or abuse');
    if (!reason || !reason.trim()) {
      return;
    }

    const details = window.prompt('Additional details (optional)', '') ?? '';

    try {
      await this.api.createReport({
        targetType: 'USER',
        targetId: viewedUser.userId,
        reason: reason.trim(),
        details: details.trim(),
      });
      this.toast.show('Report submitted', 'The account was reported for moderation review.', 'success');
    } catch {
      this.toast.show('Report failed', 'Could not submit the account report.', 'warning');
    }
  }

  async followSuggested(userId: string): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser) {
      return;
    }
    if (currentUser.userId === userId) {
      this.toast.show('Action blocked', 'You cannot follow your own account.', 'neutral');
      this.discoverUsers.update((users) => users.filter((user) => user.userId !== userId));
      return;
    }

    try {
      if (this.discoverFollowingIds()[userId]) {
        await this.api.unfollowUser(currentUser.userId, userId);
        this.discoverFollowingIds.update((state) => {
          const next = { ...state };
          delete next[userId];
          return next;
        });
        this.toast.show('Unfollowed', 'The profile was removed from your network.', 'neutral');
        return;
      }

      if (this.discoverPendingIds()[userId]) {
        const relationship = await this.api.getFollowRelationship(currentUser.userId, userId);
        if (relationship.followId) {
          await this.api.rejectFollowRequest(relationship.followId);
        }
        this.discoverPendingIds.update((state) => {
          const next = { ...state };
          delete next[userId];
          return next;
        });
        this.toast.show('Request cancelled', 'The follow request was removed.', 'neutral');
        return;
      }

      const profile = await this.api.getPublicUserProfile(userId);
      const response = await this.api.followUser(
        currentUser.userId,
        userId,
        profile.privateAccount ? 'PENDING' : 'ACTIVE',
      );
      if (response.status === 'PENDING') {
        this.discoverPendingIds.update((state) => ({ ...state, [userId]: true }));
        this.toast.show('Request sent', 'A follow request was sent to this private account.', 'success');
      } else {
        this.discoverFollowingIds.update((state) => ({ ...state, [userId]: true }));
        this.toast.show('Followed', 'The profile was added to your network.', 'success');
      }
    } catch {
      this.toast.show('Follow failed', 'Could not create the follow relationship.', 'warning');
    }
  }

  async deactivateAccount(): Promise<void> {
    if (!this.isOwnProfile()) {
      return;
    }

    const confirmed = window.confirm(
      'Deactivate your account? This will sign you out and mark your profile as inactive.',
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.session.deactivateAccount();
      this.toast.show('Account deactivated', 'Your account has been deactivated successfully.', 'success');
      await this.router.navigateByUrl('/feed');
    } catch {
      this.toast.show('Deactivation failed', 'Could not deactivate the account.', 'warning');
    }
  }

  async logout(): Promise<void> {
    await this.session.logout();
    this.toast.show('Signed out', 'Your session has been cleared.', 'neutral');
    await this.router.navigateByUrl('/feed');
  }

  private async load(): Promise<void> {
    const currentUser = this.currentUser();
    const routeUserId = this.viewedUserId();
    this.posts.set([]);

    if (!currentUser && !routeUserId) {
      this.viewedUser.set(null);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    try {
      const normalizedRouteUserId = routeUserId === 'me' ? currentUser?.userId ?? null : routeUserId;
      const targetUserId = normalizedRouteUserId && (!currentUser || normalizedRouteUserId !== currentUser.userId)
        ? normalizedRouteUserId
        : currentUser?.userId;

      if (!targetUserId) {
        this.viewedUser.set(null);
        return;
      }

      if (currentUser && targetUserId === currentUser.userId) {
        this.viewedUser.set(currentUser);
        this.following.set(false);
        this.followRequested.set(false);
        this.form.set({
          username: currentUser.username,
          email: currentUser.email,
          fullName: currentUser.fullName,
          bio: currentUser.bio || '',
          profilePicUrl: currentUser.profilePicUrl || '',
          bannerUrl: currentUser.bannerUrl || '',
          privateAccount: currentUser.privateAccount,
        });
      } else {
        const publicProfile = await this.api.getPublicUserProfile(targetUserId);
        this.viewedUser.set(publicProfile);
        if (currentUser) {
          const relationship = await this.api.getFollowRelationship(currentUser.userId, targetUserId).catch(() => null);
          if (relationship) {
            this.following.set(relationship.following);
            this.followRequested.set(relationship.pending);
          } else {
            const [followingState, outgoingPending] = await Promise.all([
              this.api.isFollowing(currentUser.userId, targetUserId).catch(() => ({ following: false })),
              this.api.getOutgoingPendingRequests(currentUser.userId).catch(() => []),
            ]);
            this.following.set(!!followingState.following);
            this.followRequested.set(outgoingPending.some((item) => item.followeeId === targetUserId));
          }
        } else {
          this.following.set(false);
          this.followRequested.set(false);
        }
      }

      const postsRequest = this.api.getPostsByUser(targetUserId);
      const [posts, postCount, followers, following, trending, currentFollowing, outgoingPending] = await Promise.all([
        postsRequest,
        this.api.getPostCount(targetUserId).catch(() => ({ authorId: targetUserId, count: 0 })),
        this.api.getFollowerCount(targetUserId).catch(() => ({ count: 0 })),
        this.api.getFollowingCount(targetUserId).catch(() => ({ count: 0 })),
        this.api.getTrendingHashtags().catch(() => []),
        currentUser ? this.api.getFollowing(currentUser.userId).catch(() => []) : Promise.resolve([]),
        currentUser ? this.api.getOutgoingPendingRequests(currentUser.userId).catch(() => []) : Promise.resolve([]),
      ]);
      const discoverUsers = currentUser
        ? await this.loadDiscoverUsers(currentFollowing)
        : [];

      this.posts.set(posts);
      this.trending.set(trending.slice(0, 5));
      this.discoverUsers.set(
        discoverUsers
          .filter((user) => user.userId !== targetUserId && user.userId !== currentUser?.userId)
          .slice(0, 4),
      );
      this.directory.storeSummaries(discoverUsers);
      this.discoverFollowingIds.set(
        currentFollowing.reduce<Record<string, true>>((state, item) => {
          state[item.followeeId] = true;
          return state;
        }, {}),
      );
      this.discoverPendingIds.set(
        outgoingPending.reduce<Record<string, true>>((state, item) => {
          state[item.followeeId] = true;
          return state;
        }, {}),
      );
      this.counts.set({
        posts: postCount.count,
        followers: followers.count,
        following: following.count,
      });
    } catch {
      this.toast.show('Profile posts unavailable', 'Post-service could not return this profile timeline.', 'warning');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDiscoverUsers(following: FollowResponse[] = []): Promise<UserSummary[]> {
    const currentUser = this.currentUser();
    if (currentUser) {
      return this.api.getFriendOfFriendSuggestions(currentUser.userId, following);
    }

    return [];
  }

  private followListUserIds(mode: 'followers' | 'following', relationships: FollowResponse[]): string[] {
    const ids = relationships.map((relationship) => mode === 'followers' ? relationship.followerId : relationship.followeeId);
    return Array.from(new Set(ids));
  }
}

import { CommonModule } from '@angular/common';
import { Component, effect, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { PostCardComponent } from '../../components/post-card/post-card';
import { PostComposerComponent } from '../../components/post-composer/post-composer';
import { RightSidebarComponent } from '../../components/right-sidebar/right-sidebar';
import { ShareSheetComponent } from '../../components/share-sheet/share-sheet';
import { StoryBarComponent } from '../../components/story-bar/story-bar';
import { UiIconComponent } from '../../components/ui-icon/ui-icon';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import {
  FeedCardView,
  FollowResponse,
  HashtagResponse,
  LikeResponse,
  PostResponse,
  StoryResponse,
  UserSummary,
} from '../../core/social.models';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { UiShellService } from '../../core/ui-shell.service';
import { UserDirectoryService } from '../../core/user-directory.service';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    UiIconComponent,
    PostComposerComponent,
    PostCardComponent,
    RightSidebarComponent,
    ShareSheetComponent,
    StoryBarComponent,
  ],
  templateUrl: './feed.html',
  styleUrl: './feed.scss',
})
export class Feed {
  private readonly api = inject(ConnectSphereApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly shell = inject(UiShellService);
  readonly directory = inject(UserDirectoryService);

  readonly currentUser = this.session.user;
  readonly loading = signal(true);
  readonly composing = signal(false);
  readonly cards = signal<FeedCardView[]>([]);
  readonly stories = signal<StoryResponse[]>([]);
  readonly trending = signal<HashtagResponse[]>([]);
  readonly discoverUsers = signal<UserSummary[]>([]);
  readonly discoverFollowingIds = signal<Record<string, true>>({});
  readonly discoverPendingIds = signal<Record<string, true>>({});
  readonly likedPostIds = signal<Record<string, true>>({});
  readonly postReactionTypes = signal<Record<string, 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY'>>({});
  readonly likedCommentIds = signal<Record<string, true>>({});
  readonly visibleCount = signal(6);
  readonly selectedPostId = signal<string | null>(null);
  readonly selectedStoryId = signal<string | null>(null);
  readonly selectedStory = signal<StoryResponse | null>(null);
  readonly storyLiked = signal(false);
  readonly storyLikeCount = signal(0);
  readonly sharePostId = signal<string | null>(null);
  readonly shareRecipients = signal<UserSummary[]>([]);
  readonly sharingToId = signal<string | null>(null);

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.selectedPostId.set(params.get('post'));
      this.selectedStoryId.set(params.get('story'));
    });

    effect(() => {
      this.currentUser();
      this.selectedPostId();
      this.selectedStoryId();
      void this.load();
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (window.innerHeight + window.scrollY + 220 >= document.body.offsetHeight) {
      this.visibleCount.update((count) => count + 3);
    }
  }

  visibleCards(): FeedCardView[] {
    return this.cards().slice(0, this.visibleCount());
  }

  hasMore(): boolean {
    return this.cards().length > this.visibleCount();
  }

  liked(postId: string): boolean {
    return !!this.likedPostIds()[postId];
  }

  reactionType(postId: string): 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' | null {
    return this.postReactionTypes()[postId] ?? null;
  }

  commentLiked(commentId: string): boolean {
    return !!this.likedCommentIds()[commentId];
  }

  openAuth(): void {
    this.shell.openAuth();
  }

  openProfile(userId: string): void {
    void this.router.navigate(['/profile', userId]);
  }

  openPost(postId: string): void {
    void this.router.navigate(['/post', postId]);
  }

  handleEmptyAction(): void {
    if (this.currentUser()) {
      void this.router.navigate(['/create-post']);
      return;
    }
    this.openAuth();
  }

  async createPost(event: { content: string; file: File | null }): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.openAuth();
      return;
    }

    this.composing.set(true);
    try {
      const mediaUrls: string[] = [];
      if (event.file) {
        const media = await this.api.uploadMedia(user.userId, event.file);
        mediaUrls.push(media.url);
      }

      const post = await this.api.createPost({
        authorId: user.userId,
        content: event.content,
        mediaUrls,
        postType: mediaUrls.length
          ? event.content
            ? 'TEXT_AND_MEDIA'
            : 'MEDIA_ONLY'
          : 'TEXT_ONLY',
        visibility: 'PUBLIC',
      });

      if (event.content.trim()) {
        await this.notifyMentions(user.userId, event.content, post.postId).catch(() => undefined);
      }

      this.cards.update((items) => [this.toCard(post), ...items]);
      await this.notifyFollowers(
        `${user.fullName} shared a new post.`,
        post.postId,
        'POST',
      );
      this.toast.show('Post created', 'Your post was published through post-service.', 'success');
    } catch (error) {
      this.toast.show(
        'Post failed',
        error instanceof Error ? error.message : 'Post creation hit a backend issue.',
        'warning',
      );
    } finally {
      this.composing.set(false);
    }
  }

  async toggleLike(postId: string): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.openAuth();
      return;
    }

    const alreadyLiked = this.liked(postId);
    const card = this.cards().find((item) => item.post.postId === postId);
    if (!card) {
      return;
    }

    try {
      if (alreadyLiked) {
        await this.api.unlikePost(user.userId, postId);
      } else {
        await this.api.likePost(user.userId, postId);
      }

      this.likedPostIds.update((state) => {
        const next = { ...state };
        if (alreadyLiked) {
          delete next[postId];
        } else {
          next[postId] = true;
        }
        return next;
      });
      this.postReactionTypes.update((state) => {
        const next = { ...state };
        if (alreadyLiked) {
          delete next[postId];
        } else {
          next[postId] = 'LIKE';
        }
        return next;
      });

      this.cards.update((items) =>
        items.map((item) =>
          item.post.postId === postId
            ? {
                ...item,
                post: {
                  ...item.post,
                  likesCount: Math.max(0, item.post.likesCount + (alreadyLiked ? -1 : 1)),
                },
                likePulse: !alreadyLiked,
              }
            : item,
        ),
      );

      if (!alreadyLiked) {
        window.setTimeout(() => {
          this.cards.update((items) =>
            items.map((item) =>
              item.post.postId === postId ? { ...item, likePulse: false } : item,
            ),
          );
        }, 300);
      }
    } catch {
      this.toast.show('Like failed', 'Could not update the like right now.', 'warning');
    }
  }

  async setReaction(event: { postId: string; reactionType: 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' | 'NONE' }): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.openAuth();
      return;
    }

    const alreadyLiked = this.liked(event.postId);
    try {
      if (event.reactionType === 'NONE') {
        if (alreadyLiked) {
          await this.api.unlikePost(user.userId, event.postId);
          this.likedPostIds.update((state) => {
            const next = { ...state };
            delete next[event.postId];
            return next;
          });
          this.postReactionTypes.update((state) => {
            const next = { ...state };
            delete next[event.postId];
            return next;
          });
          this.cards.update((items) =>
            items.map((item) =>
              item.post.postId === event.postId
                ? { ...item, post: { ...item.post, likesCount: Math.max(0, item.post.likesCount - 1) } }
                : item,
            ),
          );
        }
        return;
      }

      if (!alreadyLiked) {
        await this.api.reactToPost(user.userId, event.postId, event.reactionType);
        this.likedPostIds.update((state) => ({ ...state, [event.postId]: true }));
        this.cards.update((items) =>
          items.map((item) =>
            item.post.postId === event.postId
              ? { ...item, post: { ...item.post, likesCount: item.post.likesCount + 1 } }
              : item,
          ),
        );
      } else if (this.reactionType(event.postId) !== event.reactionType) {
        await this.api.changeReaction(user.userId, event.postId, 'POST', event.reactionType);
      }

      this.postReactionTypes.update((state) => ({ ...state, [event.postId]: event.reactionType as 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' }));
    } catch {
      this.toast.show('Reaction failed', 'Could not update the reaction type.', 'warning');
    }
  }

  async loadComments(postId: string): Promise<void> {
    const target = this.cards().find((item) => item.post.postId === postId);
    if (!target || target.commentsLoaded) {
      return;
    }

    try {
      const comments = await this.api.getComments(postId);
      await this.loadPublicProfiles(comments.map((comment) => comment.authorId));
      this.cards.update((items) =>
        items.map((item) =>
          item.post.postId === postId ? { ...item, comments, commentsLoaded: true } : item,
        ),
      );
    } catch {
      this.toast.show('Comments unavailable', 'Comment-service did not return comments.', 'warning');
    }
  }

  async toggleCommentLike(event: { postId: string; commentId: string }): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.openAuth();
      return;
    }

    const alreadyLiked = this.commentLiked(event.commentId);
    try {
      if (alreadyLiked) {
        await this.api.unlikeComment(user.userId, event.commentId);
      } else {
        await this.api.likeComment(user.userId, event.commentId);
      }

      this.likedCommentIds.update((state) => {
        const next = { ...state };
        if (alreadyLiked) {
          delete next[event.commentId];
        } else {
          next[event.commentId] = true;
        }
        return next;
      });

      this.cards.update((items) =>
        items.map((item) =>
          item.post.postId === event.postId
            ? {
                ...item,
                comments: item.comments.map((comment) =>
                  comment.commentId === event.commentId
                    ? { ...comment, likesCount: Math.max(0, comment.likesCount + (alreadyLiked ? -1 : 1)) }
                    : comment,
                ),
              }
            : item,
        ),
      );
    } catch {
      this.toast.show('Like failed', 'Could not update the comment reaction.', 'warning');
    }
  }

  async addComment(event: { postId: string; text: string }): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.openAuth();
      return;
    }

    const card = this.cards().find((item) => item.post.postId === event.postId);
    if (!card) {
      return;
    }

    try {
      const comment = await this.api.addComment({
        postId: event.postId,
        authorId: user.userId,
        content: event.text,
      });

      this.cards.update((items) =>
        items.map((item) =>
          item.post.postId === event.postId
            ? {
                ...item,
                commentsLoaded: true,
                comments: [...item.comments, comment],
                post: {
                  ...item.post,
                  commentsCount: item.post.commentsCount + 1,
                },
              }
            : item,
        ),
      );
    } catch {
      this.toast.show('Comment failed', 'Could not add the comment.', 'warning');
    }
  }

  async updateComment(event: { postId: string; commentId: string; content: string }): Promise<void> {
    try {
      const updated = await this.api.updateComment(event.commentId, event.content);
      this.cards.update((items) =>
        items.map((item) =>
          item.post.postId === event.postId
            ? {
                ...item,
                comments: item.comments.map((comment) => comment.commentId === updated.commentId ? updated : comment),
              }
            : item,
        ),
      );
      this.toast.show('Comment updated', 'Your comment changes were saved.', 'success');
    } catch {
      this.toast.show('Update failed', 'Could not update the comment.', 'warning');
    }
  }

  async deleteComment(event: { postId: string; commentId: string }): Promise<void> {
    const confirmed = window.confirm('Delete this comment?');
    if (!confirmed) {
      return;
    }

    try {
      await this.api.deleteComment(event.commentId);
      this.cards.update((items) =>
        items.map((item) =>
          item.post.postId === event.postId
            ? {
                ...item,
                comments: item.comments.filter((comment) => comment.commentId !== event.commentId),
                post: {
                  ...item.post,
                  commentsCount: Math.max(0, item.post.commentsCount - 1),
                },
              }
            : item,
        ),
      );
      this.toast.show('Comment deleted', 'The comment was removed.', 'success');
    } catch {
      this.toast.show('Delete failed', 'Could not remove the comment.', 'warning');
    }
  }

  async reportComment(event: { postId: string; commentId: string }): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.openAuth();
      return;
    }

    const reason = window.prompt('Why are you reporting this comment?', 'Inappropriate content');
    if (!reason || !reason.trim()) {
      return;
    }
    const details = window.prompt('Additional details (optional)', '') ?? '';

    try {
      await this.api.createReport({
        targetType: 'COMMENT',
        targetId: event.commentId,
        reason: reason.trim(),
        details: details.trim(),
      });
      this.toast.show('Report submitted', 'The comment was reported for moderation review.', 'success');
    } catch {
      this.toast.show('Report failed', 'Could not submit the comment report.', 'warning');
    }
  }

  async followUser(userId: string): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.openAuth();
      return;
    }
    if (user.userId === userId) {
      this.toast.show('Action blocked', 'You cannot follow your own account.', 'neutral');
      this.discoverUsers.update((items) => items.filter((item) => item.userId !== userId));
      return;
    }

    try {
      if (this.discoverFollowingIds()[userId]) {
        await this.api.unfollowUser(user.userId, userId);
        this.discoverFollowingIds.update((state) => {
          const next = { ...state };
          delete next[userId];
          return next;
        });
        this.toast.show('Unfollowed', 'The profile was removed from your network.', 'neutral');
        return;
      }

      if (this.discoverPendingIds()[userId]) {
        const relationship = await this.api.getFollowRelationship(user.userId, userId);
        if (relationship.followId) {
          await this.api.rejectFollowRequest(relationship.followId);
        }
        this.discoverPendingIds.update((state) => {
          const next = { ...state };
          delete next[userId];
          return next;
        });
        this.toast.show('Request cancelled', 'The follow request was cancelled.', 'neutral');
        return;
      }

      const profile = await this.api.getPublicUserProfile(userId);
      const response = await this.api.followUser(
        user.userId,
        userId,
        profile.privateAccount ? 'PENDING' : 'ACTIVE',
      );
      if (response.status === 'PENDING') {
        this.discoverPendingIds.update((state) => ({ ...state, [userId]: true }));
        this.toast.show('Request sent', 'A follow request was sent to this private account.', 'success');
      } else {
        this.discoverFollowingIds.update((state) => ({ ...state, [userId]: true }));
        this.toast.show('Followed', 'The profile has been added to your network.', 'success');
      }
    } catch {
      this.toast.show('Follow failed', 'Could not create the follow relationship.', 'warning');
    }
  }

  async share(postId: string): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser) {
      this.openAuth();
      return;
    }

    try {
      const following = await this.api.getFollowing(currentUser.userId);
      const recipientIds = Array.from(new Set(following.map((item) => item.followeeId)));
      const profiles = await Promise.all(
        recipientIds.map((userId) => this.api.getPublicUserProfile(userId).catch(() => null)),
      );
      this.shareRecipients.set(
        profiles
          .filter((profile): profile is NonNullable<typeof profile> => !!profile)
          .map((profile) => ({
            userId: profile.userId,
            fullName: profile.fullName,
            username: profile.username,
            profilePicUrl: profile.profilePicUrl,
            role: profile.role,
          })),
      );
      this.sharePostId.set(postId);
    } catch {
      this.toast.show('Share unavailable', 'Could not load your followings for sharing.', 'warning');
    }
  }

  closeShareSheet(): void {
    this.sharePostId.set(null);
    this.shareRecipients.set([]);
    this.sharingToId.set(null);
  }

  async shareToUser(recipientId: string): Promise<void> {
    const currentUser = this.currentUser();
    const postId = this.sharePostId();
    if (!currentUser || !postId) {
      return;
    }

    this.sharingToId.set(recipientId);
    try {
      const conversation = await this.api.createConversation(currentUser.userId, recipientId);
      await this.api.sendMessage({
        conversationId: conversation.conversationId,
        senderId: currentUser.userId,
        recipientId,
        content: `Shared a post with you: ${window.location.origin}/post/${postId}`,
      });
      this.toast.show('Post shared', 'The post was sent in messages.', 'success');
      this.closeShareSheet();
    } catch {
      this.toast.show('Share failed', 'The post could not be sent in chat.', 'warning');
      this.sharingToId.set(null);
    }
  }

  async createStory(file: File): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      this.openAuth();
      return;
    }

    try {
      const story = await this.api.createStory(user.userId, file, '');
      this.stories.update((items) => [story, ...items]);
      await this.notifyFollowers(
        `${user.fullName} added a new story.`,
        story.storyId,
        'STORY',
      );
      await this.openStory(story);
      this.toast.show('Story created', 'Your story was uploaded.', 'success');
    } catch {
      this.toast.show('Story failed', 'Could not create the story.', 'warning');
    }
  }

  async openStory(story: StoryResponse): Promise<void> {
    this.selectedStory.set(story);
    await this.router.navigate(['/feed'], {
      queryParams: { story: story.storyId, post: this.selectedPostId() },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    const currentUser = this.currentUser();
    try {
      const viewed = currentUser && currentUser.userId !== story.authorId
        ? await this.api.viewStory(story.storyId)
        : story;
      this.stories.update((items) =>
        items.map((item) => (item.storyId === story.storyId ? viewed : item)),
      );
      this.selectedStory.set(viewed);
    } catch {
      this.selectedStory.set(story);
    }

    try {
      const likes = await this.api.getLikesByTarget(story.storyId, 'STORY');
      this.storyLikeCount.set(likes.length);
      this.storyLiked.set(
        !!currentUser && likes.some((item) => item.userId === currentUser.userId),
      );
    } catch {
      this.storyLikeCount.set(0);
      this.storyLiked.set(false);
    }
  }

  async closeStory(): Promise<void> {
    this.selectedStory.set(null);
    this.storyLikeCount.set(0);
    this.storyLiked.set(false);
    await this.router.navigate(['/feed'], {
      queryParams: { story: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  async toggleStoryLike(): Promise<void> {
    const user = this.currentUser();
    const story = this.selectedStory();
    if (!user) {
      this.openAuth();
      return;
    }
    if (!story) {
      return;
    }
    if (story.authorId === user.userId) {
      this.toast.show('Own story', 'Your own story is already visible to you.', 'neutral');
      return;
    }

    try {
      if (this.storyLiked()) {
        await this.api.unlikeStory(user.userId, story.storyId);
        this.storyLiked.set(false);
        this.storyLikeCount.update((count) => Math.max(0, count - 1));
      } else {
        await this.api.likeStory(user.userId, story.storyId);
        this.storyLiked.set(true);
        this.storyLikeCount.update((count) => count + 1);
      }
    } catch {
      this.toast.show('Story like failed', 'Could not update the story like.', 'warning');
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    const user = this.currentUser();
    this.likedPostIds.set({});
    this.postReactionTypes.set({});
    this.likedCommentIds.set({});
    this.selectedStory.set(null);
    this.storyLiked.set(false);
    this.storyLikeCount.set(0);
    if (user) {
      this.directory.storeCurrentUser(user);
    }

    try {
      const following = user ? await this.api.getFollowing(user.userId).catch(() => []) : [];
      const outgoingPending = user ? await this.api.getOutgoingPendingRequests(user.userId).catch(() => []) : [];
      this.discoverFollowingIds.set(
        following.reduce<Record<string, true>>((state, item) => {
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
      const likes = user ? await this.api.getLikesByUser(user.userId).catch(() => []) : [];
      this.storeLikeMaps(likes);

      const storyAuthorIds = user
        ? Array.from(new Set([user.userId, ...following.map((item) => item.followeeId)]))
        : undefined;

      const [stories, trending, discoverUsers] = await Promise.all([
        this.api.getActiveStories(storyAuthorIds).catch(() => []),
        this.api.getTrendingHashtags().catch(() => []),
        this.loadDiscoverUsers(),
      ]);

      this.directory.storeSummaries(discoverUsers);
      this.stories.set(stories);
      this.trending.set(trending.slice(0, 5));
      this.discoverUsers.set(
        discoverUsers
          .filter((item) => item.userId !== user?.userId)
          .slice(0, 5),
      );

      const posts = user
        ? await this.loadPersonalizedPosts(user.userId, following)
        : await this.api.getFeed().catch(() => []);
      await this.loadPublicProfiles([
        ...stories.map((story) => story.authorId),
        ...posts.map((post) => post.authorId),
      ]);
      const focusedPosts = await this.ensureSelectedPost(posts);
      this.cards.set(focusedPosts.map((post) => this.toCard(post)));

      const selectedStoryId = this.selectedStoryId();
      if (selectedStoryId) {
        const selectedStory = stories.find((item) => item.storyId === selectedStoryId);
        if (selectedStory) {
          await this.openStory(selectedStory);
        }
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPersonalizedPosts(
    userId: string,
    following: FollowResponse[],
  ): Promise<PostResponse[]> {
    const userIds = Array.from(new Set([userId, ...following.map((item) => item.followeeId)]));
    const feedPosts = await this.api.getFeed(userIds).catch(() => []);

    if (feedPosts.length) {
      return feedPosts;
    }

    return this.loadDiscoveryPosts(this.trending());
  }

  private async loadDiscoveryPosts(trending: HashtagResponse[]): Promise<PostResponse[]> {
    const idsByTag = await Promise.all(
      trending.slice(0, 3).map((tag) => this.api.getPostsByHashtag(tag.tag).catch(() => [])),
    );
    const postIds = idsByTag.flat();

    const uniqueIds = Array.from(new Set(postIds)).slice(0, 9);
    const posts = await Promise.all(
      uniqueIds.map((postId) => this.api.getPostById(postId).catch(() => null)),
    );
    return posts.filter((item): item is PostResponse => !!item && !item.deleted);
  }

  private async loadDiscoverUsers(): Promise<UserSummary[]> {
    const currentUser = this.currentUser();
    if (currentUser) {
      const suggestedIds = await this.api.getSuggestedUsers(currentUser.userId).catch(() => []);
      if (suggestedIds.length) {
        const profiles = await Promise.all(
          suggestedIds.slice(0, 5).map((userId) => this.api.getPublicUserProfile(userId).catch(() => null)),
        );
        return profiles
          .filter((profile): profile is NonNullable<typeof profile> => !!profile)
          .map((profile) => ({
            userId: profile.userId,
            username: profile.username,
            fullName: profile.fullName,
            profilePicUrl: profile.profilePicUrl,
            role: profile.role,
          }));
      }
    }

    return this.api.searchUsersViaSearch('').catch(() => []);
  }

  private async ensureSelectedPost(posts: PostResponse[]): Promise<PostResponse[]> {
    const selectedPostId = this.selectedPostId();
    if (!selectedPostId) {
      return posts;
    }

    const found = posts.find((post) => post.postId === selectedPostId);
    if (found) {
      return [found, ...posts.filter((post) => post.postId !== selectedPostId)];
    }

    const selected = await this.api.getPostById(selectedPostId).catch(() => null);
    if (!selected || selected.deleted) {
      return posts;
    }
    return [selected, ...posts];
  }

  private async notifyFollowers(message: string, targetId: string, targetType: string): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      return;
    }

    const followers = await this.api.getFollowers(user.userId).catch(() => []);
    const recipientIds = Array.from(
      new Set(
        followers
          .map((item) => item.followerId)
          .filter((recipientId) => recipientId !== user.userId),
      ),
    );

    if (!recipientIds.length) {
      return;
    }

    await this.api.sendBulkNotifications({
      recipientIds,
      actorId: user.userId,
      type: targetType,
      message,
      targetId,
      targetType,
    }).catch(() => undefined);
  }

  private async notifyMentions(actorId: string, content: string, postId: string): Promise<void> {
    const usernames = this.extractMentions(content);
    if (!usernames.length) {
      return;
    }

    for (const username of usernames) {
      const matches = await this.api.searchUsersViaSearch(username).catch(() => []);
      const target = matches.find((item) => item.username.toLowerCase() === username.toLowerCase());
      if (!target || target.userId === actorId) {
        continue;
      }

      await this.api.createNotification({
        recipientId: target.userId,
        actorId,
        type: 'MENTION',
        message: 'mentioned you in a post',
        targetId: postId,
        targetType: 'POST',
      }).catch(() => undefined);
    }
  }

  private extractMentions(content: string): string[] {
    const found = new Set<string>();
    const regex = /(^|\\s)@([a-zA-Z0-9_]{3,50})\\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      found.add(match[2]);
    }
    return Array.from(found);
  }

  private storeLikeMap(likes: LikeResponse[]): void {
    this.storeLikeMaps(likes);
  }

  private storeLikeMaps(likes: LikeResponse[]): void {
    this.postReactionTypes.set(
      likes
        .filter((item) => item.targetType === 'POST')
        .reduce<Record<string, 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY'>>((state, item) => {
          state[item.targetId] = item.reactionType;
          return state;
        }, {}),
    );

    this.likedPostIds.set(
      likes
        .filter((item) => item.targetType === 'POST')
        .reduce<Record<string, true>>((state, item) => {
          state[item.targetId] = true;
          return state;
        }, {}),
    );

    this.likedCommentIds.set(
      likes
        .filter((item) => item.targetType === 'COMMENT')
        .reduce<Record<string, true>>((state, item) => {
          state[item.targetId] = true;
          return state;
        }, {}),
    );
  }

  private async loadPublicProfiles(userIds: string[]): Promise<void> {
    const uniqueIds = Array.from(
      new Set(
        userIds.filter((userId) => !!userId && !this.directory.get(userId)),
      ),
    );

    await Promise.all(
      uniqueIds.map(async (userId) => {
        const profile = await this.api.getPublicUserProfile(userId).catch(() => null);
        this.directory.storePublicProfile(profile);
      }),
    );
  }

  private toCard(post: PostResponse): FeedCardView {
    return {
      post,
      author: this.directory.get(post.authorId),
      comments: [],
      commentsLoaded: false,
      likePulse: false,
    };
  }
}

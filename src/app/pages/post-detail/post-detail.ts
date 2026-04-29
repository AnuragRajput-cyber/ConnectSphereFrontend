import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AvatarComponent } from '../../components/avatar/avatar';
import { CommentItemComponent } from '../../components/comment-item/comment-item';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';
import { ShareSheetComponent } from '../../components/share-sheet/share-sheet';
import { UiIconComponent } from '../../components/ui-icon/ui-icon';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { CommentResponse, PostResponse, PublicUserProfile, UserProfile, UserSummary } from '../../core/social.models';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { UserDirectoryService } from '../../core/user-directory.service';

@Component({
  selector: 'app-post-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent, CommentItemComponent, EmptyStateComponent, ShareSheetComponent, UiIconComponent],
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.scss',
})
export class PostDetailPage {
  private readonly api = inject(ConnectSphereApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly directory = inject(UserDirectoryService);

  readonly currentUser = this.session.user;
  readonly loading = signal(true);
  readonly postId = signal<string | null>(null);
  readonly post = signal<PostResponse | null>(null);
  readonly author = signal<UserProfile | PublicUserProfile | null>(null);
  readonly comments = signal<CommentResponse[]>([]);
  readonly relatedPosts = signal<PostResponse[]>([]);
  readonly liked = signal(false);
  readonly reactionType = signal<null | 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY'>(null);
  readonly likedCommentIds = signal<Record<string, true>>({});
  readonly commentDraft = signal('');
  readonly replyingToId = signal<string | null>(null);
  readonly replyDraft = signal('');
  readonly editingCommentId = signal<string | null>(null);
  readonly editDraft = signal('');
  readonly expandedThreads = signal<Record<string, true>>({});
  readonly loadingRepliesFor = signal<Record<string, true>>({});
  readonly repliesByCommentId = signal<Record<string, CommentResponse[]>>({});
  readonly shareRecipients = signal<UserSummary[]>([]);
  readonly shareOpen = signal(false);
  readonly sharingToId = signal<string | null>(null);

  constructor() {
    this.route.paramMap.subscribe((params) => this.postId.set(params.get('postId')));

    effect(() => {
      this.postId();
      this.currentUser();
      void this.load();
    });
  }

  authorName(): string {
    const author = this.author();
    return author?.fullName || 'Unknown user';
  }

  authorHandle(): string {
    const author = this.author();
    return author?.username ? `@${author.username}` : '';
  }

  authorAvatar(): string | null {
    return this.author()?.profilePicUrl || null;
  }

  canDelete(): boolean {
    const user = this.currentUser();
    return !!user && (user.userId === this.post()?.authorId || user.role === 'ADMIN');
  }

  isVideo(url: string): boolean {
    return /\.(mp4|webm|ogg)($|\?)/i.test(url);
  }

  openProfile(): void {
    const authorId = this.post()?.authorId;
    if (authorId) {
      void this.router.navigate(['/profile', authorId]);
    }
  }

  openRelated(postId: string): void {
    void this.router.navigate(['/post', postId]);
  }

  openCommentProfile(userId: string): void {
    void this.router.navigate(['/profile', userId]);
  }

  backToFeed(): void {
    void this.router.navigateByUrl('/feed');
  }

  canManageComment(comment: CommentResponse): boolean {
    const user = this.currentUser();
    return !!user && (user.userId === comment.authorId || user.role === 'ADMIN');
  }

  repliesFor(commentId: string): CommentResponse[] {
    return this.repliesByCommentId()[commentId] ?? [];
  }

  threadExpanded(commentId: string): boolean {
    return !!this.expandedThreads()[commentId];
  }

  isEditing(commentId: string): boolean {
    return this.editingCommentId() === commentId;
  }

  isReplying(commentId: string): boolean {
    return this.replyingToId() === commentId;
  }

  async toggleLike(): Promise<void> {
    const user = this.currentUser();
    const post = this.post();
    if (!user) {
      void this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
      return;
    }
    if (!post) {
      return;
    }

    try {
      if (this.liked()) {
        await this.api.unlikePost(user.userId, post.postId);
        this.liked.set(false);
        this.reactionType.set(null);
        this.post.update((value) => value ? { ...value, likesCount: Math.max(0, value.likesCount - 1) } : value);
      } else {
        await this.api.likePost(user.userId, post.postId);
        this.liked.set(true);
        this.reactionType.set('LIKE');
        this.post.update((value) => value ? { ...value, likesCount: value.likesCount + 1 } : value);
      }
    } catch {
      this.toast.show('Like failed', 'Could not update the reaction.', 'warning');
    }
  }

  async setReaction(next: 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' | 'NONE'): Promise<void> {
    const user = this.currentUser();
    const post = this.post();
    if (!user || !post) {
      return;
    }

    if (next === 'NONE') {
      if (!this.liked()) {
        return;
      }
      await this.toggleLike();
      return;
    }

    try {
      if (!this.liked()) {
        await this.api.reactToPost(user.userId, post.postId, next);
        this.liked.set(true);
        this.post.update((value) => value ? { ...value, likesCount: value.likesCount + 1 } : value);
      } else if (this.reactionType() !== next) {
        await this.api.changeReaction(user.userId, post.postId, 'POST', next);
      }

      this.reactionType.set(next);
    } catch {
      this.toast.show('Reaction failed', 'Could not update the reaction type.', 'warning');
    }
  }

  async submitComment(): Promise<void> {
    const user = this.currentUser();
    const post = this.post();
    const text = this.commentDraft().trim();
    if (!user) {
      void this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
      return;
    }
    if (!post || !text) {
      return;
    }

    try {
      const comment = await this.api.addComment({
        postId: post.postId,
        authorId: user.userId,
        content: text,
      });
      this.comments.update((items) => [...items, comment]);
      this.post.update((value) => value ? { ...value, commentsCount: value.commentsCount + 1 } : value);
      this.commentDraft.set('');
    } catch {
      this.toast.show('Comment failed', 'Your comment could not be posted.', 'warning');
    }
  }

  async toggleThread(commentId: string): Promise<void> {
    const expanded = this.threadExpanded(commentId);
    if (expanded) {
      this.expandedThreads.update((state) => {
        const next = { ...state };
        delete next[commentId];
        return next;
      });
      return;
    }

    this.expandedThreads.update((state) => ({ ...state, [commentId]: true }));
    if (!this.repliesByCommentId()[commentId]) {
      await this.loadReplies(commentId);
    }
  }

  async openReply(commentId: string): Promise<void> {
    this.replyingToId.set(this.replyingToId() === commentId ? null : commentId);
    this.replyDraft.set('');
    if (this.replyingToId()) {
      await this.toggleThread(commentId);
    }
  }

  beginEdit(comment: CommentResponse): void {
    this.editingCommentId.set(comment.commentId);
    this.editDraft.set(comment.content);
  }

  cancelEdit(): void {
    this.editingCommentId.set(null);
    this.editDraft.set('');
  }

  async saveEdit(comment: CommentResponse): Promise<void> {
    const content = this.editDraft().trim();
    if (!content) {
      return;
    }

    try {
      const updated = await this.api.updateComment(comment.commentId, content);
      this.comments.update((items) => items.map((item) => item.commentId === updated.commentId ? updated : item));
      this.repliesByCommentId.update((state) => this.mapReplies(state, updated));
      this.cancelEdit();
      this.toast.show('Comment updated', 'Your comment was updated.', 'success');
    } catch {
      this.toast.show('Update failed', 'Could not save your comment changes.', 'warning');
    }
  }

  commentLiked(commentId: string): boolean {
    return !!this.likedCommentIds()[commentId];
  }

  async toggleCommentLike(commentId: string): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      void this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
      return;
    }

    const alreadyLiked = this.commentLiked(commentId);
    try {
      if (alreadyLiked) {
        await this.api.unlikeComment(user.userId, commentId);
      } else {
        await this.api.likeComment(user.userId, commentId);
      }

      this.likedCommentIds.update((state) => {
        const next = { ...state };
        if (alreadyLiked) {
          delete next[commentId];
        } else {
          next[commentId] = true;
        }
        return next;
      });

      this.comments.update((items) =>
        items.map((item) =>
          item.commentId === commentId
            ? { ...item, likesCount: Math.max(0, item.likesCount + (alreadyLiked ? -1 : 1)) }
            : item,
        ),
      );
      this.repliesByCommentId.update((state) => this.mapReplyCounts(state, commentId, alreadyLiked ? -1 : 1));
    } catch {
      this.toast.show('Like failed', 'Could not update the comment reaction.', 'warning');
    }
  }

  async submitReply(parentCommentId: string): Promise<void> {
    const user = this.currentUser();
    const post = this.post();
    const text = this.replyDraft().trim();
    if (!user || !post || !text) {
      return;
    }

    try {
      const reply = await this.api.addComment({
        postId: post.postId,
        authorId: user.userId,
        content: text,
        parentCommentId,
      });
      this.repliesByCommentId.update((state) => ({
        ...state,
        [parentCommentId]: [...(state[parentCommentId] ?? []), reply],
      }));
      this.replyingToId.set(null);
      this.replyDraft.set('');
      this.expandedThreads.update((state) => ({ ...state, [parentCommentId]: true }));
      this.post.update((value) => value ? { ...value, commentsCount: value.commentsCount + 1 } : value);
      this.toast.show('Reply posted', 'Your reply was added to the thread.', 'success');
    } catch {
      this.toast.show('Reply failed', 'Could not post your reply.', 'warning');
    }
  }

  async deleteComment(comment: CommentResponse): Promise<void> {
    const confirmed = window.confirm('Delete this comment?');
    if (!confirmed) {
      return;
    }

    try {
      await this.api.deleteComment(comment.commentId);
      if (comment.parentCommentId) {
        this.repliesByCommentId.update((state) => ({
          ...state,
          [comment.parentCommentId!]: (state[comment.parentCommentId!] ?? []).filter((item) => item.commentId !== comment.commentId),
        }));
      } else {
        this.comments.update((items) => items.filter((item) => item.commentId !== comment.commentId));
      }
      this.post.update((value) => value ? { ...value, commentsCount: Math.max(0, value.commentsCount - 1) } : value);
      if (this.editingCommentId() === comment.commentId) {
        this.cancelEdit();
      }
      this.toast.show('Comment deleted', 'The comment was removed.', 'success');
    } catch {
      this.toast.show('Delete failed', 'Could not remove the comment.', 'warning');
    }
  }

  async reportPost(): Promise<void> {
    const post = this.post();
    if (!post) {
      return;
    }
    await this.reportTarget('POST', post.postId);
  }

  async reportComment(commentId: string): Promise<void> {
    await this.reportTarget('COMMENT', commentId);
  }

  async share(): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser) {
      void this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
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
            username: profile.username,
            fullName: profile.fullName,
            profilePicUrl: profile.profilePicUrl,
            role: profile.role,
          })),
      );
      this.shareOpen.set(true);
    } catch {
      this.toast.show('Share unavailable', 'Could not load your followings for sharing.', 'warning');
    }
  }

  closeShare(): void {
    this.shareOpen.set(false);
    this.shareRecipients.set([]);
    this.sharingToId.set(null);
  }

  async shareToUser(recipientId: string): Promise<void> {
    const currentUser = this.currentUser();
    const post = this.post();
    if (!currentUser || !post) {
      return;
    }

    this.sharingToId.set(recipientId);
    try {
      const conversation = await this.api.createConversation(currentUser.userId, recipientId);
      await this.api.sendMessage({
        conversationId: conversation.conversationId,
        senderId: currentUser.userId,
        recipientId,
        content: `Shared a post with you: ${window.location.origin}/post/${post.postId}`,
      });
      this.toast.show('Post shared', 'The post was sent in messages.', 'success');
      this.closeShare();
    } catch {
      this.toast.show('Share failed', 'The post could not be sent in chat.', 'warning');
      this.sharingToId.set(null);
    }
  }

  async deletePost(): Promise<void> {
    const post = this.post();
    const currentUser = this.currentUser();
    if (!post || !currentUser || (currentUser.userId !== post.authorId && currentUser.role !== 'ADMIN')) {
      return;
    }

    const confirmed = window.confirm('Delete this post? It will be removed from your timeline.');
    if (!confirmed) {
      return;
    }

    try {
      await this.api.deletePost(post.postId);
      this.toast.show('Post deleted', 'The post was removed successfully.', 'success');
      await this.router.navigate(['/profile', currentUser.userId]);
    } catch {
      this.toast.show('Delete failed', 'The post could not be deleted.', 'warning');
    }
  }

  profileName(authorId: string): string {
    return this.directory.displayName(authorId);
  }

  profileUsername(authorId: string): string | null {
    return this.directory.get(authorId)?.username || null;
  }

  profileAvatar(authorId: string): string | null {
    return this.directory.avatarUrl(authorId);
  }

  private async load(): Promise<void> {
    const postId = this.postId();
    if (!postId) {
      this.loading.set(false);
      this.post.set(null);
      return;
    }

    this.loading.set(true);
    this.replyingToId.set(null);
    this.editingCommentId.set(null);
    this.repliesByCommentId.set({});
    this.expandedThreads.set({});
    try {
      const post = await this.api.getPostById(postId).catch(() => null);
      if (!post || post.deleted) {
        this.post.set(null);
        return;
      }

      this.post.set(post);

      const [author, comments, relatedPosts, likes, userLikes] = await Promise.all([
        this.api.getPublicUserProfile(post.authorId).catch(() => null),
        this.api.getComments(post.postId).catch(() => []),
        this.api.getPostsByUser(post.authorId).catch(() => []),
        this.api.getLikesByTarget(post.postId, 'POST').catch(() => []),
        this.currentUser() ? this.api.getLikesByUser(this.currentUser()!.userId).catch(() => []) : Promise.resolve([]),
      ]);

      this.author.set(author);
      this.comments.set(comments);
      this.relatedPosts.set(
        relatedPosts
          .filter((item) => item.postId !== post.postId && !item.deleted)
          .slice(0, 4),
      );

      this.directory.storePublicProfile(author);
      const currentUserId = this.currentUser()?.userId ?? null;
      const ownLike = currentUserId ? likes.find((item) => item.userId === currentUserId) ?? null : null;
      this.liked.set(!!ownLike);
      this.reactionType.set(ownLike ? ownLike.reactionType : null);
      this.likedCommentIds.set(
        userLikes
          .filter((item) => item.targetType === 'COMMENT')
          .reduce<Record<string, true>>((state, item) => {
            state[item.targetId] = true;
            return state;
          }, {}),
      );

      const missingUsers = Array.from(
        new Set(comments.map((comment) => comment.authorId).filter((userId) => !this.directory.get(userId))),
      );

      await Promise.all(
        missingUsers.map(async (userId) => {
          const profile = await this.api.getPublicUserProfile(userId).catch(() => null);
          this.directory.storePublicProfile(profile);
        }),
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async loadReplies(commentId: string): Promise<void> {
    this.loadingRepliesFor.update((state) => ({ ...state, [commentId]: true }));
    try {
      const replies = await this.api.getReplies(commentId).catch(() => []);
      this.repliesByCommentId.update((state) => ({ ...state, [commentId]: replies }));
      await this.loadPublicProfiles(replies.map((reply) => reply.authorId));
    } finally {
      this.loadingRepliesFor.update((state) => {
        const next = { ...state };
        delete next[commentId];
        return next;
      });
    }
  }

  private async loadPublicProfiles(userIds: string[]): Promise<void> {
    const missingUsers = Array.from(
      new Set(userIds.filter((userId) => userId && !this.directory.get(userId))),
    );
    await Promise.all(
      missingUsers.map(async (userId) => {
        const profile = await this.api.getPublicUserProfile(userId).catch(() => null);
        this.directory.storePublicProfile(profile);
      }),
    );
  }

  private mapReplies(
    state: Record<string, CommentResponse[]>,
    updated: CommentResponse,
  ): Record<string, CommentResponse[]> {
    const next = { ...state };
    for (const key of Object.keys(next)) {
      next[key] = next[key].map((reply) => reply.commentId === updated.commentId ? updated : reply);
    }
    return next;
  }

  private mapReplyCounts(
    state: Record<string, CommentResponse[]>,
    commentId: string,
    delta: number,
  ): Record<string, CommentResponse[]> {
    const next = { ...state };
    for (const key of Object.keys(next)) {
      next[key] = next[key].map((reply) =>
        reply.commentId === commentId
          ? { ...reply, likesCount: Math.max(0, reply.likesCount + delta) }
          : reply,
      );
    }
    return next;
  }

  private async reportTarget(targetType: 'POST' | 'COMMENT', targetId: string): Promise<void> {
    if (!this.currentUser()) {
      void this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
      return;
    }

    const reason = window.prompt(`Why are you reporting this ${targetType.toLowerCase()}?`, 'Inappropriate content');
    if (!reason || !reason.trim()) {
      return;
    }

    const details = window.prompt('Additional details (optional)', '') ?? '';

    try {
      await this.api.createReport({
        targetType,
        targetId,
        reason: reason.trim(),
        details: details.trim(),
      });
      this.toast.show('Report submitted', 'Thanks, the moderation team can now review it.', 'success');
    } catch {
      this.toast.show('Report failed', 'Could not submit the moderation report.', 'warning');
    }
  }
}

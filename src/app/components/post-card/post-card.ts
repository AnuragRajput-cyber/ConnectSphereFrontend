import { CommonModule } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedCardView } from '../../core/social.models';
import { UserDirectoryService } from '../../core/user-directory.service';
import { AvatarComponent } from '../avatar/avatar';
import { CommentItemComponent } from '../comment-item/comment-item';
import { UiIconComponent } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, FormsModule, UiIconComponent, AvatarComponent, CommentItemComponent],
  templateUrl: './post-card.html',
  styleUrl: './post-card.scss',
})
export class PostCardComponent {
  private readonly directory = inject(UserDirectoryService);

  readonly view = input.required<FeedCardView>();
  readonly currentUserId = input<string | null>(null);
  readonly liked = input(false);
  readonly reactionType = input<'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' | null>(null);
  readonly likedCommentIds = input<Record<string, true>>({});
  readonly authRequested = output<void>();
  readonly likeToggled = output<string>();
  readonly reactionChanged = output<{ postId: string; reactionType: 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' | 'NONE' }>();
  readonly commentsRequested = output<string>();
  readonly commentSubmitted = output<{ postId: string; text: string }>();
  readonly commentUpdated = output<{ postId: string; commentId: string; content: string }>();
  readonly commentDeleted = output<{ postId: string; commentId: string }>();
  readonly commentReported = output<{ postId: string; commentId: string }>();
  readonly commentLikeToggled = output<{ postId: string; commentId: string }>();
  readonly shareRequested = output<void>();
  readonly profileRequested = output<string>();
  readonly postRequested = output<string>();

  readonly commentsOpen = signal(false);
  readonly commentDraft = signal('');
  readonly editingCommentId = signal<string | null>(null);
  readonly editDraft = signal('');

  authorName(): string {
    return this.view().author?.fullName || this.directory.displayName(this.view().post.authorId);
  }

  handle(): string {
    return this.view().author?.username
      ? `@${this.view().author?.username}`
      : this.directory.handle(this.view().post.authorId);
  }

  avatar(authorId: string): string | null {
    return this.directory.avatarUrl(authorId);
  }

  commentAuthorName(authorId: string): string {
    return this.directory.displayName(authorId);
  }

  commentHandle(authorId: string): string | null {
    return this.directory.get(authorId)?.username || null;
  }

  isVideo(url: string): boolean {
    return /\.(mp4|webm|ogg)($|\?)/i.test(url);
  }

  commentLiked(commentId: string): boolean {
    return !!this.likedCommentIds()[commentId];
  }

  canManageComment(authorId: string): boolean {
    return !!this.currentUserId() && this.currentUserId() === authorId;
  }

  isEditing(commentId: string): boolean {
    return this.editingCommentId() === commentId;
  }

  toggleLike(): void {
    if (!this.currentUserId()) {
      this.authRequested.emit();
      return;
    }

    this.likeToggled.emit(this.view().post.postId);
  }

  changeReaction(reactionType: 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' | 'NONE'): void {
    if (!this.currentUserId()) {
      this.authRequested.emit();
      return;
    }
    this.reactionChanged.emit({ postId: this.view().post.postId, reactionType });
  }

  toggleComments(): void {
    this.commentsOpen.update((value) => !value);
    if (this.commentsOpen() && !this.view().commentsLoaded) {
      this.commentsRequested.emit(this.view().post.postId);
    }
  }

  submitComment(): void {
    if (!this.currentUserId()) {
      this.authRequested.emit();
      return;
    }

    const text = this.commentDraft().trim();
    if (!text) {
      return;
    }

    this.commentSubmitted.emit({ postId: this.view().post.postId, text });
    this.commentDraft.set('');
    this.commentsOpen.set(true);
  }

  startEdit(commentId: string, content: string): void {
    this.editingCommentId.set(commentId);
    this.editDraft.set(content);
  }

  cancelEdit(): void {
    this.editingCommentId.set(null);
    this.editDraft.set('');
  }

  saveEdit(commentId: string): void {
    const content = this.editDraft().trim();
    if (!content) {
      return;
    }
    this.commentUpdated.emit({ postId: this.view().post.postId, commentId, content });
    this.cancelEdit();
  }
}

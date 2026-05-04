import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AvatarComponent } from '../../components/avatar/avatar';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-create-post-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AvatarComponent, EmptyStateComponent],
  templateUrl: './create-post.html',
  styleUrl: './create-post.scss',
})
export class CreatePostPage {
  private readonly api = inject(ConnectSphereApiService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);

  readonly currentUser = this.session.user;
  readonly content = signal('');
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly visibility = signal<'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'>('PUBLIC');
  readonly publishing = signal(false);
  readonly canSubmit = computed(() => !!this.content().trim() || !!this.selectedFile());

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedFile.set(file);
    this.previewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  async publish(): Promise<void> {
    const user = this.currentUser();
    if (!user || !this.canSubmit()) {
      return;
    }

    this.publishing.set(true);
    try {
      const mediaUrls: string[] = [];
      if (this.selectedFile()) {
        const media = await this.api.uploadMedia(user.userId, this.selectedFile()!);
        mediaUrls.push(media.url);
      }

      const post = await this.api.createPost({
        authorId: user.userId,
        content: this.content().trim(),
        mediaUrls,
        postType: mediaUrls.length
          ? this.content().trim()
            ? 'TEXT_AND_MEDIA'
            : 'MEDIA_ONLY'
          : 'TEXT_ONLY',
        visibility: this.visibility(),
      });

      if (this.content().trim()) {
        await this.notifyMentions(user.userId, this.content().trim(), post.postId).catch(() => undefined);
      }

      const followers = await this.api.getFollowers(user.userId).catch(() => []);
      const recipientIds = Array.from(
        new Set(
          followers
            .map((item) => item.followerId)
            .filter((recipientId) => recipientId !== user.userId),
        ),
      );

      if (recipientIds.length) {
        await this.api.sendBulkNotifications({
          recipientIds,
          actorId: user.userId,
          type: 'POST',
          message: `${user.fullName} shared a new post.`,
          targetId: post.postId,
          targetType: 'POST',
        }).catch(() => undefined);
      }

      this.toast.show('Post published', 'Your post is live on the feed.', 'success');
      await this.router.navigate(['/post', post.postId]);
    } catch (error) {
      this.toast.show(
        'Publish failed',
        error instanceof Error ? error.message : 'The post could not be published right now.',
        'warning',
      );
    } finally {
      this.publishing.set(false);
    }
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
    const regex = /(^|\s)@([a-zA-Z0-9_]{3,50})\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      found.add(match[2]);
    }
    return Array.from(found);
  }
}

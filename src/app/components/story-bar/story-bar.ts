import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { StoryResponse } from '../../core/social.models';
import { UserDirectoryService } from '../../core/user-directory.service';
import { buildAvatarDataUri } from '../../core/visuals';
import { UiIconComponent } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-story-bar',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  templateUrl: './story-bar.html',
  styleUrl: './story-bar.scss',
})
export class StoryBarComponent {
  private readonly directory = inject(UserDirectoryService);

  readonly stories = input<StoryResponse[]>([]);
  readonly canCreate = input(false);
  readonly currentUserId = input<string | null>(null);
  readonly createStory = output<File>();
  readonly storySelected = output<StoryResponse>();

  storyList(): StoryResponse[] {
    const latestByAuthor = new Map<string, StoryResponse>();
    for (const story of this.stories()) {
      if (!latestByAuthor.has(story.authorId)) {
        latestByAuthor.set(story.authorId, story);
      }
    }
    return Array.from(latestByAuthor.values());
  }

  ownStory(): StoryResponse | null {
    const currentUserId = this.currentUserId();
    return this.storyList().find((story) => story.authorId === currentUserId) ?? null;
  }

  otherStories(): StoryResponse[] {
    const ownStoryId = this.ownStory()?.storyId;
    return this.storyList().filter((story) => story.storyId !== ownStoryId);
  }

  displayName(authorId: string): string {
    return this.directory.displayName(authorId);
  }

  avatar(authorId: string): string {
    const profilePicUrl = this.directory.avatarUrl(authorId);
    return profilePicUrl || buildAvatarDataUri(this.displayName(authorId), authorId);
  }

  preview(story: StoryResponse): string {
    return this.isVideo(story) ? this.avatar(story.authorId) : story.mediaUrl;
  }

  isVideo(story: StoryResponse): boolean {
    return story.mediaType === 'VIDEO' || /\.mp4($|\?)/i.test(story.mediaUrl);
  }

  openStory(story: StoryResponse): void {
    this.storySelected.emit(story);
  }

  upload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.createStory.emit(file);
    }
  }
}

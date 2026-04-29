import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { ConversationResponse } from '../../core/social.models';
import { UserDirectoryService } from '../../core/user-directory.service';
import { AvatarComponent } from '../avatar/avatar';

@Component({
  selector: 'app-chat-list-item',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './chat-list-item.html',
  styleUrl: './chat-list-item.scss',
})
export class ChatListItemComponent {
  private readonly directory = inject(UserDirectoryService);

  readonly conversation = input.required<ConversationResponse>();
  readonly currentUserId = input.required<string>();
  readonly active = input(false);
  readonly selected = output<string>();

  participantId(): string {
    return this.conversation().participantOneId === this.currentUserId()
      ? this.conversation().participantTwoId
      : this.conversation().participantOneId;
  }

  name(): string {
    return this.directory.displayName(this.participantId());
  }

  handle(): string {
    return this.directory.handle(this.participantId());
  }

  avatarUrl(): string | null {
    return this.directory.avatarUrl(this.participantId());
  }
}

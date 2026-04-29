import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { CommentResponse } from '../../core/social.models';
import { AvatarComponent } from '../avatar/avatar';
import { UiIconComponent } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-comment-item',
  standalone: true,
  imports: [CommonModule, AvatarComponent, UiIconComponent],
  templateUrl: './comment-item.html',
  styleUrl: './comment-item.scss',
})
export class CommentItemComponent {
  readonly comment = input.required<CommentResponse>();
  readonly authorName = input.required<string>();
  readonly authorUsername = input<string | null>(null);
  readonly authorAvatar = input<string | null>(null);
  readonly liked = input(false);
  readonly canLike = input(true);
  readonly canReply = input(false);
  readonly canManage = input(false);
  readonly canReport = input(false);
  readonly nested = input(false);
  readonly profileRequested = output<string>();
  readonly likeRequested = output<string>();
  readonly replyRequested = output<string>();
  readonly editRequested = output<string>();
  readonly deleteRequested = output<string>();
  readonly reportRequested = output<string>();
}

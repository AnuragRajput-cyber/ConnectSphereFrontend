import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { AvatarComponent } from '../avatar/avatar';
import { NotificationResponse } from '../../core/social.models';

@Component({
  selector: 'app-notification-item',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './notification-item.html',
  styleUrl: './notification-item.scss',
})
export class NotificationItemComponent {
  readonly item = input.required<NotificationResponse>();
  readonly actorName = input<string>('ConnectSphere');
  readonly actorAvatar = input<string | null>(null);
  readonly actorSeed = input<string>('');
  readonly opened = output<NotificationResponse>();
  readonly marked = output<string>();
  readonly removed = output<string>();
}

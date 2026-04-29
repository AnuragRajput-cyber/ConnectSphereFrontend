import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { AvatarComponent } from '../avatar/avatar';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './user-card.html',
  styleUrl: './user-card.scss',
})
export class UserCardComponent {
  readonly user = input.required<{
    userId: string;
    fullName: string;
    username: string;
    profilePicUrl: string | null;
    bio?: string | null;
  }>();
  readonly following = input(false);
  readonly pending = input(false);
  readonly compact = input(false);
  readonly showMessage = input(false);
  readonly showFollow = input(true);
  readonly currentUserId = input<string | null>(null);
  readonly followRequested = output<string>();
  readonly messageRequested = output<string>();
  readonly profileRequested = output<string>();
  readonly isSelf = computed(() => !!this.currentUserId() && this.currentUserId() === this.user().userId);
  readonly followLabel = computed(() => {
    if (this.pending()) {
      return 'Requested';
    }
    return this.following() ? 'Following' : 'Follow';
  });
}

import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { AvatarComponent } from '../avatar/avatar';

@Component({
  selector: 'app-profile-header',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './profile-header.html',
  styleUrl: './profile-header.scss',
})
export class ProfileHeaderComponent {
  readonly user = input.required<{
    userId: string;
    fullName: string;
    username: string;
    profilePicUrl: string | null;
    bio?: string | null;
  }>();
  readonly counts = input.required<{ posts: number; followers: number; following: number }>();
  readonly ownProfile = input(false);
  readonly following = input(false);
  readonly pending = input(false);
  readonly followPending = input(false);
  readonly editRequested = output<void>();
  readonly followRequested = output<void>();
  readonly messageRequested = output<void>();

  readonly followLabel = computed(() => {
    if (this.pending()) {
      return 'Requested';
    }
    return this.following() ? 'Following' : 'Follow';
  });
}

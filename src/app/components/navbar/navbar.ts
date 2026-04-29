import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserProfile } from '../../core/social.models';
import { AvatarComponent } from '../avatar/avatar';
import { UiIconComponent } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, UiIconComponent, AvatarComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  readonly route = input('/');
  readonly currentUser = input<UserProfile | null>(null);
  readonly authRequested = output<void>();

  readonly title = computed(() => {
    const current = this.route().split('?')[0];
    if (current.startsWith('/feed')) {
      return {
        title: 'Home',
        subtitle: 'Stories, fresh posts, and quick interactions powered by your existing services.',
      };
    }

    if (current.startsWith('/discover') || current.startsWith('/search')) {
      return {
        title: 'Discover',
        subtitle: 'Search users, hashtags, and media-rich posts from the live backend.',
      };
    }

    if (current.startsWith('/messages')) {
      return {
        title: 'Messages',
        subtitle: 'Realtime chat with the existing REST and websocket conversation flow.',
      };
    }

    if (current.startsWith('/notifications')) {
      return {
        title: 'Notifications',
        subtitle: 'Likes, follows, comments, and story activity coming from notification-service.',
      };
    }

    if (current.startsWith('/profile')) {
      return {
        title: 'Profile',
        subtitle: 'Public and personal profiles shaped around auth-service, follow-service, and post-service.',
      };
    }

    if (current.startsWith('/post/')) {
      return {
        title: 'Post',
        subtitle: 'A focused view for media, comments, and reactions.',
      };
    }

    if (current.startsWith('/create-post')) {
      return {
        title: 'Create',
        subtitle: 'Compose a live post and upload media through your current backend.',
      };
    }

    return {
      title: 'ConnectSphere',
      subtitle: 'A premium frontend skin over your existing microservices.',
    };
  });
}

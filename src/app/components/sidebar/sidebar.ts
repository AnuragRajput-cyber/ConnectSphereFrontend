import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem, UserProfile } from '../../core/social.models';
import { AvatarComponent } from '../avatar/avatar';
import { UiIconComponent } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, UiIconComponent, AvatarComponent],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent {
  readonly currentUser = input<UserProfile | null>(null);
  readonly conversationCount = input(0);
  readonly unreadNotifications = input(0);
  readonly isAuthenticated = input(false);
  readonly authRequested = output<void>();
  readonly logoutRequested = output<void>();

  readonly navItems: NavItem[] = [
    { route: '/feed', label: 'Home', icon: 'home' },
    { route: '/discover', label: 'Search', icon: 'explore' },
    { route: '/messages', label: 'Messages', icon: 'messages' },
    { route: '/notifications', label: 'Activity', icon: 'notifications' },
    { route: '/profile/me', label: 'Profile', icon: 'profile' },
  ];

  isAdmin(): boolean {
    const role = this.currentUser()?.role?.toUpperCase();
    return role === 'ADMIN' || role === 'ROLE_ADMIN';
  }
}

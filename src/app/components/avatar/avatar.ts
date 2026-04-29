import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { buildAvatarDataUri } from '../../core/visuals';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class AvatarComponent {
  readonly src = input<string | null>(null);
  readonly name = input('User');
  readonly seed = input('user');
  readonly size = input(44);

  readonly fallback = computed(() => buildAvatarDataUri(this.name(), this.seed()));
}

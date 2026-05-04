import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';

type MentionSegment = {
  text: string;
  mention: boolean;
};

@Component({
  selector: 'app-mention-text',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mention-text.html',
  styleUrl: './mention-text.scss',
})
export class MentionTextComponent {
  readonly text = input('');

  readonly segments = computed<MentionSegment[]>(() => {
    const value = this.text() || '';
    if (!value.includes('@')) {
      return [{ text: value, mention: false }];
    }

    const parts = value.split(/(@[A-Za-z0-9_]{3,50}\b)/g).filter(Boolean);
    return parts.map((part) => ({
      text: part,
      mention: /^@[A-Za-z0-9_]{3,50}$/.test(part),
    }));
  });
}

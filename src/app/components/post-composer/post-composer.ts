import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserProfile } from '../../core/social.models';
import { AvatarComponent } from '../avatar/avatar';
import { UiIconComponent } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-post-composer',
  standalone: true,
  imports: [CommonModule, FormsModule, UiIconComponent, AvatarComponent],
  templateUrl: './post-composer.html',
  styleUrl: './post-composer.scss',
})
export class PostComposerComponent {
  readonly currentUser = input<UserProfile | null>(null);
  readonly busy = input(false);
  readonly submitted = output<{ content: string; file: File | null }>();
  readonly authRequested = output<void>();

  readonly content = signal('');
  readonly selectedFile = signal<File | null>(null);

  submit(): void {
    if (!this.currentUser()) {
      this.authRequested.emit();
      return;
    }

    const content = this.content().trim();
    if (!content && !this.selectedFile()) {
      return;
    }

    this.submitted.emit({
      content,
      file: this.selectedFile(),
    });
    this.content.set('');
    this.selectedFile.set(null);
  }

  onFileChange(event: Event): void {
    this.selectedFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }
}

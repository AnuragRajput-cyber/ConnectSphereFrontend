import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { AvatarComponent } from '../avatar/avatar';

@Component({
  selector: 'app-share-sheet',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './share-sheet.html',
  styleUrl: './share-sheet.scss',
})
export class ShareSheetComponent {
  readonly recipients = input.required<Array<{
    userId: string;
    fullName: string;
    username: string;
    profilePicUrl: string | null;
  }>>();
  readonly sendingToId = input<string | null>(null);
  readonly closed = output<void>();
  readonly shared = output<string>();
}

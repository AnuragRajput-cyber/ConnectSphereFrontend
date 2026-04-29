import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { UiIconComponent } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-toast-stack',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  templateUrl: './toast-stack.html',
  styleUrl: './toast-stack.scss',
})
export class ToastStackComponent {
  readonly toastService = inject(ToastService);
}

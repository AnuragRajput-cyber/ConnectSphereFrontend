import { CommonModule } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../core/session.service';
import { AuthMode, RegisterPendingResponse } from '../../core/social.models';
import { ToastService } from '../../core/toast.service';
import { UiIconComponent } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, UiIconComponent],
  templateUrl: './auth-modal.html',
  styleUrl: './auth-modal.scss',
})
export class AuthModalComponent {
  readonly open = input(false);
  readonly closed = output<void>();

  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);

  readonly mode = signal<AuthMode>('login');
  readonly working = signal(false);
  readonly pending = signal<RegisterPendingResponse | null>(null);
  readonly otpCode = signal('');
  readonly loginForm = {
    email: '',
    password: '',
  };
  readonly signupForm = {
    fullName: '',
    username: '',
    email: '',
    password: '',
    bio: '',
    profilePicUrl: '',
  };

  async submitLogin(): Promise<void> {
    this.working.set(true);
    try {
      await this.session.login(this.loginForm);
      this.toast.show('Welcome back', 'You are now connected to the live backend.', 'success');
      this.closed.emit();
    } catch (error) {
      this.toast.show(
        'Login failed',
        error instanceof Error ? error.message : 'Please review your credentials.',
        'warning',
      );
    } finally {
      this.working.set(false);
    }
  }

  async submitSignup(): Promise<void> {
    this.working.set(true);
    try {
      const pending = await this.session.signup(this.signupForm);
      this.pending.set(pending);
      this.toast.show('Verification sent', 'Enter the OTP to finish signup.', 'success');
    } catch (error) {
      this.toast.show(
        'Signup failed',
        error instanceof Error ? error.message : 'Please review the form and try again.',
        'warning',
      );
    } finally {
      this.working.set(false);
    }
  }

  async submitOtp(): Promise<void> {
    const pending = this.pending();
    if (!pending) {
      return;
    }
    this.working.set(true);
    try {
      await this.session.verifyEmail(pending.email, this.otpCode());
      this.toast.show('Verified', 'Email verified. Please log in.', 'success');
      this.pending.set(null);
      this.otpCode.set('');
      this.mode.set('login');
      this.loginForm.email = pending.email;
    } catch (error) {
      this.toast.show(
        'Verification failed',
        error instanceof Error ? error.message : 'Please check the code and try again.',
        'warning',
      );
    } finally {
      this.working.set(false);
    }
  }

  async resendOtp(): Promise<void> {
    const pending = this.pending();
    if (!pending) {
      return;
    }
    this.working.set(true);
    try {
      const refreshed = await this.session.resendOtp(pending.email);
      this.pending.set(refreshed);
      this.toast.show('Code resent', 'A new OTP has been sent.', 'success');
    } catch (error) {
      this.toast.show(
        'Resend failed',
        error instanceof Error ? error.message : 'Please try again.',
        'warning',
      );
    } finally {
      this.working.set(false);
    }
  }
}

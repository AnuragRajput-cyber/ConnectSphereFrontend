import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { RegisterPendingResponse } from '../../core/social.models';
import { ToastService } from '../../core/toast.service';
import { UiIconComponent } from '../../components/ui-icon/ui-icon';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, UiIconComponent],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class AuthPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);

  readonly working = signal(false);
  readonly redirectUrl = computed(() => this.route.snapshot.queryParamMap.get('redirect') || '/feed');
  readonly isSignup = computed(() => this.router.url.startsWith('/register'));
  readonly prefillEmail = computed(() => this.route.snapshot.queryParamMap.get('email') || '');

  readonly pending = signal<RegisterPendingResponse | null>(null);
  readonly otpCode = signal('');

  readonly forgotMode = signal(false);
  readonly resetMode = signal(false);
  readonly resetCode = signal('');
  readonly resetNewPassword = signal('');

  readonly loginForm = signal({
    email: '',
    password: '',
  });

  readonly signupForm = signal({
    fullName: '',
    username: '',
    email: '',
    password: '',
    bio: '',
    profilePicUrl: '',
  });

  heading(): string {
    if (this.pending()) {
      return 'Verify your email';
    }
    if (!this.isSignup() && this.forgotMode()) {
      return this.resetMode() ? 'Reset password' : 'Forgot password';
    }
    return this.isSignup() ? 'Create your account' : 'Welcome back';
  }

  subheading(): string {
    if (this.pending()) {
      return `We sent a 6-digit code to ${this.pending()!.email}. Enter it to activate your account.`;
    }
    if (!this.isSignup() && this.forgotMode()) {
      return this.resetMode()
        ? 'Enter the code from your email and choose a new password.'
        : 'Enter your email and we will send a reset code.';
    }
    return this.isSignup()
      ? 'Set up your ConnectSphere profile to start posting, chatting, and following people.'
      : 'Sign in to reach your live feed, profile, messages, and notifications.';
  }

  async submit(): Promise<void> {
    this.working.set(true);
    try {
      if (this.isSignup()) {
        const pending = await this.session.signup(this.signupForm());
        this.pending.set(pending);
        this.otpCode.set('');
        this.toast.show('Verification sent', 'Enter the OTP from your email to finish registration.', 'success');
        return;
      } else {
        if (this.forgotMode()) {
          if (!this.resetMode()) {
            await this.session.forgotPassword(this.loginForm().email);
            this.resetMode.set(true);
            this.toast.show('Reset code sent', 'Check your email for the 6-digit code.', 'success');
          } else {
            await this.session.resetPassword(
              this.loginForm().email,
              this.resetCode(),
              this.resetNewPassword(),
            );
            this.toast.show('Password updated', 'You can sign in with your new password.', 'success');
            this.cancelForgotPassword();
          }
          return;
        }

        await this.session.login(this.loginForm());
        this.toast.show('Signed in', 'Your live session is ready.', 'success');
      }

      await this.router.navigateByUrl(this.redirectUrl());
    } catch (error) {
      this.toast.show(
        this.isSignup() ? 'Signup failed' : (this.forgotMode() ? 'Action failed' : 'Login failed'),
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
      this.toast.show('Verified', 'Email verified. Please sign in.', 'success');
      this.pending.set(null);
      this.otpCode.set('');
      await this.router.navigate(['/login'], {
        queryParams: { redirect: this.redirectUrl(), email: pending.email },
      });
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
      this.otpCode.set('');
      this.toast.show('Code resent', 'A new OTP has been sent to your email.', 'success');
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

  enableForgotPassword(): void {
    this.forgotMode.set(true);
    this.resetMode.set(false);
    this.resetCode.set('');
    this.resetNewPassword.set('');
  }

  cancelForgotPassword(): void {
    this.forgotMode.set(false);
    this.resetMode.set(false);
    this.resetCode.set('');
    this.resetNewPassword.set('');
  }

  constructor() {
    const email = this.prefillEmail();
    if (email) {
      this.loginForm.update((value) => ({ ...value, email }));
    }
  }
}

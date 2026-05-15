import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
  readonly formError = signal('');

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
    const validationError = this.validatePrimaryForm();
    if (validationError) {
      this.formError.set(validationError);
      this.toast.show('Please fix the form', validationError, 'warning');
      return;
    }

    this.formError.set('');
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
      const message = this.mapPrimaryActionError(error);
      this.formError.set(message);
      this.toast.show(
        this.isSignup() ? 'Signup failed' : (this.forgotMode() ? 'Action failed' : 'Login failed'),
        message,
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

    const otpCode = this.otpCode().trim();
    if (!/^\d{6}$/.test(otpCode)) {
      const message = 'Please enter the 6-digit verification code sent to your email.';
      this.formError.set(message);
      this.toast.show('Invalid code', message, 'warning');
      return;
    }

    this.formError.set('');
    this.working.set(true);
    try {
      await this.session.verifyEmail(pending.email, otpCode);
      this.toast.show('Verified', 'Email verified. Please sign in.', 'success');
      this.pending.set(null);
      this.otpCode.set('');
      await this.router.navigate(['/login'], {
        queryParams: { redirect: this.redirectUrl(), email: pending.email },
      });
    } catch (error) {
      const message = this.mapOtpError(error);
      this.formError.set(message);
      this.toast.show(
        'Verification failed',
        message,
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

    this.formError.set('');
    this.working.set(true);
    try {
      const refreshed = await this.session.resendOtp(pending.email);
      this.pending.set(refreshed);
      this.otpCode.set('');
      this.toast.show('Code resent', 'A new OTP has been sent to your email.', 'success');
    } catch (error) {
      const message = this.mapOtpError(error);
      this.formError.set(message);
      this.toast.show(
        'Resend failed',
        message,
        'warning',
      );
    } finally {
      this.working.set(false);
    }
  }

  enableForgotPassword(): void {
    this.formError.set('');
    this.forgotMode.set(true);
    this.resetMode.set(false);
    this.resetCode.set('');
    this.resetNewPassword.set('');
  }

  cancelForgotPassword(): void {
    this.formError.set('');
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

  private validatePrimaryForm(): string {
    if (this.isSignup()) {
      const form = this.signupForm();
      if (!form.fullName.trim()) {
        return 'Please enter your full name.';
      }
      if (!form.username.trim()) {
        return 'Please choose a username.';
      }
      if (!this.isValidEmail(form.email)) {
        return 'Please enter a valid email address.';
      }
      if (form.password.trim().length < 7) {
        return 'Password must be more than 6 characters.';
      }
      return '';
    }

    if (this.forgotMode()) {
      if (!this.isValidEmail(this.loginForm().email)) {
        return 'Please enter a valid email address.';
      }

      if (!this.resetMode()) {
        return '';
      }

      if (!/^\d{6}$/.test(this.resetCode().trim())) {
        return 'Please enter the 6-digit reset code from your email.';
      }

      if (this.resetNewPassword().trim().length < 7) {
        return 'New password must be more than 6 characters.';
      }

      return '';
    }

    const form = this.loginForm();
    if (!this.isValidEmail(form.email)) {
      return 'Please enter a valid email address.';
    }
    if (form.password.trim().length < 7) {
      return 'Password must be more than 6 characters.';
    }

    return '';
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private mapPrimaryActionError(error: unknown): string {
    const apiMessage = this.readApiMessage(error);

    if (this.isSignup()) {
      if (apiMessage.includes('email') && apiMessage.includes('exist')) {
        return 'This email is already registered. Try signing in instead.';
      }
      if (apiMessage.includes('username') && apiMessage.includes('exist')) {
        return 'This username is already taken. Please choose another one.';
      }
      if (apiMessage.includes('verification email')) {
        return 'We could not send the verification email right now. Please try again in a moment.';
      }
      return 'We could not create your account. Please check your details and try again.';
    }

    if (this.forgotMode()) {
      if (!this.resetMode()) {
        return apiMessage.includes('not found')
          ? 'We could not find an account with that email address.'
          : 'We could not send the reset code right now. Please try again.';
      }

      if (apiMessage.includes('invalid') || apiMessage.includes('expired')) {
        return 'The reset code is invalid or expired. Please request a new one.';
      }

      return 'We could not reset your password. Please check the code and try again.';
    }

    if (error instanceof HttpErrorResponse && [400, 401, 403, 404].includes(error.status)) {
      return 'Incorrect email or password.';
    }

    if (apiMessage.includes('bad credentials') || apiMessage.includes('invalid credentials')) {
      return 'Incorrect email or password.';
    }

    return 'We could not sign you in. Please check your email and password and try again.';
  }

  private mapOtpError(error: unknown): string {
    const apiMessage = this.readApiMessage(error);
    if (apiMessage.includes('invalid') || apiMessage.includes('expired')) {
      return 'That verification code is invalid or expired. Please request a new code.';
    }
    return 'We could not verify your email right now. Please check the code and try again.';
  }

  private readApiMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiError = error.error;
      if (typeof apiError === 'string') {
        return apiError.toLowerCase();
      }
      if (apiError && typeof apiError.message === 'string') {
        return apiError.message.toLowerCase();
      }
    }

    if (error instanceof Error) {
      return error.message.toLowerCase();
    }

    return '';
  }
}

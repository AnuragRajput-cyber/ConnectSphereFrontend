import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { AuthResponse, UserProfile } from '../../core/social.models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-oauth-callback-page',
  standalone: true,
  template: '',
})
export class OAuthCallbackPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);

  constructor() {
    void this.handleCallback();
  }

  private async handleCallback(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const oauthError = params.get('oauthError');

    if (oauthError) {
      this.toast.show('OAuth login failed', oauthError, 'warning');
      await this.router.navigateByUrl('/login');
      return;
    }

    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const accessTokenExpiresAt = params.get('accessTokenExpiresAt');
    const refreshTokenExpiresAt = params.get('refreshTokenExpiresAt');
    const encodedUser = params.get('user');

    if (!accessToken || !refreshToken || !accessTokenExpiresAt || !refreshTokenExpiresAt || !encodedUser) {
      this.toast.show('OAuth login failed', 'The OAuth callback payload is incomplete.', 'warning');
      await this.router.navigateByUrl('/login');
      return;
    }

    try {
      const padded = this.padBase64(encodedUser.replace(/-/g, '+').replace(/_/g, '/'));
      const userJson = atob(padded);
      const user = JSON.parse(userJson) as UserProfile;
      const response: AuthResponse = {
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        user,
      };
      this.session.applyAuthResponse(response);
      this.toast.show('Signed in', 'Your OAuth session is ready.', 'success');
      await this.router.navigateByUrl('/feed');
    } catch {
      this.toast.show('OAuth login failed', 'The OAuth callback payload could not be read.', 'warning');
      await this.router.navigateByUrl('/login');
    }
  }

  private padBase64(value: string): string {
    const remainder = value.length % 4;
    if (remainder === 0) {
      return value;
    }
    return value + '='.repeat(4 - remainder);
  }
}

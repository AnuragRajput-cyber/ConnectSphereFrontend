import { computed, inject, Injectable, signal } from '@angular/core';
import { ConnectSphereApiService } from './connectsphere-api.service';
import {
  AuthResponse,
  LoginFormValue,
  RegisterPendingResponse,
  SessionState,
  SignupFormValue,
  UpdateProfileRequest,
  UserProfile,
} from './social.models';

const STORAGE_KEY = 'connectsphere.session';

const EMPTY_SESSION: SessionState = {
  accessToken: null,
  refreshToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  user: null,
};

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(ConnectSphereApiService);
  private readonly state = signal<SessionState>(this.readState());

  readonly snapshot = this.state.asReadonly();
  readonly accessToken = computed(() => this.state().accessToken);
  readonly refreshToken = computed(() => this.state().refreshToken);
  readonly user = computed(() => this.state().user);
  readonly isAuthenticated = computed(() => !!this.state().accessToken && !!this.state().user);

  async login(payload: LoginFormValue): Promise<UserProfile> {
    const response = await this.api.login(payload);
    this.applyAuthResponse(response);
    return response.user;
  }

  applyAuthResponse(response: AuthResponse): void {
    this.persist(response);
  }

  async signup(payload: SignupFormValue): Promise<RegisterPendingResponse> {
    return this.api.register({
      username: payload.username,
      email: payload.email,
      password: payload.password,
      fullName: payload.fullName,
      bio: payload.bio,
      profilePicUrl: payload.profilePicUrl,
    });
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    await this.api.verifyEmail(email, code);
  }

  async resendOtp(email: string): Promise<RegisterPendingResponse> {
    return this.api.resendOtp(email);
  }

  async forgotPassword(email: string): Promise<void> {
    await this.api.forgotPassword(email);
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await this.api.resetPassword(email, code, newPassword);
  }

  async hydrateProfile(): Promise<UserProfile | null> {
    if (!this.state().accessToken) {
      return null;
    }

    try {
      const profile = await this.api.getProfile();
      this.patchUser(profile);
      return profile;
    } catch {
      if (this.state().refreshToken) {
        try {
          const refreshed = await this.api.refresh(this.state().refreshToken!);
          this.persist(refreshed);
          return refreshed.user;
        } catch {
          this.clearSession();
          return null;
        }
      }

      this.clearSession();
      return null;
    }
  }

  async updateProfile(payload: UpdateProfileRequest): Promise<UserProfile> {
    const profile = await this.api.updateProfile(payload);
    this.patchUser(profile);
    return profile;
  }

  async deactivateAccount(): Promise<void> {
    await this.api.deactivateAccount();
    this.clearSession();
  }

  async logout(): Promise<void> {
    const accessToken = this.state().accessToken;
    const refreshToken = this.state().refreshToken;

    if (accessToken) {
      try {
        await this.api.logout(accessToken, refreshToken);
      } catch {
        // Clear the local session even if the network request fails.
      }
    }

    this.clearSession();
  }

  private persist(response: AuthResponse): void {
    const snapshot: SessionState = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      accessTokenExpiresAt: response.accessTokenExpiresAt,
      refreshTokenExpiresAt: response.refreshTokenExpiresAt,
      user: response.user,
    };
    this.state.set(snapshot);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  private patchUser(user: UserProfile): void {
    const snapshot: SessionState = {
      ...this.state(),
      user,
    };
    this.state.set(snapshot);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  private clearSession(): void {
    this.state.set(EMPTY_SESSION);
    localStorage.removeItem(STORAGE_KEY);
  }

  private readState(): SessionState {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_SESSION;
    }

    try {
      return {
        ...EMPTY_SESSION,
        ...(JSON.parse(raw) as SessionState),
      };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return EMPTY_SESSION;
    }
  }
}

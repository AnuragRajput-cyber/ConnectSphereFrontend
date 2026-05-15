import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AuthPage } from './auth';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { vi } from 'vitest';

describe('AuthPage', () => {
  let routerStub: { url: string; navigateByUrl: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn> };
  let sessionStub: {
    login: ReturnType<typeof vi.fn>;
    signup: ReturnType<typeof vi.fn>;
    verifyEmail: ReturnType<typeof vi.fn>;
    resendOtp: ReturnType<typeof vi.fn>;
    forgotPassword: ReturnType<typeof vi.fn>;
    resetPassword: ReturnType<typeof vi.fn>;
  };
  let toastStub: { show: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    routerStub = {
      url: '/login',
      navigateByUrl: vi.fn().mockResolvedValue(true),
      navigate: vi.fn().mockResolvedValue(true),
    };

    sessionStub = {
      login: vi.fn().mockResolvedValue({ userId: 'user-1' }),
      signup: vi.fn().mockResolvedValue({ email: 'new@example.com', expiresAt: new Date().toISOString() }),
      verifyEmail: vi.fn().mockResolvedValue(undefined),
      resendOtp: vi.fn().mockResolvedValue({ email: 'new@example.com', expiresAt: new Date().toISOString() }),
      forgotPassword: vi.fn().mockResolvedValue(undefined),
      resetPassword: vi.fn().mockResolvedValue(undefined),
    };

    toastStub = {
      show: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AuthPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ redirect: '/feed', email: '' }),
            },
          },
        },
        { provide: Router, useValue: routerStub },
        { provide: SessionService, useValue: sessionStub },
        { provide: ToastService, useValue: toastStub },
      ],
    }).compileComponents();
  });

  it('signs in and redirects to the requested page', async () => {
    const fixture = TestBed.createComponent(AuthPage);
    const component = fixture.componentInstance;

    component.loginForm.set({ email: 'demo@example.com', password: 'secret1' });
    await component.submit();

    expect(sessionStub.login).toHaveBeenCalledWith({ email: 'demo@example.com', password: 'secret1' });
    expect(routerStub.navigateByUrl).toHaveBeenCalledWith('/feed');
    expect(toastStub.show).toHaveBeenCalledWith('Signed in', expect.any(String), 'success');
  });

  it('stores pending signup state until OTP verification completes', async () => {
    routerStub.url = '/register';
    const fixture = TestBed.createComponent(AuthPage);
    const component = fixture.componentInstance;

    component.signupForm.set({
      fullName: 'New User',
      username: 'newuser',
      email: 'new@example.com',
      password: 'secret1',
      bio: 'Hello',
      profilePicUrl: '',
    });

    await component.submit();

    expect(sessionStub.signup).toHaveBeenCalled();
    expect(component.pending()?.email).toBe('new@example.com');
    expect(routerStub.navigateByUrl).not.toHaveBeenCalled();
  });

  it('verifies OTP and returns the user to login', async () => {
    routerStub.url = '/register';
    const fixture = TestBed.createComponent(AuthPage);
    const component = fixture.componentInstance;

    component.pending.set({ email: 'new@example.com', expiresAt: new Date().toISOString() } as any);
    component.otpCode.set('123456');

    await component.submitOtp();

    expect(sessionStub.verifyEmail).toHaveBeenCalledWith('new@example.com', '123456');
    expect(routerStub.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/feed', email: 'new@example.com' },
    });
  });

  it('starts forgot-password reset flow from the login page', async () => {
    const fixture = TestBed.createComponent(AuthPage);
    const component = fixture.componentInstance;

    component.enableForgotPassword();
    component.loginForm.set({ email: 'demo@example.com', password: '' });

    await component.submit();

    expect(sessionStub.forgotPassword).toHaveBeenCalledWith('demo@example.com');
    expect(component.resetMode()).toBe(true);
    expect(toastStub.show).toHaveBeenCalledWith('Reset code sent', expect.any(String), 'success');
  });
});

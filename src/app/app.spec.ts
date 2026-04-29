import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { ConnectSphereApiService } from './core/connectsphere-api.service';
import { SessionService } from './core/session.service';
import { UiShellService } from './core/ui-shell.service';
import { UserDirectoryService } from './core/user-directory.service';

describe('App', () => {
  const sessionStub = {
    user: signal(null).asReadonly(),
    isAuthenticated: signal(false).asReadonly(),
    hydrateProfile: async () => null,
    logout: async () => void 0,
  };

  const apiStub = {
    getUnreadNotificationsCount: async () => ({ count: 0 }),
    getConversations: async () => [],
  };

  const shellStub = {
    openAuth: () => void 0,
    closeAuth: () => void 0,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: SessionService, useValue: sessionStub },
        { provide: ConnectSphereApiService, useValue: apiStub },
        { provide: UiShellService, useValue: shellStub },
        { provide: UserDirectoryService, useValue: new UserDirectoryService() },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the main shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Home');
    expect(compiled.textContent).toContain('Post');
  });
});

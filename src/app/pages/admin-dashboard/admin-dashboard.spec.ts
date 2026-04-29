import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AdminDashboardPage } from './admin-dashboard';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { ToastService } from '../../core/toast.service';
import { SessionService } from '../../core/session.service';

describe('AdminDashboardPage', () => {
  const apiStub = {
    getAdminPlatformOverview: async () => ({
      users: {
        totalUsers: 10,
        activeUsers: 9,
        inactiveUsers: 1,
        verifiedUsers: 8,
        admins: 1,
      },
      trendingHashtags: [],
    }),
    getAdminUsers: async () => [],
    getAdminReports: async () => [],
    sendBulkNotifications: async () => [],
    resolveReport: async () => ({
      reportId: 'report-1',
      reporterId: 'user-1',
      targetType: 'POST',
      targetId: 'post-1',
      reason: 'Spam',
      details: null,
      status: 'DISMISSED',
      resolutionAction: 'DISMISS',
      resolutionNotes: '',
      resolvedBy: 'admin-1',
      resolvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  };

  const sessionStub = {
    user: signal({
      userId: 'admin-1',
      username: 'admin',
      email: 'admin@example.com',
      fullName: 'Admin User',
      bio: null,
      profilePicUrl: null,
      bannerUrl: null,
      privateAccount: false,
      role: 'ADMIN',
      provider: 'LOCAL',
      active: true,
      createdAt: new Date().toISOString(),
    }).asReadonly(),
  };

  const toastStub = {
    show: () => void 0,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardPage],
      providers: [
        provideRouter([]),
        { provide: ConnectSphereApiService, useValue: apiStub },
        { provide: SessionService, useValue: sessionStub },
        { provide: ToastService, useValue: toastStub },
      ],
    }).compileComponents();
  });

  it('renders moderation and user management sections', async () => {
    const fixture = TestBed.createComponent(AdminDashboardPage);
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Moderation queue');
    expect(text).toContain('User management');
  });
});

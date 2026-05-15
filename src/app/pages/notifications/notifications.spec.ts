import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { Notifications } from './notifications';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { UiShellService } from '../../core/ui-shell.service';
import { vi } from 'vitest';

describe('Notifications', () => {
  let apiStub: {
    getNotifications: ReturnType<typeof vi.fn>;
    getPendingFollowRequests: ReturnType<typeof vi.fn>;
    getPublicUserProfile: ReturnType<typeof vi.fn>;
    markAllNotificationsRead: ReturnType<typeof vi.fn>;
    markNotificationRead: ReturnType<typeof vi.fn>;
    deleteNotification: ReturnType<typeof vi.fn>;
    getComment: ReturnType<typeof vi.fn>;
    acceptFollowRequest: ReturnType<typeof vi.fn>;
    rejectFollowRequest: ReturnType<typeof vi.fn>;
  };
  let routerStub: { navigate: ReturnType<typeof vi.fn> };
  let toastStub: { show: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    apiStub = {
      getNotifications: vi.fn().mockResolvedValue([
        { notificationId: 'n1', read: false, actorId: 'user-2', createdAt: new Date().toISOString(), targetType: 'POST', targetId: 'post-1' },
        { notificationId: 'n2', read: false, actorId: 'user-3', createdAt: new Date().toISOString(), targetType: 'COMMENT', targetId: 'comment-1' },
      ]),
      getPendingFollowRequests: vi.fn().mockResolvedValue([]),
      getPublicUserProfile: vi.fn().mockResolvedValue({ fullName: 'Actor User', profilePicUrl: null }),
      markAllNotificationsRead: vi.fn().mockResolvedValue([
        { notificationId: 'n1', read: true },
        { notificationId: 'n2', read: true },
      ]),
      markNotificationRead: vi.fn().mockResolvedValue({ notificationId: 'n2', read: true, targetType: 'COMMENT', targetId: 'comment-1' }),
      deleteNotification: vi.fn().mockResolvedValue({}),
      getComment: vi.fn().mockResolvedValue({ postId: 'post-9', commentId: 'comment-1', parentCommentId: null }),
      acceptFollowRequest: vi.fn().mockResolvedValue({ followerId: 'user-2', followId: 'follow-1' }),
      rejectFollowRequest: vi.fn().mockResolvedValue({}),
    };

    routerStub = { navigate: vi.fn().mockResolvedValue(true) };
    toastStub = { show: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Notifications],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerStub },
        {
          provide: SessionService,
          useValue: {
            user: signal({ userId: 'user-1' }).asReadonly(),
          },
        },
        { provide: ConnectSphereApiService, useValue: apiStub },
        { provide: ToastService, useValue: toastStub },
        { provide: UiShellService, useValue: { openAuth: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('marks all notifications as read for the current user', async () => {
    const fixture = TestBed.createComponent(Notifications);
    const component = fixture.componentInstance;
    await fixture.whenStable();

    await component.markAll();

    expect(apiStub.markAllNotificationsRead).toHaveBeenCalledWith('user-1');
    expect(component.unreadCount()).toBe(0);
  });

  it('opens comment notifications on the parent post thread', async () => {
    const fixture = TestBed.createComponent(Notifications);
    const component = fixture.componentInstance;
    await fixture.whenStable();

    await component.open(component.items()[1] as any);

    expect(apiStub.getComment).toHaveBeenCalledWith('comment-1');
    expect(routerStub.navigate).toHaveBeenCalledWith(['/post', 'post-9'], { queryParams: { comment: 'comment-1' } });
  });
});

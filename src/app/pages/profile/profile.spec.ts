import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { Profile } from './profile';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { UserDirectoryService } from '../../core/user-directory.service';
import { vi } from 'vitest';

describe('Profile', () => {
  let apiStub: {
    getPostsByUser: ReturnType<typeof vi.fn>;
    getPostCount: ReturnType<typeof vi.fn>;
    getFollowerCount: ReturnType<typeof vi.fn>;
    getFollowingCount: ReturnType<typeof vi.fn>;
    getTrendingHashtags: ReturnType<typeof vi.fn>;
    getFollowing: ReturnType<typeof vi.fn>;
    getOutgoingPendingRequests: ReturnType<typeof vi.fn>;
    followUser: ReturnType<typeof vi.fn>;
    getPublicUserProfile: ReturnType<typeof vi.fn>;
    getFollowRelationship: ReturnType<typeof vi.fn>;
    unfollowUser: ReturnType<typeof vi.fn>;
  };
  let toastStub: { show: ReturnType<typeof vi.fn> };
  let routerStub: { navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };
  let sessionStub: any;

  beforeEach(async () => {
    apiStub = {
      getPostsByUser: vi.fn().mockResolvedValue([]),
      getPostCount: vi.fn().mockResolvedValue({ count: 0 }),
      getFollowerCount: vi.fn().mockResolvedValue({ count: 2 }),
      getFollowingCount: vi.fn().mockResolvedValue({ count: 2 }),
      getTrendingHashtags: vi.fn().mockResolvedValue([]),
      getFollowing: vi.fn().mockResolvedValue([]),
      getOutgoingPendingRequests: vi.fn().mockResolvedValue([]),
      followUser: vi.fn().mockResolvedValue({ status: 'PENDING' }),
      getPublicUserProfile: vi.fn().mockResolvedValue({
        userId: 'user-2',
        username: 'other',
        fullName: 'Other User',
        privateAccount: true,
        active: true,
        role: 'USER',
      }),
      getFollowRelationship: vi.fn().mockResolvedValue({ following: false, pending: false, followId: null }),
      unfollowUser: vi.fn().mockResolvedValue({}),
    };

    sessionStub = {
      user: signal({
        userId: 'user-1',
        username: 'anurag',
        email: 'anurag@example.com',
        fullName: 'Anurag',
        bio: '',
        profilePicUrl: '',
        bannerUrl: 'https://cdn.example.com/banner-old.jpg',
        privateAccount: false,
      }).asReadonly(),
      updateProfile: vi.fn().mockResolvedValue({
        userId: 'user-1',
        username: 'anurag',
        email: 'anurag@example.com',
        fullName: 'Anurag',
        bio: '',
        profilePicUrl: '',
        bannerUrl: '',
        privateAccount: false,
      }),
      logout: vi.fn().mockResolvedValue(undefined),
      deactivateAccount: vi.fn().mockResolvedValue(undefined),
    };

    toastStub = { show: vi.fn() };
    routerStub = {
      navigate: vi.fn().mockResolvedValue(true),
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerStub },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: { subscribe: (fn: (params: any) => void) => fn(convertToParamMap({ userId: 'me' })) },
          },
        },
        { provide: ConnectSphereApiService, useValue: apiStub },
        { provide: SessionService, useValue: sessionStub },
        { provide: ToastService, useValue: toastStub },
        { provide: UserDirectoryService, useValue: new UserDirectoryService() },
      ],
    }).compileComponents();
  });

  it('preserves the current banner URL when the profile response omits it', async () => {
    const fixture = TestBed.createComponent(Profile);
    const component = fixture.componentInstance;

    component.form.update((form) => ({ ...form, bannerUrl: 'https://cdn.example.com/banner-new.jpg' }));
    await component.save();

    expect(sessionStub.updateProfile).toHaveBeenCalled();
    expect(component.form().bannerUrl).toBe('https://cdn.example.com/banner-new.jpg');
  });

  it('sends a follow request for a private viewed profile', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerStub },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: { subscribe: (fn: (params: any) => void) => fn(convertToParamMap({ userId: 'user-2' })) },
          },
        },
        { provide: ConnectSphereApiService, useValue: apiStub },
        { provide: SessionService, useValue: sessionStub },
        { provide: ToastService, useValue: toastStub },
        { provide: UserDirectoryService, useValue: new UserDirectoryService() },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Profile);
    const component = fixture.componentInstance;
    await fixture.whenStable();

    await component.toggleFollow();

    expect(apiStub.followUser).toHaveBeenCalledWith('user-1', 'user-2', 'PENDING');
    expect(component.followRequested()).toBe(true);
  });

  it('logs out and routes back to the feed', async () => {
    const fixture = TestBed.createComponent(Profile);
    const component = fixture.componentInstance;

    await component.logout();

    expect(sessionStub.logout).toHaveBeenCalled();
    expect(routerStub.navigateByUrl).toHaveBeenCalledWith('/feed');
  });
});

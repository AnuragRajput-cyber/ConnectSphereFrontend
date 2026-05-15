import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { Feed } from './feed';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { UiShellService } from '../../core/ui-shell.service';
import { UserDirectoryService } from '../../core/user-directory.service';
import { vi } from 'vitest';

describe('Feed', () => {
  let apiStub: {
    getFollowing: ReturnType<typeof vi.fn>;
    getOutgoingPendingRequests: ReturnType<typeof vi.fn>;
    getLikesByUser: ReturnType<typeof vi.fn>;
    getActiveStories: ReturnType<typeof vi.fn>;
    getTrendingHashtags: ReturnType<typeof vi.fn>;
    getFeed: ReturnType<typeof vi.fn>;
    getPublicUserProfile: ReturnType<typeof vi.fn>;
    followUser: ReturnType<typeof vi.fn>;
    unlikePost: ReturnType<typeof vi.fn>;
    likePost: ReturnType<typeof vi.fn>;
  };
  let shellStub: { openAuth: ReturnType<typeof vi.fn> };
  let toastStub: { show: ReturnType<typeof vi.fn> };
  let routerStub: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    apiStub = {
      getFollowing: vi.fn().mockResolvedValue([]),
      getOutgoingPendingRequests: vi.fn().mockResolvedValue([]),
      getLikesByUser: vi.fn().mockResolvedValue([]),
      getActiveStories: vi.fn().mockResolvedValue([]),
      getTrendingHashtags: vi.fn().mockResolvedValue([]),
      getFeed: vi.fn().mockResolvedValue([]),
      getPublicUserProfile: vi.fn().mockResolvedValue({
        userId: 'user-2',
        username: 'target',
        fullName: 'Target User',
        privateAccount: true,
        active: true,
        role: 'USER',
      }),
      followUser: vi.fn().mockResolvedValue({ status: 'PENDING' }),
      unlikePost: vi.fn().mockResolvedValue({}),
      likePost: vi.fn().mockResolvedValue({}),
    };

    shellStub = { openAuth: vi.fn() };
    toastStub = { show: vi.fn() };
    routerStub = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [Feed],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerStub },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: { subscribe: (fn: (params: any) => void) => fn(convertToParamMap({})) },
          },
        },
        {
          provide: SessionService,
          useValue: {
            user: signal({
              userId: 'user-1',
              username: 'anurag',
              fullName: 'Anurag',
            }).asReadonly(),
          },
        },
        { provide: ConnectSphereApiService, useValue: apiStub },
        { provide: ToastService, useValue: toastStub },
        { provide: UiShellService, useValue: shellStub },
        { provide: UserDirectoryService, useValue: new UserDirectoryService() },
      ],
    }).compileComponents();
  });

  it('opens auth when an unauthenticated user tries to create a post from the feed', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Feed],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerStub },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: { subscribe: (fn: (params: any) => void) => fn(convertToParamMap({})) },
          },
        },
        {
          provide: SessionService,
          useValue: { user: signal(null).asReadonly() },
        },
        { provide: ConnectSphereApiService, useValue: apiStub },
        { provide: ToastService, useValue: toastStub },
        { provide: UiShellService, useValue: shellStub },
        { provide: UserDirectoryService, useValue: new UserDirectoryService() },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Feed);
    const component = fixture.componentInstance;

    await component.createPost({ content: 'hello', file: null });

    expect(shellStub.openAuth).toHaveBeenCalled();
  });

  it('sends a pending follow request for private suggested users', async () => {
    const fixture = TestBed.createComponent(Feed);
    const component = fixture.componentInstance;

    await component.followUser('user-2');

    expect(apiStub.followUser).toHaveBeenCalledWith('user-1', 'user-2', 'PENDING');
    expect(component.discoverPendingIds()['user-2']).toBe(true);
    expect(toastStub.show).toHaveBeenCalledWith('Request sent', expect.any(String), 'success');
  });

  it('toggles a like on a loaded post card', async () => {
    const fixture = TestBed.createComponent(Feed);
    const component = fixture.componentInstance;
    component.cards.set([
      {
        post: {
          postId: 'post-1',
          authorId: 'user-2',
          likesCount: 0,
          commentsCount: 0,
        },
        author: null,
        comments: [],
        commentsLoaded: false,
        likePulse: false,
      } as any,
    ]);

    await component.toggleLike('post-1');

    expect(apiStub.likePost).toHaveBeenCalledWith('user-1', 'post-1');
    expect(component.liked('post-1')).toBe(true);
    expect(component.cards()[0].post.likesCount).toBe(1);
  });
});

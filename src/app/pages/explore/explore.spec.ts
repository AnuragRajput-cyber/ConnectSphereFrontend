import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { Explore } from './explore';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { UiShellService } from '../../core/ui-shell.service';
import { UserDirectoryService } from '../../core/user-directory.service';
import { vi } from 'vitest';

describe('Explore', () => {
  let apiStub: {
    getTrendingHashtags: ReturnType<typeof vi.fn>;
    getPostsByHashtag: ReturnType<typeof vi.fn>;
    getPostById: ReturnType<typeof vi.fn>;
    getFollowing: ReturnType<typeof vi.fn>;
    getOutgoingPendingRequests: ReturnType<typeof vi.fn>;
    getFriendOfFriendSuggestions: ReturnType<typeof vi.fn>;
    searchUsersViaSearch: ReturnType<typeof vi.fn>;
    searchPosts: ReturnType<typeof vi.fn>;
    searchHashtags: ReturnType<typeof vi.fn>;
    getPublicUserProfile: ReturnType<typeof vi.fn>;
    followUser: ReturnType<typeof vi.fn>;
  };
  let shellStub: { openAuth: ReturnType<typeof vi.fn> };
  let routerStub: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    apiStub = {
      getTrendingHashtags: vi.fn().mockResolvedValue([{ tag: 'origin' }]),
      getPostsByHashtag: vi.fn().mockResolvedValue(['post-1']),
      getPostById: vi.fn().mockResolvedValue({
        postId: 'post-1',
        authorId: 'user-2',
        mediaUrls: [],
        likesCount: 2,
        commentsCount: 1,
        deleted: false,
      }),
      getFollowing: vi.fn().mockResolvedValue([{ followeeId: 'user-3', status: 'ACTIVE' }]),
      getOutgoingPendingRequests: vi.fn().mockResolvedValue([]),
      getFriendOfFriendSuggestions: vi.fn().mockResolvedValue([
        { userId: 'user-4', username: 'arun', fullName: 'Arun', profilePicUrl: null, role: 'USER' },
      ]),
      searchUsersViaSearch: vi.fn().mockResolvedValue([]),
      searchPosts: vi.fn().mockResolvedValue([]),
      searchHashtags: vi.fn().mockResolvedValue([]),
      getPublicUserProfile: vi.fn().mockResolvedValue({ privateAccount: false }),
      followUser: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
    };

    shellStub = { openAuth: vi.fn() };
    routerStub = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [Explore],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerStub },
        {
          provide: SessionService,
          useValue: {
            user: signal({ userId: 'user-1', fullName: 'Anurag', username: 'anurag' }).asReadonly(),
          },
        },
        { provide: ConnectSphereApiService, useValue: apiStub },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: UiShellService, useValue: shellStub },
        { provide: UserDirectoryService, useValue: new UserDirectoryService() },
      ],
    }).compileComponents();
  });

  it('loads trending content and friend-of-friend suggestions when the query is empty', async () => {
    const fixture = TestBed.createComponent(Explore);
    const component = fixture.componentInstance;
    await fixture.whenStable();

    await vi.waitFor(() => {
      expect(component.suggestedUsers().length).toBe(1);
    });

    expect(component.results().hashtags.length).toBe(1);
    expect(component.topPosts().length).toBe(1);
  });

  it('loads hashtag posts directly when a trending hashtag is opened', async () => {
    const fixture = TestBed.createComponent(Explore);
    const component = fixture.componentInstance;
    await fixture.whenStable();

    apiStub.searchHashtags.mockResolvedValue([{ hashtagId: 'starting', tag: 'starting', postCount: 1 }]);

    component.openHashtag('starting');
    await fixture.whenStable();

    await vi.waitFor(() => {
      expect(component.query()).toBe('#starting');
      expect(apiStub.getPostsByHashtag).toHaveBeenCalledWith('starting');
      expect(component.topPosts().length).toBe(1);
    });
  });

  it('opens a direct message flow for a selected user', async () => {
    const fixture = TestBed.createComponent(Explore);
    const component = fixture.componentInstance;

    await component.message({
      userId: 'user-4',
      fullName: 'Arun',
      username: 'arun',
      profilePicUrl: null,
      role: 'USER',
    });

    expect(routerStub.navigate).toHaveBeenCalledWith(['/messages'], {
      queryParams: { with: 'user-4' },
    });
  });
});

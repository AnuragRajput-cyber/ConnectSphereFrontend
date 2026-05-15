import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { CreatePostPage } from './create-post';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { vi } from 'vitest';

describe('CreatePostPage', () => {
  let apiStub: {
    uploadMedia: ReturnType<typeof vi.fn>;
    createPost: ReturnType<typeof vi.fn>;
    searchUsersViaSearch: ReturnType<typeof vi.fn>;
    createNotification: ReturnType<typeof vi.fn>;
    getFollowers: ReturnType<typeof vi.fn>;
    sendBulkNotifications: ReturnType<typeof vi.fn>;
  };
  let routerStub: { navigate: ReturnType<typeof vi.fn> };
  let toastStub: { show: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    apiStub = {
      uploadMedia: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/photo.jpg' }),
      createPost: vi.fn().mockResolvedValue({ postId: 'post-1' }),
      searchUsersViaSearch: vi.fn().mockResolvedValue([{ userId: 'user-2', username: 'friend' }]),
      createNotification: vi.fn().mockResolvedValue({}),
      getFollowers: vi.fn().mockResolvedValue([{ followerId: 'user-2' }]),
      sendBulkNotifications: vi.fn().mockResolvedValue([]),
    };

    routerStub = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    toastStub = {
      show: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CreatePostPage],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerStub },
        {
          provide: SessionService,
          useValue: {
            user: signal({
              userId: 'user-1',
              fullName: 'Anurag',
              username: 'anurag',
            }).asReadonly(),
          },
        },
        { provide: ConnectSphereApiService, useValue: apiStub },
        { provide: ToastService, useValue: toastStub },
      ],
    }).compileComponents();
  });

  it('publishes a text post and redirects to the post detail page', async () => {
    const fixture = TestBed.createComponent(CreatePostPage);
    const component = fixture.componentInstance;

    component.content.set('Hello ConnectSphere');
    await component.publish();

    expect(apiStub.createPost).toHaveBeenCalledWith(expect.objectContaining({
      authorId: 'user-1',
      content: 'Hello ConnectSphere',
      postType: 'TEXT_ONLY',
      visibility: 'PUBLIC',
    }));
    expect(routerStub.navigate).toHaveBeenCalledWith(['/post', 'post-1']);
    expect(toastStub.show).toHaveBeenCalledWith('Post published', expect.any(String), 'success');
  });

  it('uploads media and creates mention notifications when needed', async () => {
    const fixture = TestBed.createComponent(CreatePostPage);
    const component = fixture.componentInstance;

    component.content.set('hello @friend');
    component.selectedFile.set(new File(['photo'], 'photo.png', { type: 'image/png' }));

    await component.publish();

    expect(apiStub.uploadMedia).toHaveBeenCalled();
    expect(apiStub.createPost).toHaveBeenCalledWith(expect.objectContaining({
      mediaUrls: ['https://cdn.example.com/photo.jpg'],
      postType: 'TEXT_AND_MEDIA',
    }));
    expect(apiStub.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'user-2',
      actorId: 'user-1',
      type: 'MENTION',
      targetId: 'post-1',
    }));
  });
});

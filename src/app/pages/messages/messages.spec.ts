import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { Messages } from './messages';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { UiShellService } from '../../core/ui-shell.service';
import { UserDirectoryService } from '../../core/user-directory.service';
import { ChatRealtimeService } from '../../core/chat-realtime.service';
import { vi } from 'vitest';

describe('Messages', () => {
  let apiStub: {
    getConversations: ReturnType<typeof vi.fn>;
    getMessages: ReturnType<typeof vi.fn>;
    createConversation: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    clearMessages: ReturnType<typeof vi.fn>;
  };
  let routerStub: { navigate: ReturnType<typeof vi.fn> };
  let realtimeStub: any;
  let queryParamMap$: Subject<any>;
  let paramMap$: Subject<any>;

  beforeEach(async () => {
    queryParamMap$ = new Subject();
    paramMap$ = new Subject();

    apiStub = {
      getConversations: vi.fn().mockResolvedValue([
        { conversationId: 'conv-1', participantOneId: 'user-1', participantTwoId: 'user-2' },
      ]),
      getMessages: vi.fn().mockResolvedValue([
        { messageId: 'm1', conversationId: 'conv-1', senderId: 'user-2', recipientId: 'user-1', content: 'hello', createdAt: new Date().toISOString() },
      ]),
      createConversation: vi.fn().mockResolvedValue({ conversationId: 'conv-1', participantOneId: 'user-1', participantTwoId: 'user-2' }),
      sendMessage: vi.fn().mockResolvedValue({
        messageId: 'm2',
        conversationId: 'conv-1',
        senderId: 'user-1',
        recipientId: 'user-2',
        content: 'hi there',
        createdAt: new Date().toISOString(),
      }),
      clearMessages: vi.fn().mockResolvedValue({}),
    };

    routerStub = { navigate: vi.fn().mockResolvedValue(true) };
    realtimeStub = {
      messages$: new Subject(),
      typing$: new Subject(),
      connect: vi.fn(),
      sendTyping: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Messages],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerStub },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable(),
            paramMap: paramMap$.asObservable(),
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
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: UiShellService, useValue: { openAuth: vi.fn() } },
        { provide: ChatRealtimeService, useValue: realtimeStub },
        { provide: UserDirectoryService, useValue: new UserDirectoryService() },
      ],
    }).compileComponents();
  });

  it('loads a conversation thread and connects realtime updates', async () => {
    const fixture = TestBed.createComponent(Messages);
    const component = fixture.componentInstance;
    queryParamMap$.next(convertToParamMap({}));
    paramMap$.next(convertToParamMap({}));
    await fixture.whenStable();

    await component.selectConversation('conv-1');

    expect(apiStub.getMessages).toHaveBeenCalledWith('conv-1');
    expect(realtimeStub.connect).toHaveBeenCalledWith('conv-1');
    expect(component.messages().length).toBe(1);
    (component as any).stopPolling();
  });

  it('sends a new message and appends it to the active thread', async () => {
    const fixture = TestBed.createComponent(Messages);
    const component = fixture.componentInstance;
    queryParamMap$.next(convertToParamMap({}));
    paramMap$.next(convertToParamMap({}));
    await fixture.whenStable();
    component.activeConversationId.set('conv-1');
    component.conversations.set([{ conversationId: 'conv-1', participantOneId: 'user-1', participantTwoId: 'user-2' } as any]);
    component.draft.set('hi there');

    await component.send();

    expect(apiStub.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: 'conv-1',
      senderId: 'user-1',
      recipientId: 'user-2',
      content: 'hi there',
    }));
    expect(component.messages().at(-1)?.messageId).toBe('m2');
    (component as any).stopPolling();
  });

  it('refreshes the thread during polling when new messages arrive', async () => {
    const fixture = TestBed.createComponent(Messages);
    const component = fixture.componentInstance as any;
    queryParamMap$.next(convertToParamMap({}));
    paramMap$.next(convertToParamMap({}));
    await fixture.whenStable();
    component.stopPolling();
    component.activeConversationId.set('conv-1');
    component.messages.set([{ messageId: 'm1' } as any]);
    apiStub.getMessages.mockResolvedValueOnce([
      { messageId: 'm1', conversationId: 'conv-1' },
      { messageId: 'm3', conversationId: 'conv-1' },
    ]);
    component.threadRef = {
      nativeElement: {
        scrollHeight: 200,
        scrollTo: vi.fn(),
      },
    };

    await component.pollChat();

    expect(component.messages().length).toBe(2);
  });
});

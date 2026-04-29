import { inject, Injectable, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { ChatMessageResponse, TypingIndicator } from './social.models';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ChatRealtimeService {
  private readonly session = inject(SessionService);
  private client: Client | null = null;
  private messageSubscription: StompSubscription | null = null;
  private typingSubscription: StompSubscription | null = null;
  private readonly liveMessagesSubject = new Subject<ChatMessageResponse>();
  private readonly typingSubject = new Subject<TypingIndicator>();
  private readonly connectedState = signal(false);
  private activeConversationId: string | null = null;

  readonly messages$ = this.liveMessagesSubject.asObservable();
  readonly typing$ = this.typingSubject.asObservable();
  readonly connected = this.connectedState.asReadonly();

  connect(conversationId: string): void {
    this.activeConversationId = conversationId;

    if (this.client?.active) {
      if (this.client.connected) {
        this.subscribe(conversationId);
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const brokerURL = `${protocol}://${window.location.host}/ws/chat`;

    this.client = new Client({
      brokerURL,
      reconnectDelay: 3000,
      connectHeaders: this.session.accessToken()
        ? { Authorization: `Bearer ${this.session.accessToken()}` }
        : {},
      onConnect: () => {
        this.connectedState.set(true);
        if (this.activeConversationId) {
          this.subscribe(this.activeConversationId);
        }
      },
      onDisconnect: () => this.connectedState.set(false),
      onStompError: () => this.connectedState.set(false),
    });

    this.client.activate();
  }

  disconnect(): void {
    this.messageSubscription?.unsubscribe();
    this.typingSubscription?.unsubscribe();
    this.messageSubscription = null;
    this.typingSubscription = null;
    this.activeConversationId = null;
    this.client?.deactivate();
    this.client = null;
    this.connectedState.set(false);
  }

  sendMessage(payload: {
    conversationId: string;
    senderId: string;
    recipientId: string;
    content: string;
  }): void {
    if (!this.client?.connected) {
      return;
    }

    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(payload),
    });
  }

  sendTyping(payload: TypingIndicator): void {
    if (!this.client?.connected) {
      return;
    }

    this.client.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify(payload),
    });
  }

  private subscribe(conversationId: string): void {
    if (!this.client?.connected) {
      return;
    }

    this.messageSubscription?.unsubscribe();
    this.typingSubscription?.unsubscribe();

    this.messageSubscription = this.client.subscribe(
      `/topic/chat.${conversationId}`,
      (message) => this.liveMessagesSubject.next(this.parseBody<ChatMessageResponse>(message)),
    );

    this.typingSubscription = this.client.subscribe(
      `/topic/chat.typing.${conversationId}`,
      (message) => this.typingSubject.next(this.parseBody<TypingIndicator>(message)),
    );
  }

  private parseBody<T>(message: IMessage): T {
    return JSON.parse(message.body) as T;
  }
}

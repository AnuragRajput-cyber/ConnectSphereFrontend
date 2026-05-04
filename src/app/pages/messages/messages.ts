import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AvatarComponent } from '../../components/avatar/avatar';
import { ChatListItemComponent } from '../../components/chat-list-item/chat-list-item';
import { EmptyStateComponent } from '../../components/empty-state/empty-state';
import { UiIconComponent } from '../../components/ui-icon/ui-icon';
import { ChatRealtimeService } from '../../core/chat-realtime.service';
import { ConnectSphereApiService } from '../../core/connectsphere-api.service';
import { ChatMessageResponse, ConversationResponse } from '../../core/social.models';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../core/toast.service';
import { UiShellService } from '../../core/ui-shell.service';
import { UserDirectoryService } from '../../core/user-directory.service';
import { buildAvatarDataUri } from '../../core/visuals';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, UiIconComponent, ChatListItemComponent, AvatarComponent, EmptyStateComponent],
  templateUrl: './messages.html',
  styleUrl: './messages.scss',
})
export class Messages {
  private readonly api = inject(ConnectSphereApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly shell = inject(UiShellService);
  private readonly realtime = inject(ChatRealtimeService);
  readonly directory = inject(UserDirectoryService);
  private readonly destroyRef = inject(DestroyRef);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private polling = false;

  readonly currentUser = this.session.user;
  readonly loading = signal(true);
  readonly conversations = signal<ConversationResponse[]>([]);
  readonly searchQuery = signal('');
  readonly activeConversationId = signal<string | null>(null);
  readonly messages = signal<ChatMessageResponse[]>([]);
  readonly draft = signal('');
  readonly typingText = signal('');
  readonly menuOpen = signal(false);
  readonly targetUserId = signal<string | null>(null);
  readonly routeConversationId = signal<string | null>(null);
  readonly filteredConversations = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.conversations();
    }

    return this.conversations().filter((conversation) => {
      const participantId = this.participantId(conversation);
      const name = this.displayName(participantId).toLowerCase();
      const handle = this.directory.handle(participantId).toLowerCase();
      return name.includes(query) || handle.includes(query);
    });
  });

  constructor() {
    this.realtime.messages$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        if (message.conversationId === this.activeConversationId()) {
          this.messages.update((items) =>
            items.some((item) => item.messageId === message.messageId) ? items : [...items, message],
          );
        }
      });

    this.realtime.typing$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        const currentUserId = this.currentUser()?.userId;
        this.typingText.set(
          event.userId !== currentUserId && event.conversationId === this.activeConversationId()
            ? `${this.displayName(event.userId)} is typing...`
            : '',
        );
      });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.targetUserId.set(params.get('with'));
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.routeConversationId.set(params.get('conversationId'));
    });

    effect(() => {
      this.currentUser();
      this.targetUserId();
      this.routeConversationId();
      void this.load();
    });

    this.startPolling();
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  activeConversation(): ConversationResponse | null {
    return this.conversations().find((item) => item.conversationId === this.activeConversationId()) ?? null;
  }

  participantId(conversation: ConversationResponse): string {
    const currentUserId = this.currentUser()?.userId;
    return conversation.participantOneId === currentUserId
      ? conversation.participantTwoId
      : conversation.participantOneId;
  }

  displayName(userId: string): string {
    return this.directory.displayName(userId);
  }

  avatar(userId: string): string {
    return this.directory.avatarUrl(userId) || buildAvatarDataUri(this.displayName(userId), userId);
  }

  async selectConversation(conversationId: string): Promise<void> {
    this.activeConversationId.set(conversationId);
    this.typingText.set('');
    this.menuOpen.set(false);
    try {
      const messages = await this.api.getMessages(conversationId);
      this.messages.set(messages);
      this.realtime.connect(conversationId);
      await this.router.navigate(['/messages', conversationId], {
        queryParams: { with: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    } catch {
      this.toast.show('Messages unavailable', 'Could not load the conversation history.', 'warning');
    }
  }

  async backToList(): Promise<void> {
    this.activeConversationId.set(null);
    this.messages.set([]);
    this.typingText.set('');
    this.menuOpen.set(false);
    await this.router.navigate(['/messages'], {
      queryParams: { with: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onTyping(): void {
    const currentUser = this.currentUser();
    const conversationId = this.activeConversationId();
    if (!currentUser || !conversationId) {
      return;
    }

    this.realtime.sendTyping({
      conversationId,
      userId: currentUser.userId,
      typing: true,
    });
  }

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  async clearChat(): Promise<void> {
    const conversation = this.activeConversation();
    if (!conversation) {
      return;
    }

    const confirmed = window.confirm('Clear all messages in this conversation?');
    if (!confirmed) {
      return;
    }

    try {
      await this.api.clearMessages(conversation.conversationId);
      this.messages.set([]);
      this.menuOpen.set(false);
      this.toast.show('Chat cleared', 'The conversation history was cleared.', 'success');
    } catch {
      this.toast.show('Clear failed', 'Could not clear this conversation.', 'warning');
    }
  }

  async send(): Promise<void> {
    const currentUser = this.currentUser();
    const conversation = this.activeConversation();
    const content = this.draft().trim();

    if (!currentUser) {
      this.shell.openAuth();
      return;
    }

    if (!conversation || !content) {
      return;
    }

    const payload = {
      conversationId: conversation.conversationId,
      senderId: currentUser.userId,
      recipientId: this.participantId(conversation),
      content,
    };

    this.draft.set('');
    try {
      const saved = await this.api.sendMessage(payload);
      this.messages.update((items) =>
        items.some((item) => item.messageId === saved.messageId) ? items : [...items, saved],
      );
    } catch {
      this.draft.set(content);
      this.toast.show('Message failed', 'Could not send this message.', 'warning');
    }
  }

  private async load(): Promise<void> {
    const currentUser = this.currentUser();
    this.conversations.set([]);
    this.searchQuery.set('');
    this.messages.set([]);
    this.activeConversationId.set(null);
    this.menuOpen.set(false);
    if (!currentUser) {
      this.loading.set(false);
      return;
    }

    this.directory.storeCurrentUser(currentUser);

    try {
      const conversations = (await this.api.getConversations(currentUser.userId))
        .filter((conversation) => conversation.participantOneId !== conversation.participantTwoId);
      this.conversations.set(conversations);
      const targetUserId = this.targetUserId();
      if (targetUserId) {
        await this.createOrOpenConversation(targetUserId);
        return;
      }

      const routeConversationId = this.routeConversationId();
      if (routeConversationId && conversations.some((item) => item.conversationId === routeConversationId)) {
        await this.selectConversation(routeConversationId);
        return;
      }

      const first = this.conversations()[0]?.conversationId ?? null;
      if (first && (this.routeConversationId() || window.innerWidth > 960)) {
        await this.selectConversation(first);
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async createOrOpenConversation(targetUserId: string): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser) {
      return;
    }
    if (currentUser.userId === targetUserId) {
      this.toast.show('Action blocked', 'You cannot start a chat with your own account.', 'neutral');
      await this.router.navigate(['/messages'], {
        queryParams: { with: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return;
    }

    try {
      const conversation = await this.api.createConversation(currentUser.userId, targetUserId);
      this.conversations.update((items) =>
        items.some((item) => item.conversationId === conversation.conversationId)
          ? items
          : [conversation, ...items],
      );
      await this.selectConversation(conversation.conversationId);
    } catch {
      this.toast.show('Conversation failed', 'Could not open a direct conversation.', 'warning');
    }
  }

  private startPolling(): void {
    if (this.pollTimer) {
      return;
    }

    this.pollTimer = setInterval(() => {
      void this.pollChat();
    }, 1000);
  }

  private stopPolling(): void {
    if (!this.pollTimer) {
      return;
    }

    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private async pollChat(): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser || this.polling) {
      return;
    }

    this.polling = true;
    try {
      const conversations = (await this.api.getConversations(currentUser.userId))
        .filter((conversation) => conversation.participantOneId !== conversation.participantTwoId);
      this.conversations.set(conversations);

      const activeConversationId = this.activeConversationId();
      if (!activeConversationId) {
        return;
      }

      const messages = await this.api.getMessages(activeConversationId);
      this.messages.set(messages);
    } catch {
      // Polling is best-effort. Existing send/load flows still show user-facing errors.
    } finally {
      this.polling = false;
    }
  }
}

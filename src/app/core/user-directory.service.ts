import { computed, Injectable, signal } from '@angular/core';
import { EnrichedUser, PublicUserProfile, UserProfile, UserSummary } from './social.models';

@Injectable({ providedIn: 'root' })
export class UserDirectoryService {
  private readonly directory = signal<Record<string, EnrichedUser>>({});

  readonly users = computed(() => this.directory());

  storeCurrentUser(user: UserProfile | null): void {
    if (!user) {
      return;
    }

    this.directory.update((current) => ({
      ...current,
      [user.userId]: {
        userId: user.userId,
        username: user.username,
        fullName: user.fullName,
        profilePicUrl: user.profilePicUrl,
        role: user.role,
        bio: user.bio,
        email: user.email,
      },
    }));
  }

  storePublicProfile(user: PublicUserProfile | null): void {
    if (!user) {
      return;
    }

    this.directory.update((current) => ({
      ...current,
      [user.userId]: {
        ...current[user.userId],
        userId: user.userId,
        username: user.username,
        fullName: user.fullName,
        profilePicUrl: user.profilePicUrl,
        role: user.role,
        bio: user.bio,
      },
    }));
  }

  storeSummaries(users: UserSummary[]): void {
    this.directory.update((current) => {
      const next = { ...current };
      for (const user of users) {
        next[user.userId] = {
          ...next[user.userId],
          userId: user.userId,
          username: user.username,
          fullName: user.fullName,
          profilePicUrl: user.profilePicUrl,
          role: user.role,
        };
      }
      return next;
    });
  }

  get(userId: string | null | undefined): EnrichedUser | null {
    if (!userId) {
      return null;
    }
    return this.directory()[userId] ?? null;
  }

  displayName(userId: string): string {
    const user = this.get(userId);
    return user?.fullName || `User ${userId.slice(0, 8)}`;
  }

  handle(userId: string): string {
    const user = this.get(userId);
    return user?.username ? `@${user.username}` : `@${userId.slice(0, 8)}`;
  }

  avatarUrl(userId: string): string | null {
    return this.get(userId)?.profilePicUrl ?? null;
  }
}

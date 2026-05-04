import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiMessage,
  AdminPlatformOverviewResponse,
  AdminStatsResponse,
  AdminSystemOverviewResponse,
  AdminUserResponse,
  AuthResponse,
  ChatMessageResponse,
  CommentResponse,
  ConversationResponse,
  FollowResponse,
  FollowRelationshipResponse,
  HashtagResponse,
  LikeResponse,
  MediaResponse,
  NotificationResponse,
  PublicUserProfile,
  PostResponse,
  ReportResolutionAction,
  ReportResponse,
  RegisterPendingResponse,
  StoryResponse,
  UpdateProfileRequest,
  UserProfile,
  UserSummary,
} from './social.models';

@Injectable({ providedIn: 'root' })
export class ConnectSphereApiService {
  private readonly http = inject(HttpClient);

  register(payload: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    bio: string;
    profilePicUrl: string;
  }): Promise<RegisterPendingResponse> {
    return firstValueFrom(
      this.http.post<RegisterPendingResponse>('/api/v1/auth/register', {
        ...payload,
        role: 'USER',
        provider: 'LOCAL',
      }),
    );
  }

  verifyEmail(email: string, code: string): Promise<ApiMessage> {
    return firstValueFrom(this.http.post<ApiMessage>('/api/v1/auth/verify-email', { email, code }));
  }

  resendOtp(email: string): Promise<RegisterPendingResponse> {
    return firstValueFrom(this.http.post<RegisterPendingResponse>('/api/v1/auth/resend-otp', { email }));
  }

  forgotPassword(email: string): Promise<ApiMessage> {
    return firstValueFrom(this.http.post<ApiMessage>('/api/v1/auth/forgot-password', { email }));
  }

  resetPassword(email: string, code: string, newPassword: string): Promise<ApiMessage> {
    return firstValueFrom(
      this.http.post<ApiMessage>('/api/v1/auth/reset-password', { email, code, newPassword }),
    );
  }

  login(payload: { email: string; password: string }): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>('/api/v1/auth/login', payload));
  }

  logout(accessToken: string, refreshToken: string | null): Promise<ApiMessage> {
    return firstValueFrom(
      this.http.post<ApiMessage>('/api/v1/auth/logout', {
        accessToken,
        refreshToken,
      }),
    );
  }

  refresh(refreshToken: string): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>('/api/v1/auth/refresh', { refreshToken }));
  }

  getProfile(): Promise<UserProfile> {
    return firstValueFrom(this.http.get<UserProfile>('/api/v1/auth/profile'));
  }

  updateProfile(payload: UpdateProfileRequest): Promise<UserProfile> {
    return firstValueFrom(this.http.put<UserProfile>('/api/v1/auth/profile', payload));
  }

  deactivateAccount(): Promise<ApiMessage> {
    return firstValueFrom(this.http.patch<ApiMessage>('/api/v1/auth/deactivate', {}));
  }

  getPublicUserProfile(userId: string): Promise<PublicUserProfile> {
    return firstValueFrom(this.http.get<PublicUserProfile>(`/api/v1/auth/users/${userId}`));
  }

  searchUsers(query: string): Promise<UserSummary[]> {
    const params = new HttpParams().set('query', query);
    return firstValueFrom(this.http.get<UserSummary[]>('/api/v1/auth/search', { params }));
  }

  getAdminStats(): Promise<AdminStatsResponse> {
    return firstValueFrom(this.http.get<AdminStatsResponse>('/api/v1/admin/analytics'));
  }

  getAdminUsers(): Promise<AdminUserResponse[]> {
    return firstValueFrom(this.http.get<AdminUserResponse[]>('/api/v1/admin/users'));
  }

  getAdminPlatformOverview(): Promise<AdminPlatformOverviewResponse> {
    return firstValueFrom(this.http.get<AdminPlatformOverviewResponse>('/api/v1/admin/platform-overview'));
  }

  getAdminSystemOverview(): Promise<AdminSystemOverviewResponse> {
    return firstValueFrom(this.http.get<AdminSystemOverviewResponse>('/api/v1/admin/system-overview'));
  }

  suspendUser(userId: string): Promise<ApiMessage> {
    return firstValueFrom(this.http.patch<ApiMessage>(`/api/v1/admin/users/${userId}/suspend`, {}));
  }

  reactivateUser(userId: string): Promise<ApiMessage> {
    return firstValueFrom(this.http.patch<ApiMessage>(`/api/v1/admin/users/${userId}/reactivate`, {}));
  }

  deleteUserAsAdmin(userId: string): Promise<ApiMessage> {
    return firstValueFrom(this.http.delete<ApiMessage>(`/api/v1/admin/users/${userId}`));
  }

  createReport(payload: {
    targetType: 'POST' | 'COMMENT' | 'USER';
    targetId: string;
    reason: string;
    details?: string;
  }): Promise<ReportResponse> {
    return firstValueFrom(this.http.post<ReportResponse>('/api/v1/reports', payload));
  }

  getMyReports(): Promise<ReportResponse[]> {
    return firstValueFrom(this.http.get<ReportResponse[]>('/api/v1/reports/mine'));
  }

  getAdminReports(status?: 'OPEN' | 'RESOLVED' | 'DISMISSED'): Promise<ReportResponse[]> {
    const options = status ? { params: new HttpParams().set('status', status) } : {};
    return firstValueFrom(this.http.get<ReportResponse[]>('/api/v1/reports', options));
  }

  resolveReport(
    reportId: string,
    action: ReportResolutionAction,
    resolutionNotes = '',
  ): Promise<ReportResponse> {
    return firstValueFrom(
      this.http.patch<ReportResponse>(`/api/v1/reports/${reportId}/resolve`, { action, resolutionNotes }),
    );
  }

  getPostById(postId: string): Promise<PostResponse> {
    return firstValueFrom(this.http.get<PostResponse>(`/api/v1/posts/${postId}`));
  }

  getPostsByUser(authorId: string): Promise<PostResponse[]> {
    return firstValueFrom(this.http.get<PostResponse[]>(`/api/v1/posts/user/${authorId}`));
  }

  getFeed(userIds?: string[]): Promise<PostResponse[]> {
    let params = new HttpParams();
    for (const id of userIds ?? []) {
      params = params.append('userIds', id);
    }
    const options = (userIds ?? []).length ? { params } : {};
    return firstValueFrom(this.http.get<PostResponse[]>('/api/v1/posts/feed', options));
  }

  createPost(payload: {
    authorId: string;
    content: string;
    mediaUrls: string[];
    postType: 'TEXT_ONLY' | 'MEDIA_ONLY' | 'TEXT_AND_MEDIA';
    visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';
  }): Promise<PostResponse> {
    return firstValueFrom(this.http.post<PostResponse>('/api/v1/posts', payload));
  }

  deletePost(postId: string): Promise<ApiMessage> {
    return firstValueFrom(this.http.delete<ApiMessage>(`/api/v1/posts/${postId}`));
  }

  incrementPostLikes(postId: string): Promise<PostResponse> {
    return firstValueFrom(this.http.post<PostResponse>(`/api/v1/posts/${postId}/likes/increment`, {}));
  }

  decrementPostLikes(postId: string): Promise<PostResponse> {
    return firstValueFrom(this.http.post<PostResponse>(`/api/v1/posts/${postId}/likes/decrement`, {}));
  }

  incrementPostComments(postId: string): Promise<PostResponse> {
    return firstValueFrom(this.http.post<PostResponse>(`/api/v1/posts/${postId}/comments/increment`, {}));
  }

  getComments(postId: string): Promise<CommentResponse[]> {
    return firstValueFrom(this.http.get<CommentResponse[]>(`/api/v1/comments/post/${postId}`));
  }

  getComment(commentId: string): Promise<CommentResponse> {
    return firstValueFrom(this.http.get<CommentResponse>(`/api/v1/comments/${commentId}`));
  }

  updateComment(commentId: string, content: string): Promise<CommentResponse> {
    return firstValueFrom(
      this.http.put<CommentResponse>(`/api/v1/comments/${commentId}`, { content }),
    );
  }

  deleteComment(commentId: string): Promise<ApiMessage> {
    return firstValueFrom(this.http.delete<ApiMessage>(`/api/v1/comments/${commentId}`));
  }

  getReplies(commentId: string): Promise<CommentResponse[]> {
    return firstValueFrom(this.http.get<CommentResponse[]>(`/api/v1/comments/${commentId}/replies`));
  }

  addComment(payload: {
    postId: string;
    authorId: string;
    content: string;
    parentCommentId?: string | null;
  }): Promise<CommentResponse> {
    return firstValueFrom(this.http.post<CommentResponse>('/api/v1/comments', payload));
  }

  getLikesByUser(userId: string): Promise<LikeResponse[]> {
    return firstValueFrom(this.http.get<LikeResponse[]>(`/api/v1/likes/user/${userId}`));
  }

  getLikesByTarget(
    targetId: string,
    targetType: 'POST' | 'COMMENT' | 'STORY',
  ): Promise<LikeResponse[]> {
    const params = new HttpParams().set('targetType', targetType);
    return firstValueFrom(this.http.get<LikeResponse[]>(`/api/v1/likes/target/${targetId}`, { params }));
  }

  likePost(userId: string, postId: string): Promise<LikeResponse> {
    return firstValueFrom(
      this.http.post<LikeResponse>('/api/v1/likes', {
        userId,
        targetId: postId,
        targetType: 'POST',
        reactionType: 'LIKE',
      }),
    );
  }

  reactToPost(userId: string, postId: string, reactionType: LikeResponse['reactionType']): Promise<LikeResponse> {
    return firstValueFrom(
      this.http.post<LikeResponse>('/api/v1/likes', {
        userId,
        targetId: postId,
        targetType: 'POST',
        reactionType,
      }),
    );
  }

  unlikePost(userId: string, postId: string): Promise<ApiMessage> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('targetId', postId)
      .set('targetType', 'POST');
    return firstValueFrom(this.http.delete<ApiMessage>('/api/v1/likes', { params }));
  }

  likeStory(userId: string, storyId: string): Promise<LikeResponse> {
    return firstValueFrom(
      this.http.post<LikeResponse>('/api/v1/likes', {
        userId,
        targetId: storyId,
        targetType: 'STORY',
        reactionType: 'LIKE',
      }),
    );
  }

  likeComment(userId: string, commentId: string): Promise<LikeResponse> {
    return firstValueFrom(
      this.http.post<LikeResponse>('/api/v1/likes', {
        userId,
        targetId: commentId,
        targetType: 'COMMENT',
        reactionType: 'LIKE',
      }),
    );
  }

  unlikeStory(userId: string, storyId: string): Promise<ApiMessage> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('targetId', storyId)
      .set('targetType', 'STORY');
    return firstValueFrom(this.http.delete<ApiMessage>('/api/v1/likes', { params }));
  }

  unlikeComment(userId: string, commentId: string): Promise<ApiMessage> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('targetId', commentId)
      .set('targetType', 'COMMENT');
    return firstValueFrom(this.http.delete<ApiMessage>('/api/v1/likes', { params }));
  }

  changeReaction(
    userId: string,
    targetId: string,
    targetType: 'POST' | 'COMMENT' | 'STORY',
    reactionType: LikeResponse['reactionType'],
  ): Promise<LikeResponse> {
    const params = new HttpParams().set('targetType', targetType);
    return firstValueFrom(
      this.http.put<LikeResponse>(`/api/v1/likes/${userId}/${targetId}`, { reactionType }, { params }),
    );
  }

  getFollowing(userId: string): Promise<FollowResponse[]> {
    return firstValueFrom(this.http.get<FollowResponse[]>(`/api/v1/follows/following/${userId}`));
  }

  getFollowers(userId: string): Promise<FollowResponse[]> {
    return firstValueFrom(this.http.get<FollowResponse[]>(`/api/v1/follows/followers/${userId}`));
  }

  getFollowerCount(userId: string): Promise<{ count: number }> {
    return firstValueFrom(this.http.get<{ count: number }>(`/api/v1/follows/followers/${userId}/count`));
  }

  getFollowingCount(userId: string): Promise<{ count: number }> {
    return firstValueFrom(this.http.get<{ count: number }>(`/api/v1/follows/following/${userId}/count`));
  }

  isFollowing(
    followerId: string,
    followeeId: string,
  ): Promise<{ following: boolean }> {
    const params = new HttpParams().set('followerId', followerId).set('followeeId', followeeId);
    return firstValueFrom(this.http.get<{ following: boolean }>('/api/v1/follows/is-following', { params }));
  }

  getMutualFollows(userId: string): Promise<string[]> {
    return firstValueFrom(this.http.get<string[]>(`/api/v1/follows/mutual/${userId}`));
  }

  getSuggestedUsers(userId: string): Promise<string[]> {
    return firstValueFrom(this.http.get<string[]>(`/api/v1/follows/suggested/${userId}`));
  }

  followUser(
    followerId: string,
    followeeId: string,
    status: 'ACTIVE' | 'PENDING' = 'ACTIVE',
  ): Promise<FollowResponse> {
    return firstValueFrom(
      this.http.post<FollowResponse>('/api/v1/follows', {
        followerId,
        followeeId,
        status,
      }),
    );
  }

  getFollowRelationship(followerId: string, followeeId: string): Promise<FollowRelationshipResponse> {
    const params = new HttpParams().set('followerId', followerId).set('followeeId', followeeId);
    return firstValueFrom(this.http.get<FollowRelationshipResponse>('/api/v1/follows/relationship', { params }));
  }

  getPendingFollowRequests(followeeId: string): Promise<FollowResponse[]> {
    return firstValueFrom(this.http.get<FollowResponse[]>(`/api/v1/follows/requests/${followeeId}`));
  }

  getOutgoingPendingRequests(followerId: string): Promise<FollowResponse[]> {
    return firstValueFrom(this.http.get<FollowResponse[]>(`/api/v1/follows/requests/sent/${followerId}`));
  }

  acceptFollowRequest(followId: string): Promise<FollowResponse> {
    return firstValueFrom(this.http.patch<FollowResponse>(`/api/v1/follows/${followId}/accept`, {}));
  }

  rejectFollowRequest(followId: string): Promise<ApiMessage> {
    return firstValueFrom(this.http.delete<ApiMessage>(`/api/v1/follows/${followId}/reject`));
  }

  unfollowUser(followerId: string, followeeId: string): Promise<ApiMessage> {
    const params = new HttpParams().set('followerId', followerId).set('followeeId', followeeId);
    return firstValueFrom(this.http.delete<ApiMessage>('/api/v1/follows', { params }));
  }

  getNotifications(recipientId: string): Promise<NotificationResponse[]> {
    return firstValueFrom(
      this.http.get<NotificationResponse[]>(`/api/v1/notifications/recipient/${recipientId}`),
    );
  }

  getUnreadNotificationsCount(recipientId: string): Promise<{ count: number }> {
    return firstValueFrom(
      this.http.get<{ count: number }>(
        `/api/v1/notifications/recipient/${recipientId}/unread-count`,
      ),
    );
  }

  markNotificationRead(notificationId: string): Promise<NotificationResponse> {
    return firstValueFrom(
      this.http.patch<NotificationResponse>(`/api/v1/notifications/${notificationId}/read`, {}),
    );
  }

  markAllNotificationsRead(recipientId: string): Promise<NotificationResponse[]> {
    const params = new HttpParams().set('recipientId', recipientId);
    return firstValueFrom(
      this.http.patch<NotificationResponse[]>('/api/v1/notifications/read-all', {}, { params }),
    );
  }

  createNotification(payload: {
    recipientId: string;
    actorId: string | null;
    type: string;
    message: string;
    targetId?: string | null;
    targetType?: string | null;
  }): Promise<NotificationResponse> {
    return firstValueFrom(this.http.post<NotificationResponse>('/api/v1/notifications', payload));
  }

  sendBulkNotifications(payload: {
    recipientIds: string[];
    actorId: string | null;
    type: string;
    message: string;
    targetId?: string | null;
    targetType?: string | null;
  }): Promise<NotificationResponse[]> {
    return firstValueFrom(this.http.post<NotificationResponse[]>('/api/v1/notifications/bulk', payload));
  }

  deleteNotification(notificationId: string): Promise<ApiMessage> {
    return firstValueFrom(this.http.delete<ApiMessage>(`/api/v1/notifications/${notificationId}`));
  }

  getActiveStories(authorIds?: string[]): Promise<StoryResponse[]> {
    let params = new HttpParams();
    for (const id of authorIds ?? []) {
      params = params.append('authorIds', id);
    }
    return firstValueFrom(this.http.get<StoryResponse[]>('/api/v1/stories/active', { params }));
  }

  viewStory(storyId: string): Promise<StoryResponse> {
    return firstValueFrom(this.http.post<StoryResponse>(`/api/v1/stories/${storyId}/view`, {}));
  }

  createStory(authorId: string, file: File, caption: string): Promise<StoryResponse> {
    const formData = new FormData();
    formData.append('authorId', authorId);
    formData.append('caption', caption);
    formData.append('file', file);
    return firstValueFrom(this.http.post<StoryResponse>('/api/v1/stories', formData));
  }

  uploadMedia(uploaderId: string, file: File, linkedPostId?: string): Promise<MediaResponse> {
    const formData = new FormData();
    formData.append('uploaderId', uploaderId);
    if (linkedPostId) {
      formData.append('linkedPostId', linkedPostId);
    }
    formData.append('file', file);
    return firstValueFrom(this.http.post<MediaResponse>('/api/v1/media/upload', formData));
  }

  searchPosts(query: string): Promise<PostResponse[]> {
    const params = new HttpParams().set('query', query);
    return firstValueFrom(this.http.get<PostResponse[]>('/api/v1/search/posts', { params }));
  }

  searchUsersViaSearch(query: string): Promise<UserSummary[]> {
    const params = new HttpParams().set('query', query);
    return firstValueFrom(this.http.get<UserSummary[]>('/api/v1/search/users', { params }));
  }

  getTrendingHashtags(): Promise<HashtagResponse[]> {
    return firstValueFrom(this.http.get<HashtagResponse[]>('/api/v1/hashtags/trending'));
  }

  searchHashtags(query: string): Promise<HashtagResponse[]> {
    const params = new HttpParams().set('query', query);
    return firstValueFrom(this.http.get<HashtagResponse[]>('/api/v1/hashtags/search', { params }));
  }

  getPostsByHashtag(tag: string): Promise<string[]> {
    return firstValueFrom(this.http.get<string[]>(`/api/v1/hashtags/${tag}/posts`));
  }

  indexPost(postId: string, content: string): Promise<{ hashtags: string[] }> {
    return firstValueFrom(this.http.post<{ hashtags: string[] }>('/api/v1/search/index', { postId, content }));
  }

  getConversations(userId: string): Promise<ConversationResponse[]> {
    const params = new HttpParams().set('userId', userId);
    return firstValueFrom(this.http.get<ConversationResponse[]>('/api/v1/chat/conversations', { params }));
  }

  createConversation(participantOneId: string, participantTwoId: string): Promise<ConversationResponse> {
    return firstValueFrom(
      this.http.post<ConversationResponse>('/api/v1/chat/conversations', {
        participantOneId,
        participantTwoId,
      }),
    );
  }

  getMessages(conversationId: string): Promise<ChatMessageResponse[]> {
    return firstValueFrom(
      this.http.get<ChatMessageResponse[]>(`/api/v1/chat/messages/${conversationId}`),
    );
  }

  sendMessage(payload: {
    conversationId?: string | null;
    senderId: string;
    recipientId: string;
    content: string;
  }): Promise<ChatMessageResponse> {
    return firstValueFrom(this.http.post<ChatMessageResponse>('/api/v1/chat/messages', payload));
  }

  clearMessages(conversationId: string): Promise<ApiMessage> {
    return firstValueFrom(this.http.delete<ApiMessage>(`/api/v1/chat/messages/${conversationId}`));
  }

  getPostCount(authorId: string): Promise<{ authorId: string; count: number }> {
    return firstValueFrom(this.http.get<{ authorId: string; count: number }>(`/api/v1/posts/count/${authorId}`));
  }
}

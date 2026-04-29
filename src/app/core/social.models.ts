export type AuthMode = 'login' | 'signup';
export type IconName =
  | 'home'
  | 'explore'
  | 'messages'
  | 'notifications'
  | 'profile'
  | 'camera'
  | 'back'
  | 'grid'
  | 'reels'
  | 'dots'
  | 'plus-square'
  | 'search'
  | 'menu'
  | 'close'
  | 'heart'
  | 'comment'
  | 'share'
  | 'bookmark'
  | 'image'
  | 'google'
  | 'github'
  | 'plus'
  | 'logout'
  | 'chevron-right'
  | 'send'
  | 'bell'
  | 'spark'
  | 'message-circle'
  | 'spinner';

export interface NavItem {
  route: string;
  label: string;
  icon: IconName;
}

export interface ApiMessage {
  message: string;
}

export interface LoginFormValue {
  email: string;
  password: string;
}

export interface SignupFormValue {
  fullName: string;
  username: string;
  email: string;
  password: string;
  bio: string;
  profilePicUrl: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  bio: string | null;
  profilePicUrl: string | null;
  bannerUrl: string | null;
  privateAccount: boolean;
  role: string;
  provider: string;
  active: boolean;
  createdAt: string;
}

export interface UserSummary {
  userId: string;
  username: string;
  fullName: string;
  profilePicUrl: string | null;
  role: string;
}

export interface PublicUserProfile {
  userId: string;
  username: string;
  fullName: string;
  bio: string | null;
  profilePicUrl: string | null;
  bannerUrl: string | null;
  privateAccount: boolean;
  role: string;
  active: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  user: UserProfile;
}

export interface RegisterPendingResponse {
  userId: string;
  email: string;
  otpExpiresAt: string;
  debugOtpCode?: string | null;
}

export interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  user: UserProfile | null;
}

export interface UpdateProfileRequest {
  username: string;
  email: string;
  fullName: string;
  bio: string;
  profilePicUrl: string;
  bannerUrl: string;
  privateAccount: boolean;
}

export interface PostResponse {
  postId: string;
  authorId: string;
  content: string;
  mediaUrls: string[];
  postType: 'TEXT_ONLY' | 'MEDIA_ONLY' | 'TEXT_AND_MEDIA';
  visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface CommentResponse {
  commentId: string;
  postId: string;
  authorId: string;
  parentCommentId: string | null;
  content: string;
  likesCount: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LikeResponse {
  likeId: string;
  userId: string;
  targetId: string;
  targetType: 'POST' | 'COMMENT' | 'STORY';
  reactionType: 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';
  createdAt: string;
}

export interface FollowResponse {
  followId: string;
  followerId: string;
  followeeId: string;
  status: 'ACTIVE' | 'PENDING';
  createdAt: string;
}

export interface FollowRelationshipResponse {
  exists: boolean;
  following: boolean;
  pending: boolean;
  followId: string | null;
  status: 'ACTIVE' | 'PENDING' | null;
}

export interface NotificationResponse {
  notificationId: string;
  recipientId: string;
  actorId: string | null;
  type: string;
  message: string;
  targetId: string | null;
  targetType: string | null;
  read: boolean;
  createdAt: string;
}

export interface StoryResponse {
  storyId: string;
  authorId: string;
  mediaUrl: string;
  caption: string | null;
  mediaType: string;
  viewsCount: number;
  expiresAt: string;
  createdAt: string;
  active: boolean;
}

export interface MediaResponse {
  mediaId: string;
  uploaderId: string;
  url: string;
  mediaType: string;
  sizeKb: number;
  mimeType: string;
  linkedPostId: string | null;
  deleted: boolean;
  uploadedAt: string;
}

export interface HashtagResponse {
  hashtagId: string;
  tag: string;
  postCount: number;
  lastUsedAt: string;
}

export interface ConversationResponse {
  conversationId: string;
  participantOneId: string;
  participantTwoId: string;
  createdAt: string;
}

export interface ChatMessageResponse {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  sentAt: string;
  read: boolean;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  typing: boolean;
}

export interface EnrichedUser {
  userId: string;
  username: string;
  fullName: string;
  profilePicUrl: string | null;
  role: string;
  bio?: string | null;
  email?: string | null;
}

export interface FeedCardView {
  post: PostResponse;
  author: EnrichedUser | null;
  comments: CommentResponse[];
  commentsLoaded: boolean;
  likePulse: boolean;
}

export interface ExploreResults {
  users: UserSummary[];
  posts: PostResponse[];
  hashtags: HashtagResponse[];
}

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  tone: 'neutral' | 'success' | 'warning';
}

export interface AdminStatsResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedUsers: number;
  admins: number;
}

export interface AdminUserResponse {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  bio: string | null;
  profilePicUrl: string | null;
  bannerUrl: string | null;
  privateAccount: boolean;
  role: string;
  provider: string;
  active: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceHealthResponse {
  service: string;
  status: string;
  baseUrl: string;
}

export interface AdminPlatformOverviewResponse {
  users: AdminStatsResponse;
  trendingHashtags: HashtagResponse[];
}

export interface AdminSystemOverviewResponse {
  services: ServiceHealthResponse[];
}

export type ReportTargetType = 'POST' | 'COMMENT' | 'USER';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';
export type ReportResolutionAction = 'DISMISS' | 'REMOVE_POST' | 'REMOVE_COMMENT' | 'SUSPEND_USER' | 'DELETE_USER';

export interface ReportResponse {
  reportId: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolutionAction: ReportResolutionAction | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

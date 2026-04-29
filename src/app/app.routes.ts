import { Routes } from '@angular/router';
import { AuthPage } from './pages/auth/auth';
import { AdminDashboardPage } from './pages/admin-dashboard/admin-dashboard';
import { CreatePostPage } from './pages/create-post/create-post';
import { Explore } from './pages/explore/explore';
import { Feed } from './pages/feed/feed';
import { Messages } from './pages/messages/messages';
import { Notifications } from './pages/notifications/notifications';
import { OAuthCallbackPage } from './pages/oauth-callback/oauth-callback';
import { PostDetailPage } from './pages/post-detail/post-detail';
import { Profile } from './pages/profile/profile';
import { SystemDashboardPage } from './pages/system-dashboard/system-dashboard';
import { adminGuard, authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'feed' },
  { path: 'login', component: AuthPage, canActivate: [guestGuard], title: 'ConnectSphere | Login' },
  { path: 'register', component: AuthPage, canActivate: [guestGuard], title: 'ConnectSphere | Register' },
  { path: 'auth/callback', component: OAuthCallbackPage, title: 'ConnectSphere | OAuth Callback' },
  { path: 'feed', component: Feed, title: 'ConnectSphere | Feed' },
  { path: 'discover', component: Explore, title: 'ConnectSphere | Discover' },
  { path: 'explore', redirectTo: 'discover', pathMatch: 'full' },
  { path: 'search', component: Explore, title: 'ConnectSphere | Search' },
  { path: 'messages', component: Messages, canActivate: [authGuard], title: 'ConnectSphere | Messages' },
  {
    path: 'messages/:conversationId',
    component: Messages,
    canActivate: [authGuard],
    title: 'ConnectSphere | Conversation',
  },
  { path: 'chat', redirectTo: 'messages', pathMatch: 'full' },
  { path: 'stories', redirectTo: 'feed', pathMatch: 'full' },
  {
    path: 'notifications',
    component: Notifications,
    canActivate: [authGuard],
    title: 'ConnectSphere | Notifications',
  },
  { path: 'profile', pathMatch: 'full', redirectTo: 'profile/me' },
  { path: 'profile/me', component: Profile, canActivate: [authGuard], title: 'ConnectSphere | My Profile' },
  { path: 'profile/:userId', component: Profile, title: 'ConnectSphere | Profile' },
  { path: 'post/:postId', component: PostDetailPage, title: 'ConnectSphere | Post' },
  {
    path: 'admin/dashboard',
    component: AdminDashboardPage,
    canActivate: [adminGuard],
    title: 'ConnectSphere | Admin Dashboard',
  },
  {
    path: 'system/dashboard',
    component: SystemDashboardPage,
    canActivate: [adminGuard],
    title: 'ConnectSphere | System Dashboard',
  },
  {
    path: 'create-post',
    component: CreatePostPage,
    canActivate: [authGuard],
    title: 'ConnectSphere | Create Post',
  },
  { path: '**', redirectTo: 'feed' },
];

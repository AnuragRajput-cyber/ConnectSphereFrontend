import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (session.isAuthenticated()) {
    return true;
  }

  if (session.accessToken()) {
    const profile = await session.hydrateProfile();
    if (profile) {
      return true;
    }
  }

  return router.createUrlTree(['/login'], {
    queryParams: { redirect: state.url },
  });
};

export const guestGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (session.isAuthenticated()) {
    return router.createUrlTree(['/feed']);
  }

  if (session.accessToken()) {
    const profile = await session.hydrateProfile();
    if (profile) {
      return router.createUrlTree(['/feed']);
    }
  }

  return true;
};

export const adminGuard: CanActivateFn = async (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (!session.isAuthenticated() && session.accessToken()) {
    await session.hydrateProfile();
  }

  const role = session.user()?.role?.toUpperCase();
  if (role === 'ADMIN' || role === 'ROLE_ADMIN') {
    return true;
  }

  if (!session.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { redirect: state.url },
    });
  }

  return router.createUrlTree(['/feed']);
};

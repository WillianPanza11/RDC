import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

/**
 * Guard de roles: se usa JUNTO a authGuard (canActivate: [authGuard, roleGuard]), nunca en su lugar.
 * Lee los roles permitidos desde route.data['roles'] y usa authService.hasAnyRole (ya existente).
 * Si el usuario no tiene ninguno de esos roles, redirige a /dashboard con un query param
 * que el propio Dashboard usa para mostrar un mensaje claro (ver dashboard.component.ts).
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  if (!isBrowser) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  return Promise.resolve().then(() => {
    authService.ensureAuthStateLoaded();

    const rolesPermitidos: string[] = route.data?.['roles'] ?? [];
    if (rolesPermitidos.length === 0 || authService.hasAnyRole(rolesPermitidos)) {
      return true;
    }

    router.navigate(['/dashboard'], {
      queryParams: { accessDenied: 'true' }
    });

    return false;
  });
};

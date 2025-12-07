import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);
  
  // En el servidor (SSR), permitir la navegación
  // La verificación real se hará en el cliente después de la hidratación
  if (!isBrowser) {
    return true;
  }
  
  const authService = inject(AuthService);
  const router = inject(Router);

  // En el cliente, esperar un tick para asegurar que el estado se haya cargado
  // después de la hidratación del SSR
  return Promise.resolve().then(() => {
    
    // Usar el método robusto que verifica tanto el signal como localStorage
    authService.ensureAuthStateLoaded();
    const isAuth = authService.checkAuthentication();

    if (isAuth) {
      return true;
    }

    // Guardar la URL solicitada para redirigir después del login
    const returnUrl = state.url;


    // Redirigir al login con la URL de retorno
    router.navigate(['/login'], {
      queryParams: { returnUrl }
    });

    return false;
  });
};

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Guardar la URL solicitada para redirigir después del login
  const returnUrl = state.url;
  
  // Redirigir al login con la URL de retorno
  router.navigate(['/login'], { 
    queryParams: { returnUrl } 
  });
  
  return false;
};

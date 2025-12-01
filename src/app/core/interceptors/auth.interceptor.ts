import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Rutas que no requieren token
  const publicRoutes = ['/api/auth/login', '/api/auth/register'];
  const isPublicRoute = publicRoutes.some(route => req.url.includes(route));

  // Si es una ruta pública, continuar sin modificar
  if (isPublicRoute) {
    return next(req);
  }

  // Obtener el token
  const token = authService.getToken();

  // Clonar la petición y agregar el header de Authorization
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Continuar con la petición y manejar errores
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si es error 401 (No autorizado)
      if (error.status === 401) {
        // Intentar refrescar el token
        const refreshToken = authService.getRefreshToken();
        
        if (refreshToken && !req.url.includes('/api/auth/refresh')) {
          // Intentar refrescar el token
          return authService.refreshToken().pipe(
            switchMap(() => {
              // Reintentar la petición original con el nuevo token
              const newToken = authService.getToken();
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(retryReq);
            }),
            catchError(refreshError => {
              // Si falla el refresh, cerrar sesión
              authService.logout();
              return throwError(() => refreshError);
            })
          );
        } else {
          // No hay refresh token o ya estamos en la ruta de refresh
          authService.logout();
        }
      }

      return throwError(() => error);
    })
  );
};

import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

/**
 * Inicializador de la aplicación que asegura que el estado de autenticación
 * se cargue desde localStorage antes de que Angular inicie el routing.
 * Esto previene que el authGuard se ejecute antes de que el usuario esté cargado.
 */
export function initializeAuth() {
    return () => {
        const platformId = inject(PLATFORM_ID);
        const isBrowser = isPlatformBrowser(platformId);


        if (!isBrowser) {
            return Promise.resolve();
        }

        const authService = inject(AuthService);
        // Asegurar que el estado de autenticación esté cargado desde localStorage
        authService.ensureAuthStateLoaded();

        // El AuthService ya carga el usuario en su constructor
        // Verificar que el estado esté cargado correctamente
        const isAuth = authService.isAuthenticated();

        return Promise.resolve();
    };
}

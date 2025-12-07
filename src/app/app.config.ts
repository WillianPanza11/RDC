import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { initializeAuth } from './core/initializers/auth.initializer';
import { Configuration } from './generated-api/configuration';
import { AutenticacinService } from './generated-api/api/autenticacin.service';
import { ClienteControllerService } from './generated-api/api/clienteController.service';

//Configuracion de PrimeNG
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true
    },
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    // Configuración de la API generada
    {
      provide: Configuration,
      useValue: new Configuration({ basePath: 'http://localhost:8080' })
    },
    AutenticacinService,
    ClienteControllerService,
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura
      }
    })
  ]
};



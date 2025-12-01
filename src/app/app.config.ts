import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { Configuration } from './generated-api/configuration';
import { AutenticacinService } from './generated-api/api/autenticacin.service';
import { ClienteControllerService } from './generated-api/api/clienteController.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    // Configuración de la API generada
    {
      provide: Configuration,
      useValue: new Configuration({ basePath: 'http://localhost:8080' })
    },
    AutenticacinService,
    ClienteControllerService
  ]
};



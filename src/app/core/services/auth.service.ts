import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AutenticacinService } from '../../generated-api/api/autenticacin.service';
import { LoginRequestDTO } from '../../generated-api/model/loginRequestDTO';
import { RegisterRequestDTO } from '../../generated-api/model/registerRequestDTO';
import { AuthResponseDTO } from '../../generated-api/model/authResponseDTO';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser: boolean;

  // Signals para el estado de autenticación
  private currentUserSignal = signal<AuthResponseDTO | null>(null);
  
  // Computed signals
  public isAuthenticated = computed(() => this.currentUserSignal() !== null);
  public currentUser = computed(() => this.currentUserSignal());

  constructor(
    private autenticacionService: AutenticacinService,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.loadUserFromStorage();
    }
  }

  /**
   * Carga el usuario desde localStorage al iniciar la aplicación
   */
  private loadUserFromStorage(): void {
    if (!this.isBrowser) {
      return; // No hacer nada en el servidor
    }
    
    const token = this.getToken();
    const userData = localStorage.getItem(this.USER_KEY);
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData) as AuthResponseDTO;
        this.currentUserSignal.set(user);
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        this.clearStorage();
      }
    }
  }

  /**
   * Inicia sesión con las credenciales del usuario
   */
  login(credentials: LoginRequestDTO): Observable<AuthResponseDTO> {
    return this.autenticacionService.login(credentials).pipe(
      tap(response => {
        this.handleAuthResponse(response);
      }),
      catchError(error => {
        console.error('Error en login:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Registra un nuevo usuario
   */
  register(userData: RegisterRequestDTO): Observable<AuthResponseDTO> {
    return this.autenticacionService.register(userData).pipe(
      tap(response => {
        this.handleAuthResponse(response);
      }),
      catchError(error => {
        console.error('Error en registro:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    this.clearStorage();
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  /**
   * Maneja la respuesta de autenticación
   */
  private handleAuthResponse(response: AuthResponseDTO): void {
    if (!this.isBrowser) {
      return; // No guardar en servidor
    }
    
    if (response.token) {
      localStorage.setItem(this.TOKEN_KEY, response.token);
    }
    if (response.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    }
    localStorage.setItem(this.USER_KEY, JSON.stringify(response));
    this.currentUserSignal.set(response);
  }

  /**
   * Obtiene el token de acceso
   */
  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtiene el refresh token
   */
  getRefreshToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Refresca el token de acceso
   */
  refreshToken(): Observable<AuthResponseDTO> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token disponible'));
    }

    return this.autenticacionService.refreshToken({ refreshToken }).pipe(
      tap(response => {
        this.handleAuthResponse(response);
      }),
      catchError(error => {
        console.error('Error al refrescar token:', error);
        this.logout();
        return throwError(() => error);
      })
    );
  }

  /**
   * Limpia todos los datos almacenados
   */
  private clearStorage(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole(role: string): boolean {
    const user = this.currentUserSignal();
    return user?.roles?.includes(role) ?? false;
  }

  /**
   * Verifica si el usuario tiene alguno de los roles especificados
   */
  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }
}

import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { Header } from '../header/header';
import { Toast } from 'primeng/toast';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { CierresDeCajaService } from '../../generated-api/api/cierresDeCaja.service';
import { CierreCajaResponseDTO } from '../../generated-api/model/cierreCajaResponseDTO';
import { RecaudoDiaResponseDTO } from '../../generated-api/model/recaudoDiaResponseDTO';

const ROLES_ADMINISTRACION_CAJA = ['ROLE_PRESIDENTE', 'ROLE_SECRETARIO', 'ROLE_ADMIN'];

/**
 * Dashboard operativo: cambia según el rol del usuario.
 * - Cajero (o cualquiera sin rol de administración): estado de su propia caja + accesos rápidos.
 * - Presidente/Secretario/Admin: totales del día + alerta de cajas abiertas de fecha anterior.
 *
 * "Cajas abiertas ahora mismo" NO se calcula desde obtenerRecaudoDia().detallePorCajero: ese
 * reporte está acotado a la fecha consultada, así que una caja abierta hace varios días (el
 * caso que justamente hay que alertar) podría no aparecer ahí. Se usa una llamada aparte a
 * obtenerHistorial con estado=ABIERTO y un `desde` muy amplio, que sí lista TODO lo abierto
 * sin importar cuándo se abrió.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, Header, Toast, Card, Message, ButtonModule, Tag, SkeletonModule],
  providers: [MessageService, CierresDeCajaService],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  private platformId = inject(PLATFORM_ID);

  cargando: boolean = true;

  // Vista cajero
  cajaAbierta?: CierreCajaResponseDTO;
  resumenCaja?: CierreCajaResponseDTO;

  // Vista administración
  recaudo?: RecaudoDiaResponseDTO;
  cantidadCajasAbiertas: number = 0;
  cajasFechaAnterior: CierreCajaResponseDTO[] = [];

  constructor(
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private cierresDeCajaService: CierresDeCajaService
  ) { }

  ngOnInit(): void {
    // roleGuard redirige aquí con este query param cuando el usuario intenta entrar
    // por URL directa a una ruta para la que no tiene el rol requerido.
    if (this.route.snapshot.queryParamMap.get('accessDenied') === 'true') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Acceso denegado',
        detail: 'No tienes permiso para acceder a esa sección',
        life: 5000
      });
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }

    if (isPlatformBrowser(this.platformId)) {
      this.cargarDatos();
    }
  }

  esAdministracion(): boolean {
    return this.authService.hasAnyRole(ROLES_ADMINISTRACION_CAJA);
  }

  private cargarDatos(): void {
    if (this.esAdministracion()) {
      this.cargarDatosAdministracion();
    } else {
      this.cargarDatosCajero();
    }
  }

  private cargarDatosCajero(): void {
    this.cierresDeCajaService.obtenerMiCajaAbierta().subscribe({
      next: (caja) => {
        if (caja && caja.idCierre) {
          this.cajaAbierta = caja;
          this.cierresDeCajaService.obtenerResumen(caja.idCierre).subscribe({
            next: (resumen) => {
              this.resumenCaja = resumen;
              this.cargando = false;
            },
            error: (error) => {
              this.cargando = false;
              console.error('Error loading resumen de caja:', error);
            }
          });
        } else {
          this.cajaAbierta = undefined;
          this.cargando = false;
        }
      },
      error: (error) => {
        this.cargando = false;
        this.cajaAbierta = undefined;
        // 204/404 sin caja abierta no es un error real.
        if (error.status && error.status !== 204 && error.status !== 404) {
          console.error('Error loading mi caja abierta:', error);
        }
      }
    });
  }

  private cargarDatosAdministracion(): void {
    const hoy = this.obtenerFechaHoyIso();

    forkJoin({
      recaudo: this.cierresDeCajaService.obtenerRecaudoDia(hoy).pipe(
        catchError((error) => {
          console.error('Error loading recaudo del día:', error);
          this.enviarMensajeError('No se pudo cargar el recaudo del día');
          return of(undefined);
        })
      ),
      cajasAbiertas: this.cierresDeCajaService
        .obtenerHistorial('2000-01-01', hoy, { page: 0, size: 100 }, undefined, 'ABIERTO')
        .pipe(
          catchError((error) => {
            console.error('Error loading cajas abiertas:', error);
            this.enviarMensajeError('No se pudieron cargar las cajas abiertas');
            return of(undefined);
          })
        )
    }).subscribe(({ recaudo, cajasAbiertas }) => {
      this.cargando = false;
      this.recaudo = recaudo;

      if (cajasAbiertas) {
        this.cantidadCajasAbiertas = cajasAbiertas.totalElements ?? 0;
        this.cajasFechaAnterior = (cajasAbiertas.content ?? []).filter(c => c.fecha && c.fecha !== hoy);
      }
    });
  }

  /** 'error' si alguna caja de fecha anterior lleva más de 2 días abierta, 'warn' en caso contrario. */
  get severidadAlertaCajas(): 'warn' | 'error' {
    const hoy = new Date(this.obtenerFechaHoyIso());
    const maxDias = this.cajasFechaAnterior.reduce((max, caja) => {
      if (!caja.fecha) return max;
      const dias = Math.round((hoy.getTime() - new Date(caja.fecha).getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(max, dias);
    }, 0);
    return maxDias > 2 ? 'error' : 'warn';
  }

  private obtenerFechaHoyIso(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = (hoy.getMonth() + 1).toString().padStart(2, '0');
    const day = hoy.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  irAMiCaja(): void {
    this.router.navigate(['/caja']);
  }

  irARegistrarPago(): void {
    this.router.navigate(['/prestamos']);
  }

  irADepositoRetiro(): void {
    this.router.navigate(['/cuentas']);
  }

  irAClientes(): void {
    this.router.navigate(['/clientes']);
  }

  irAPrestamos(): void {
    this.router.navigate(['/prestamos']);
  }

  irAHistorialCierres(): void {
    this.router.navigate(['/caja/historial']);
  }

  irACajasAbiertas(): void {
    this.router.navigate(['/caja/historial'], { queryParams: { estado: 'ABIERTO' } });
  }

  irACorregirPago(): void {
    this.router.navigate(['/pagos']);
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
  }

  private enviarMensajeError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 7000 });
  }

  logout(): void {
    this.authService.logout();
  }
}

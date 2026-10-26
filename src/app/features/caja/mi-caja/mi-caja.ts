import { Component, OnInit, ViewChild, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Header } from '../../header/header';
import { Toast } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';
import { CierresDeCajaService } from '../../../generated-api/api/cierresDeCaja.service';
import { CierreCajaResponseDTO } from '../../../generated-api/model/cierreCajaResponseDTO';
import { MovimientosDeCajaService } from '../../../generated-api/api/movimientosDeCaja.service';
import { MovimientoCajaDetalleDTO } from '../../../generated-api/model/movimientoCajaDetalleDTO';
import { CerrarCajaDialog } from '../cerrar-caja-dialog/cerrar-caja-dialog';

/**
 * "Mi caja": disponible para cualquier usuario autenticado (no solo ROLE_CAJERO explícito,
 * cualquiera puede llegar a abrir una caja). Los totales (totalCobrado/totalPendiente) los
 * calcula siempre el backend (obtenerResumen); aquí solo se muestran.
 */
@Component({
  selector: 'app-mi-caja',
  imports: [CommonModule, Header, Toast, ButtonModule, ConfirmDialogModule, TableModule, Tag, TooltipModule, Card, Message, CerrarCajaDialog],
  providers: [MessageService, ConfirmationService, CierresDeCajaService, MovimientosDeCajaService],
  templateUrl: './mi-caja.html',
})
export class MiCaja implements OnInit {

  private platformId = inject(PLATFORM_ID);

  @ViewChild(CerrarCajaDialog) cerrarCajaDialog!: CerrarCajaDialog;

  cargando: boolean = true;
  cajaAbierta?: CierreCajaResponseDTO;
  resumen?: CierreCajaResponseDTO;
  movimientosHoy: MovimientoCajaDetalleDTO[] = [];
  /** true si la caja abierta quedó de un día anterior (sin cuadrar) — bloquea pago/depósito/retiro. */
  cajaDeFechaAnterior: boolean = false;

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cierresDeCajaService: CierresDeCajaService,
    private movimientosDeCajaService: MovimientosDeCajaService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Solo en el navegador (no durante el prerender SSR, donde no hay sesión). Como
    // MiCaja es un componente de ruta perezosa, cada vez que el cajero vuelve a /caja
    // (desde /prestamos o /cuentas) se crea una instancia nueva y ngOnInit se vuelve a ejecutar.
    if (isPlatformBrowser(this.platformId)) {
      this.cargarEstado();
      this.cargarMovimientosHoy();
    }
  }

  cargarEstado(): void {
    this.cargando = true;
    this.resumen = undefined;

    this.cierresDeCajaService.obtenerMiCajaAbierta().subscribe({
      next: (caja) => {
        this.cargando = false;
        if (caja && caja.idCierre) {
          this.cajaAbierta = caja;
          this.cajaDeFechaAnterior = !!caja.fecha && caja.fecha !== this.obtenerFechaHoyIso();
          this.cargarResumen(caja.idCierre);
        } else {
          this.cajaAbierta = undefined;
          this.cajaDeFechaAnterior = false;
        }
      },
      error: (error) => {
        this.cargando = false;
        this.cajaAbierta = undefined;
        // 204/404 sin caja abierta no es un error real; solo se registra si trae otro código.
        if (error.status && error.status !== 204 && error.status !== 404) {
          this.enviarMensajeError('No se pudo consultar el estado de la caja');
          console.error('Error loading mi caja abierta:', error);
        }
      }
    });
  }

  cargarMovimientosHoy(): void {
    this.movimientosDeCajaService.obtenerMovimientosDeHoy().subscribe({
      next: (data) => {
        this.movimientosHoy = data;
      },
      error: (error) => {
        this.enviarMensajeError('No se pudieron cargar los movimientos de hoy');
        console.error('Error loading movimientos de hoy:', error);
      }
    });
  }

  private obtenerFechaHoyIso(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = (hoy.getMonth() + 1).toString().padStart(2, '0');
    const day = hoy.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private cargarResumen(idCierre: number): void {
    this.cierresDeCajaService.obtenerResumen(idCierre).subscribe({
      next: (resumen) => {
        this.resumen = resumen;
      },
      error: (error) => {
        this.enviarMensajeError('No se pudo cargar el resumen de la caja');
        console.error('Error loading resumen de caja:', error);
      }
    });
  }

  abrirCaja(): void {
    this.confirmationService.confirm({
      message: '¿Está seguro que desea abrir una caja nueva?',
      header: 'Confirmar Apertura de Caja',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.cierresDeCajaService.abrirCaja().subscribe({
          next: (caja) => {
            this.cajaAbierta = caja;
            this.enviarMensajeExito('Caja abierta correctamente');
            if (caja.idCierre) {
              this.cargarResumen(caja.idCierre);
            }
          },
          error: (error) => {
            console.error('Error abriendo caja:', error);
            this.enviarMensajeError(error.error?.message || 'No se pudo abrir la caja');
          }
        });
      }
    });
  }

  abrirDialogoCierre(): void {
    if (!this.cajaAbierta?.idCierre) return;
    // El diálogo vuelve a pedir su propio resumen fresco; aquí solo se le indica qué caja cerrar.
    this.cerrarCajaDialog.abrirParaCierre(this.cajaAbierta.idCierre);
  }

  onCajaCerrada(): void {
    this.enviarMensajeExito('Caja cerrada correctamente');
    this.cajaAbierta = undefined;
    this.resumen = undefined;
    this.cargarEstado();
    this.cargarMovimientosHoy();
  }

  irARegistrarPago(): void {
    this.router.navigate(['/prestamos']);
  }

  irADepositoRetiro(): void {
    this.router.navigate(['/cuentas']);
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
  }

  /**
   * El DTO tipa `hora` como LocalTime ({hour, minute, second, nano}), pero Jackson/Spring Boot
   * suele serializar java.time.LocalTime como string "HH:mm:ss". Se soportan ambos formatos
   * para no depender de cuál termine llegando realmente en runtime.
   */
  formatHora(hora: any): string {
    if (!hora) return '';
    if (typeof hora === 'string') {
      return hora.substring(0, 5);
    }
    if (typeof hora.hour === 'number') {
      const horas = hora.hour.toString().padStart(2, '0');
      const minutos = (hora.minute ?? 0).toString().padStart(2, '0');
      return `${horas}:${minutos}`;
    }
    return '';
  }

  getSeverityTipo(tipo?: MovimientoCajaDetalleDTO.TipoEnum): "success" | "danger" | undefined {
    return tipo === 'INGRESO' ? 'success' : 'danger';
  }

  private enviarMensajeError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 7000 });
  }

  private enviarMensajeExito(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail, life: 3000 });
  }
}

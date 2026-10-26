import { Component, OnInit, ViewChild, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Header } from '../../header/header';
import { Toast } from 'primeng/toast';
import { Table, TableModule, TableLazyLoadEvent } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CierresDeCajaService } from '../../../generated-api/api/cierresDeCaja.service';
import { UsuariosService } from '../../../generated-api/api/usuarios.service';
import { CierreCajaResponseDTO } from '../../../generated-api/model/cierreCajaResponseDTO';
import { AuthService } from '../../../core/services/auth.service';
import { CerrarCajaDialog } from '../cerrar-caja-dialog/cerrar-caja-dialog';

/**
 * Historial de cierres: solo visible para ROLE_PRESIDENTE, ROLE_SECRETARIO o ROLE_ADMIN
 * (protegido por roleGuard en app.routes.ts). Paginación server-side contra obtenerHistorial,
 * ya que la lista puede crecer sin límite con el tiempo.
 *
 * Además de consultar, es el punto de entrada para cerrar la caja de OTRO cajero (ver
 * CierreCajaService.cerrarCaja() en el backend): a diferencia de MiCaja, acá "Cerrar esta
 * caja" puede abrir una caja que no es la del usuario autenticado, así que siempre se calcula
 * esCajaDeOtroCajero comparando cierre.idCajero contra el usuario logueado, sin asumir que
 * quien entra a esta pantalla siempre está cerrando cajas ajenas (un Presidente también
 * podría tener su propia caja abierta y cerrarla desde acá).
 */
@Component({
  selector: 'app-historial-cierres',
  imports: [CommonModule, FormsModule, Header, Toast, TableModule, DatePickerModule, SelectModule, Tag,
    ButtonModule, ConfirmDialogModule, CerrarCajaDialog],
  providers: [MessageService, ConfirmationService, CierresDeCajaService, UsuariosService],
  templateUrl: './historial-cierres.html',
})
export class HistorialCierres implements OnInit {

  private platformId = inject(PLATFORM_ID);

  @ViewChild('dt') dt!: Table;
  @ViewChild(CerrarCajaDialog) cerrarCajaDialog!: CerrarCajaDialog;

  desde: Date;
  hasta: Date;
  cajeroFiltro?: number;
  cajerosOptions: any[] = [];

  estadoFiltro?: CierreCajaResponseDTO.EstadoEnum;
  estadoOptions: { label: string; value: CierreCajaResponseDTO.EstadoEnum | undefined }[] = [
    { label: 'Todas', value: undefined },
    { label: 'Abiertas', value: CierreCajaResponseDTO.EstadoEnum.ABIERTO },
    { label: 'Cerradas', value: CierreCajaResponseDTO.EstadoEnum.CERRADO },
  ];

  cierres: CierreCajaResponseDTO[] = [];
  totalRecords: number = 0;
  cargando: boolean = false;
  rows: number = 10;
  private paginaActual: number = 0;

  constructor(
    private messageService: MessageService,
    private cierresDeCajaService: CierresDeCajaService,
    private usuariosService: UsuariosService,
    protected authService: AuthService,
    private route: ActivatedRoute
  ) {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    this.desde = hace30Dias;
    this.hasta = hoy;

    // Si se llega con ?estado=ABIERTO (ej. desde el dashboard), preseleccionar el filtro y
    // ampliar el rango: una caja abierta hace más de 30 días no debe quedar oculta por el
    // rango de fechas por defecto de esta pantalla.
    const estadoQueryParam = this.route.snapshot.queryParamMap.get('estado');
    if (estadoQueryParam === 'ABIERTO' || estadoQueryParam === 'CERRADO') {
      this.estadoFiltro = estadoQueryParam as CierreCajaResponseDTO.EstadoEnum;
      if (estadoQueryParam === 'ABIERTO') {
        const haceUnAnio = new Date();
        haceUnAnio.setFullYear(hoy.getFullYear() - 1);
        this.desde = haceUnAnio;
      }
    }
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarCajeros();
    }
  }

  private cargarCajeros(): void {
    this.usuariosService.listarUsuarios(['ROLE_ADMIN', 'ROLE_CAJERO', 'ROLE_PRESIDENTE', 'ROLE_SECRETARIO']).subscribe({
      next: (usuarios) => {
        this.cajerosOptions = [
          { label: 'Todos los cajeros', value: undefined },
          ...usuarios.filter(u => !!u.idUsuario).map(u => ({ label: u.nombreCompleto, value: u.idUsuario }))
        ];
      },
      error: (error) => {
        console.error('Error loading cajeros:', error);
      }
    });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.rows;
    const page = Math.floor((event.first ?? 0) / rows);
    this.paginaActual = page;
    this.cargarHistorial(page, rows);
  }

  onFiltroChange(): void {
    if (this.dt) {
      this.dt.first = 0;
    }
    this.paginaActual = 0;
    this.cargarHistorial(0, this.rows);
  }

  private cargarHistorial(page: number, size: number): void {
    if (!this.desde || !this.hasta) return;

    this.cargando = true;
    const desdeStr = this.toIsoDate(this.desde);
    const hastaStr = this.toIsoDate(this.hasta);

    this.cierresDeCajaService
      .obtenerHistorial(desdeStr, hastaStr, { page, size }, this.cajeroFiltro, this.estadoFiltro)
      .subscribe({
        next: (data) => {
          this.cierres = data.content ?? [];
          this.totalRecords = data.totalElements ?? 0;
          this.cargando = false;
        },
        error: (error) => {
          this.cargando = false;
          this.enviarMensajeError('No se pudo cargar el historial de cierres');
          console.error('Error loading historial de cierres:', error);
        }
      });
  }

  /**
   * Punto de entrada para cerrar la caja de otro cajero (o la propia, si el
   * usuario autenticado la ve en esta lista). El diálogo recalcula sus
   * propios totales frescos contra obtenerResumen(idCierre); acá solo se le
   * indica qué caja cerrar y si es ajena.
   */
  cerrarCajaSeleccionada(cierre: CierreCajaResponseDTO): void {
    if (!cierre.idCierre) return;
    const esCajaDeOtroCajero = cierre.idCajero !== this.authService.currentUser()?.id;
    this.cerrarCajaDialog.abrirParaCierre(cierre.idCierre, esCajaDeOtroCajero);
  }

  onCajaCerrada(): void {
    this.enviarMensajeExito('Caja cerrada correctamente');
    this.cargarHistorial(this.paginaActual, this.rows);
  }

  private toIsoDate(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getSeverity(estado?: CierreCajaResponseDTO.EstadoEnum): "success" | "secondary" | undefined {
    return estado === 'ABIERTO' ? 'success' : 'secondary';
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
  }

  private enviarMensajeError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 7000 });
  }

  private enviarMensajeExito(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail, life: 3000 });
  }
}

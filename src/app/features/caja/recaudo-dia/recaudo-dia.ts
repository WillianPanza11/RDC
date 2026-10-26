import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../../header/header';
import { Toast } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { Tag } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { CierresDeCajaService } from '../../../generated-api/api/cierresDeCaja.service';
import { RecaudoDiaResponseDTO } from '../../../generated-api/model/recaudoDiaResponseDTO';
import { DetalleCajeroDiaDTO } from '../../../generated-api/model/detalleCajeroDiaDTO';

/**
 * Recaudo del día: reporte agregado de toda la cooperativa. Solo visible para
 * ROLE_PRESIDENTE, ROLE_SECRETARIO o ROLE_ADMIN (protegido por roleGuard en app.routes.ts).
 * Todos los totales los calcula el backend (obtenerRecaudoDia); aquí solo se muestran.
 */
@Component({
  selector: 'app-recaudo-dia',
  imports: [CommonModule, FormsModule, Header, Toast, TableModule, DatePickerModule, Tag],
  providers: [MessageService, CierresDeCajaService],
  templateUrl: './recaudo-dia.html',
})
export class RecaudoDia implements OnInit {

  private platformId = inject(PLATFORM_ID);

  fechaSeleccionada: Date = new Date();
  recaudo?: RecaudoDiaResponseDTO;
  cargando: boolean = false;

  constructor(
    private messageService: MessageService,
    private cierresDeCajaService: CierresDeCajaService
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarRecaudo();
    }
  }

  onFechaChange(): void {
    this.cargarRecaudo();
  }

  cargarRecaudo(): void {
    if (!this.fechaSeleccionada) return;

    this.cargando = true;
    const fechaStr = this.toIsoDate(this.fechaSeleccionada);

    this.cierresDeCajaService.obtenerRecaudoDia(fechaStr).subscribe({
      next: (data) => {
        this.recaudo = data;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.enviarMensajeError('No se pudo cargar el recaudo del día');
        console.error('Error loading recaudo del día:', error);
      }
    });
  }

  private toIsoDate(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getSeverity(estado?: DetalleCajeroDiaDTO.EstadoEnum): "success" | "secondary" | undefined {
    return estado === 'ABIERTO' ? 'success' : 'secondary';
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
  }

  private enviarMensajeError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 7000 });
  }
}

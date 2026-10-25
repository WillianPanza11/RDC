import { Component, ViewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Header } from '../../header/header';
import { Toast } from 'primeng/toast';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ClienteControllerService } from '../../../generated-api/api/clienteController.service';
import { ClienteEnMoraDTO } from '../../../generated-api/model/clienteEnMoraDTO';

/**
 * Cartera vencida (/clientes/en-mora): clientes con al menos una cuota vencida
 * y sin pagar, agregados por cliente. El backend ya los entrega ordenados por
 * días de atraso descendente (el más urgente primero), así que no se reordena
 * en el frontend. Visible para cualquier usuario autenticado, igual que el
 * endpoint que consume (sin restricción de rol).
 */
@Component({
  selector: 'app-clientes-en-mora',
  imports: [
    CommonModule, Header, Toast, TableModule, ButtonModule, Tag, TooltipModule,
    IconFieldModule, InputIconModule, InputTextModule
  ],
  providers: [MessageService, ClienteControllerService],
  templateUrl: './en-mora.html',
  styleUrl: './en-mora.css',
})
export class ClientesEnMora {

  clientesEnMora: ClienteEnMoraDTO[] = [];
  cargando: boolean = true;

  @ViewChild('dt') dt!: Table;

  constructor(
    private messageService: MessageService,
    private clienteService: ClienteControllerService,
    private router: Router
  ) {
    // Ejecutar solo en el navegador (después de la hidratación SSR), igual que en Clientes/Cuentas/Prestamos.
    afterNextRender(() => {
      this.cargarClientesEnMora();
    });
  }

  cargarClientesEnMora(): void {
    this.cargando = true;
    this.clienteService.obtenerClientesEnMora().subscribe({
      next: (data) => {
        this.clientesEnMora = data;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.enviarMensajeError('No se pudieron cargar los clientes en mora');
        console.error('Error loading clientes en mora:', error);
      }
    });
  }

  verCliente(cliente: ClienteEnMoraDTO): void {
    if (cliente.idCliente) {
      this.router.navigate(['/clientes', cliente.idCliente], { queryParams: { origen: 'en-mora' } });
    }
  }

  /** Mismo criterio de "urgencia" que ya usa el dashboard para las cajas abiertas: 30+ días es lo más grave. */
  getSeverityDias(dias?: number): 'danger' | 'warn' {
    return (dias ?? 0) >= 30 ? 'danger' : 'warn';
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
  }

  exportCSV(): void {
    this.dt.exportCSV();
  }

  private enviarMensajeError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 7000 });
  }
}

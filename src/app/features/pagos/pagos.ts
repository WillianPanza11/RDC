import { Component, OnInit, ViewChild, afterNextRender } from '@angular/core';
import { Header } from "../header/header";
import { Toast } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { SelectModule } from 'primeng/select';
import { InputIconModule } from 'primeng/inputicon';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { PagosDePrstamosService } from '../../generated-api/api/pagosDePrstamos.service';
import { ClienteControllerService } from '../../generated-api/api/clienteController.service';
import { PagoPrestamoResponseDTO } from '../../generated-api/model/pagoPrestamoResponseDTO';
import { ClienteResponseDTO } from '../../generated-api/model/clienteResponseDTO';

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-pagos',
  imports: [Toast, ToolbarModule, TableModule, ButtonModule, DialogModule, IconFieldModule,
    SelectModule, InputIconModule, FormsModule, CommonModule, MessageModule, ConfirmDialogModule, 
    Header, InputTextModule, TooltipModule],
  providers: [MessageService, PagosDePrstamosService, ClienteControllerService],
  templateUrl: './pagos.html',
  styleUrl: './pagos.css',
})
export class Pagos implements OnInit {

  pagos: PagoPrestamoResponseDTO[] = [];
  pagoSeleccionado?: PagoPrestamoResponseDTO;
  detallesDialog: boolean = false;
  pagosDelPrestamo: PagoPrestamoResponseDTO[] = [];
  idPrestamoSeleccionado?: number;

  // Filtros
  clientes: ClienteResponseDTO[] = [];
  clientesOptions: any[] = [];
  clienteFiltro?: number;

  @ViewChild('dt') dt!: Table;
  cols: Column[] = [];

  constructor(
    private messageService: MessageService,
    private pagosService: PagosDePrstamosService,
    private clienteService: ClienteControllerService
  ) {
    afterNextRender(() => {
      this.loadPagos();
      this.loadClientes();
    });
  }

  ngOnInit(): void {
    this.initializeColumns();
  }

  private initializeColumns(): void {
    this.cols = [
      { field: 'nombreCliente', header: 'Cliente' },
      { field: 'cedula', header: 'Cédula' },
      { field: 'numeroCuentaPrestamo', header: 'Número de Cuenta' },
      { field: 'numeroCuotaPagada', header: 'Cuota' },
      { field: 'montoPagado', header: 'Monto Pagado' },
      { field: 'capitalPagado', header: 'Capital' },
      { field: 'interesPagado', header: 'Interés' },
      { field: 'mora', header: 'Mora' },
      { field: 'metodoPago', header: 'Método de Pago' },
      { field: 'fechaPago', header: 'Fecha de Pago' }
    ];
  }

  loadPagos(): void {
    if (this.clienteFiltro) {
      this.pagosService.obtenerPagosPorCliente(this.clienteFiltro).subscribe({
        next: (data) => {
          this.pagos = data;
        },
        error: (error) => {
          this.enviarMensajeError('No se pudieron cargar los pagos');
          console.error('Error loading pagos:', error);
        }
      });
    } else {
      this.pagosService.obtenerTodosLosPagos().subscribe({
        next: (data) => {
          this.pagos = data;
        },
        error: (error) => {
          this.enviarMensajeError('No se pudieron cargar los pagos');
          console.error('Error loading pagos:', error);
        }
      });
    }
  }

  loadClientes(): void {
    this.clienteService.obtenerClientesPorEstado('ACTIVO').subscribe({
      next: (data) => {
        this.clientes = data;
        this.clientesOptions = [
          { label: 'Todos los clientes', value: undefined },
          ...data.map(cliente => ({
            label: `${cliente.nombres} ${cliente.apellidos} - ${cliente.cedula}`,
            value: cliente.idCliente
          }))
        ];
      },
      error: (error) => {
        console.error('Error loading clientes:', error);
      }
    });
  }

  verDetalles(pago: PagoPrestamoResponseDTO): void {
    if (!pago.idPrestamo) {
      this.enviarMensajeError('No se pudo obtener la información del préstamo');
      return;
    }
    
    this.pagoSeleccionado = pago;
    this.idPrestamoSeleccionado = pago.idPrestamo;
    this.pagosDelPrestamo = [];

    // Cargar todos los pagos del préstamo
    this.pagosService.obtenerPagosPorPrestamo(pago.idPrestamo).subscribe({
      next: (data) => {
        // Ordenar por número de cuota
        this.pagosDelPrestamo = data.sort((a, b) => {
          const cuotaA = a.numeroCuotaPagada || 0;
          const cuotaB = b.numeroCuotaPagada || 0;
          return cuotaA - cuotaB;
        });
        this.detallesDialog = true;
      },
      error: (error) => {
        this.enviarMensajeError('No se pudieron cargar los pagos del préstamo');
        console.error('Error loading pagos del prestamo:', error);
      }
    });
  }

  onClienteFiltroChange(): void {
    this.loadPagos();
  }

  exportCSV(): void {
    this.dt.exportCSV();
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    
    const fechaStr = date.toString();
    
    // Si es solo fecha (YYYY-MM-DD), parsearla directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      const [year, month, day] = fechaStr.split('-').map(Number);
      const fecha = new Date(year, month - 1, day);
      return fecha.toLocaleDateString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Si incluye hora, extraer solo la parte de fecha
    const fechaParte = fechaStr.split('T')[0];
    if (fechaParte && /^\d{4}-\d{2}-\d{2}$/.test(fechaParte)) {
      const [year, month, day] = fechaParte.split('-').map(Number);
      const fecha = new Date(year, month - 1, day);
      return fecha.toLocaleDateString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
    
    // Si tiene hora, parsear correctamente
    const fecha = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(fecha.getTime())) return '';
    
    // Usar UTC para evitar problemas de zona horaria
    const year = fecha.getUTCFullYear();
    const month = fecha.getUTCMonth() + 1;
    const day = fecha.getUTCDate();
    const hour = fecha.getUTCHours();
    const minute = fecha.getUTCMinutes();
    
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  getMetodoPagoLabel(metodo?: string): string {
    const metodos: { [key: string]: string } = {
      'EFECTIVO': 'Efectivo',
      'TRANSFERENCIA': 'Transferencia',
      'CHEQUE': 'Cheque',
      'TARJETA_DEBITO': 'Tarjeta de Débito',
      'TARJETA_CREDITO': 'Tarjeta de Crédito',
      'DEBITO_AUTOMATICO': 'Débito Automático'
    };
    return metodo ? (metodos[metodo] || metodo) : '';
  }

  // Métodos para calcular totales
  calcularTotalMontoPagado(): number {
    return this.pagosDelPrestamo.reduce((sum, p) => sum + (p.montoPagado || 0), 0);
  }

  calcularTotalCapital(): number {
    return this.pagosDelPrestamo.reduce((sum, p) => sum + (p.capitalPagado || 0), 0);
  }

  calcularTotalInteres(): number {
    return this.pagosDelPrestamo.reduce((sum, p) => sum + (p.interesPagado || 0), 0);
  }

  calcularTotalMora(): number {
    return this.pagosDelPrestamo.reduce((sum, p) => sum + (p.mora || 0), 0);
  }

  //envio de mensajes de error
  enviarMensajeError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: detail,
      life: 3000
    });
  }

  //envio de mensajes de éxito
  enviarMensajeExito(detail: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: detail,
      life: 3000
    });
  }
}

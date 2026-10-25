import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PagosDePrstamosService } from '../../../generated-api/api/pagosDePrstamos.service';
import { PrestamoResponseDTO } from '../../../generated-api/model/prestamoResponseDTO';
import { PagoPrestamoRequestDTO } from '../../../generated-api/model/pagoPrestamoRequestDTO';
import { PagoPrestamoResponseDTO } from '../../../generated-api/model/pagoPrestamoResponseDTO';
import { AmortizacionDTO } from '../../../generated-api/model/amortizacionDTO';

/**
 * Diálogo "Registrar pago", extraído de Prestamos (pagoDialog) para reutilizarlo
 * en el hub de cliente. Siempre se abre ya sabiendo a qué préstamo corresponde
 * el pago (abrirParaPrestamo) — igual que el openPago(prestamo) original de
 * Prestamos. Cuando lo abre el hub, es el propio hub el que primero resuelve
 * cuál préstamo del cliente es (ver ClienteDetalle.registrarPago), así este
 * diálogo no necesita saber nada sobre "clientes", solo sobre "un préstamo".
 *
 * El backend ya no recibe número de cuota ni monto por cuota: solo idPrestamo
 * y montoRecibido. Es el backend quien decide desde qué cuota pendiente
 * empieza a aplicar el pago y cuántas cuotas completas alcanza a cubrir.
 */
@Component({
  selector: 'app-pago-form-dialog',
  imports: [CommonModule, FormsModule, DialogModule, SelectModule, InputNumberModule, InputTextModule, ButtonModule],
  providers: [PagosDePrstamosService],
  templateUrl: './pago-form-dialog.html',
})
export class PagoFormDialog {

  @Output() guardado = new EventEmitter<void>();

  visible: boolean = false;
  submitted: boolean = false;

  prestamoSeleccionado?: PrestamoResponseDTO;
  pago: PagoPrestamoRequestDTO = this.getEmptyPago();

  /** Solo informativo: la próxima cuota pendiente, para que el cajero tenga una referencia. */
  cuotaPendiente?: AmortizacionDTO;

  /** Comprobante devuelto por el backend tras registrar el pago; reemplaza el formulario mientras esté definido. */
  pagoRegistrado?: PagoPrestamoResponseDTO;

  metodosPago = [
    { label: 'Efectivo', value: 'EFECTIVO' },
    { label: 'Transferencia', value: 'TRANSFERENCIA' },
    { label: 'Tarjeta de Débito', value: 'TARJETA_DEBITO' },
    { label: 'Tarjeta de Crédito', value: 'TARJETA_CREDITO' },
  ];

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private pagosService: PagosDePrstamosService
  ) { }

  /** Se abre siempre ya sabiendo a qué préstamo corresponde el pago (fila de Prestamos, o preselección del hub). */
  abrirParaPrestamo(prestamo: PrestamoResponseDTO): void {
    if (!prestamo.idPrestamo) return;

    this.submitted = false;
    this.prestamoSeleccionado = prestamo;
    this.pago = this.getEmptyPago();
    this.pago.idPrestamo = prestamo.idPrestamo;
    this.cuotaPendiente = undefined;
    this.pagoRegistrado = undefined;

    this.pagosService.obtenerProximaCuotaAVencer(prestamo.idPrestamo).subscribe({
      next: (cuota) => {
        this.cuotaPendiente = cuota;
      },
      error: (error) => {
        console.error('Error loading próxima cuota pendiente:', error);
      }
    });

    this.visible = true;
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
  }

  async registrarPago(): Promise<void> {
    this.submitted = true;

    if (!this.pago.idPrestamo) {
      this.enviarMensajeAdvertencia('El préstamo es requerido');
      return;
    }
    if (!this.pago.montoRecibido || this.pago.montoRecibido <= 0) {
      this.enviarMensajeAdvertencia('El monto recibido debe ser mayor a 0');
      return;
    }
    if (!this.pago.metodoPago || this.pago.metodoPago.trim() === '') {
      this.enviarMensajeAdvertencia('El método de pago es requerido');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro que desea registrar un pago recibido de ${this.formatCurrency(this.pago.montoRecibido)}?`,
      header: 'Confirmar Registro de Pago',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.pagosService.registrarPago(this.pago).subscribe({
          next: (response) => {
            this.pagoRegistrado = response;
            this.enviarMensajeExito('Pago registrado correctamente');
            this.guardado.emit();
          },
          error: (error) => {
            console.error('Error registering pago:', error);
            this.enviarMensajeError(error.error?.message || 'No se pudo registrar el pago');
          }
        });
      }
    });
  }

  private getEmptyPago(): PagoPrestamoRequestDTO {
    return {
      idPrestamo: 0,
      montoRecibido: 0,
      metodoPago: '',
      referencia: '',
      mora: 0
    };
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    const fechaStr = date.toString();
    const fechaParte = fechaStr.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaParte)) {
      const [year, month, day] = fechaParte.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('es-EC');
    }
    const fecha = new Date(date);
    return isNaN(fecha.getTime()) ? '' : fecha.toLocaleDateString('es-EC');
  }

  private enviarMensajeError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 7000 });
  }

  private enviarMensajeExito(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail, life: 3000 });
  }

  private enviarMensajeAdvertencia(detail: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail, life: 3000 });
  }
}

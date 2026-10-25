import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PagosDePrstamosService } from '../../../generated-api/api/pagosDePrstamos.service';
import { PagoPrestamoResponseDTO } from '../../../generated-api/model/pagoPrestamoResponseDTO';
import { CorregirPagoRequestDTO } from '../../../generated-api/model/corregirPagoRequestDTO';

/**
 * Diálogo de corrección de pago tras cierre de caja. Solo lo abren usuarios con
 * ROLE_PRESIDENTE, ROLE_SECRETARIO o ROLE_ADMIN (el botón que lo abre, en Pagos,
 * ya está oculto para el resto). Genera un MovimientoCaja de ajuste sin tocar el
 * PagoPrestamo original ni ninguna CierreCaja histórica (lo hace el backend).
 */
@Component({
  selector: 'app-corregir-pago-dialog',
  imports: [CommonModule, FormsModule, DialogModule, InputNumberModule, Textarea, ButtonModule],
  providers: [PagosDePrstamosService],
  templateUrl: './corregir-pago-dialog.html',
})
export class CorregirPagoDialog {

  @Output() corregido = new EventEmitter<void>();

  visible: boolean = false;
  submitted: boolean = false;

  pagoSeleccionado?: PagoPrestamoResponseDTO;
  correccion: CorregirPagoRequestDTO = this.getEmptyCorreccion();

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private pagosService: PagosDePrstamosService
  ) { }

  abrirParaPago(pago: PagoPrestamoResponseDTO): void {
    if (!pago.idPago) return;

    this.pagoSeleccionado = pago;
    this.correccion = {
      montoCorregido: pago.montoPagado ?? 0,
      motivo: ''
    };
    this.submitted = false;
    this.visible = true;
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
  }

  confirmarCorreccion(): void {
    this.submitted = true;

    if (!this.pagoSeleccionado?.idPago) return;

    if (this.correccion.montoCorregido === undefined || this.correccion.montoCorregido === null || this.correccion.montoCorregido <= 0) {
      this.enviarMensajeAdvertencia('El monto corregido debe ser mayor a 0');
      return;
    }
    if (!this.correccion.motivo || this.correccion.motivo.trim() === '') {
      this.enviarMensajeAdvertencia('El motivo es requerido');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro que desea corregir el pago #${this.pagoSeleccionado.idPago} a ${this.formatCurrency(this.correccion.montoCorregido)}?`,
      header: 'Confirmar Corrección de Pago',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.pagosService.corregirPago(this.correccion, this.pagoSeleccionado!.idPago!).subscribe({
          next: () => {
            this.enviarMensajeExito('Pago corregido correctamente');
            this.hideDialog();
            this.corregido.emit();
          },
          error: (error) => {
            console.error('Error corrigiendo pago:', error);
            this.enviarMensajeError(error.error?.message || 'No se pudo corregir el pago');
          }
        });
      }
    });
  }

  private getEmptyCorreccion(): CorregirPagoRequestDTO {
    return { montoCorregido: 0, motivo: '' };
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

  private enviarMensajeAdvertencia(detail: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail, life: 3000 });
  }
}

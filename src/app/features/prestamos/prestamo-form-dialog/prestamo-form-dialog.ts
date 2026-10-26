import { Component, EventEmitter, OnInit, Output, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { PrstamosService } from '../../../generated-api/api/prstamos.service';
import { ClienteControllerService } from '../../../generated-api/api/clienteController.service';
import { PrestamoRequestDTO } from '../../../generated-api/model/prestamoRequestDTO';
import { ClienteResponseDTO } from '../../../generated-api/model/clienteResponseDTO';

/**
 * Diálogo de "Nuevo préstamo", extraído de Prestamos para reutilizarlo también
 * en el hub de cliente (/clientes/:id). Igual que CuentaFormDialog, no declara
 * su propio MessageService: usa el del componente padre para que los toasts
 * salgan en el <p-toast/> de esa pantalla.
 */
@Component({
  selector: 'app-prestamo-form-dialog',
  imports: [CommonModule, FormsModule, DialogModule, SelectModule, InputNumberModule, InputTextModule, ButtonModule],
  providers: [PrstamosService, ClienteControllerService],
  templateUrl: './prestamo-form-dialog.html',
})
export class PrestamoFormDialog implements OnInit {

  private platformId = inject(PLATFORM_ID);

  @Output() guardado = new EventEmitter<void>();

  visible: boolean = false;
  prestamo: PrestamoRequestDTO = this.getEmptyPrestamo();
  submitted: boolean = false;

  /** Cuando está true, el formulario muestra el nombre del cliente como texto fijo en vez del dropdown. */
  clienteBloqueado: boolean = false;
  clienteBloqueadoNombre: string = '';

  clientesOptions: any[] = [];

  constructor(
    private messageService: MessageService,
    private prestamoService: PrstamosService,
    private clienteService: ClienteControllerService
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadClientes();
    }
  }

  loadClientes(): void {
    this.clienteService.obtenerClientesPorEstado('ACTIVO').subscribe({
      next: (data) => {
        this.clientesOptions = data.map(cliente => ({
          label: `${cliente.nombres} ${cliente.apellidos} - ${cliente.cedula}`,
          value: cliente.idCliente,
          searchText: `${cliente.nombres} ${cliente.apellidos} ${cliente.cedula}`.toLowerCase()
        }));
      },
      error: (error) => {
        console.error('Error loading clientes:', error);
      }
    });
  }

  /** Abre el diálogo. Si viene clientePreseleccionado (uso desde el hub), se fija y se bloquea el campo cliente. */
  abrirNuevo(clientePreseleccionado?: ClienteResponseDTO): void {
    this.prestamo = this.getEmptyPrestamo();
    this.submitted = false;
    this.clienteBloqueado = false;
    this.clienteBloqueadoNombre = '';

    if (clientePreseleccionado?.idCliente) {
      this.prestamo.idCliente = clientePreseleccionado.idCliente;
      this.clienteBloqueado = true;
      this.clienteBloqueadoNombre = `${clientePreseleccionado.nombres} ${clientePreseleccionado.apellidos} - ${clientePreseleccionado.cedula}`;
    }

    this.visible = true;
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
  }

  async savePrestamo(): Promise<void> {
    this.submitted = true;

    const camposVacios = this.validarCamposRequeridos();
    if (camposVacios.length > 0) {
      this.enviarMensajeAdvertencia(`Es obligatorio: ${camposVacios.join(', ')}`);
      return;
    }

    if (this.prestamo.montoSolicitado <= 0) {
      this.enviarMensajeAdvertencia('El monto solicitado debe ser mayor a 0');
      return;
    }

    if (this.prestamo.plazoMeses <= 0) {
      this.enviarMensajeAdvertencia('El plazo en meses debe ser mayor a 0');
      return;
    }

    this.prestamoService.solicitarPrestamo(this.prestamo).subscribe({
      next: () => {
        this.enviarMensajeExito('Préstamo solicitado correctamente');
        this.hideDialog();
        this.guardado.emit();
      },
      error: (error) => {
        this.enviarMensajeError('No se pudo solicitar el préstamo');
        console.error('Error creating prestamo:', error);
      }
    });
  }

  private validarCamposRequeridos(): string[] {
    const camposVacios: string[] = [];

    if (!this.prestamo.idCliente) {
      camposVacios.push('Cliente');
    }
    if (!this.prestamo.montoSolicitado || this.prestamo.montoSolicitado <= 0) {
      camposVacios.push('Monto Solicitado');
    }
    if (!this.prestamo.plazoMeses || this.prestamo.plazoMeses <= 0) {
      camposVacios.push('Plazo en Meses');
    }

    return camposVacios;
  }

  private getEmptyPrestamo(): PrestamoRequestDTO {
    return {
      idCliente: 0,
      montoSolicitado: 0,
      plazoMeses: 0,
      tipoPrestamo: 'PERSONAL'
    };
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

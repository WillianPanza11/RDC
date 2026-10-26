import { Component, EventEmitter, OnInit, Output, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { CuentaAhorroResponseDTO, CuentaAhorroRequestDTO } from '../../../generated-api';
import { CuentasDeAhorroService } from '../../../generated-api/api/cuentasDeAhorro.service';
import { ClienteControllerService } from '../../../generated-api/api/clienteController.service';
import { ClienteResponseDTO } from '../../../generated-api/model/clienteResponseDTO';
import { firstValueFrom } from 'rxjs';

/**
 * Diálogo de "Nueva/Editar cuenta", extraído de Cuentas para poder reutilizarlo
 * tanto en la pantalla de Cuentas como en el hub de cliente (/clientes/:id).
 * No lleva su propio MessageService en `providers`: se inyecta el del componente
 * padre (Cuentas o ClienteDetalle) para que los toasts salgan en el <p-toast/>
 * que ya existe en esa pantalla.
 */
@Component({
  selector: 'app-cuenta-form-dialog',
  imports: [CommonModule, FormsModule, DialogModule, SelectModule, InputTextModule, ButtonModule],
  providers: [CuentasDeAhorroService, ClienteControllerService],
  templateUrl: './cuenta-form-dialog.html',
})
export class CuentaFormDialog implements OnInit {

  private platformId = inject(PLATFORM_ID);

  @Output() guardado = new EventEmitter<void>();

  visible: boolean = false;
  cuenta: CuentaAhorroRequestDTO = this.getEmptyCuenta();
  cuentaId?: number;
  submitted: boolean = false;

  /** Cuando está true, el formulario muestra el nombre del cliente como texto fijo en vez del dropdown. */
  clienteBloqueado: boolean = false;
  clienteBloqueadoNombre: string = '';

  clientes: ClienteResponseDTO[] = [];
  estados: any[] = [];
  tiposCuenta: any[] = [];
  selectedEstado: string | undefined;
  estadoOriginal: string | undefined;

  constructor(
    private messageService: MessageService,
    private cuentaService: CuentasDeAhorroService,
    private clienteService: ClienteControllerService
  ) { }

  ngOnInit(): void {
    this.estados = [
      { label: 'Activo', value: 'ACTIVO' },
      { label: 'Inactivo', value: 'INACTIVO' },
      { label: 'Bloqueado', value: 'BLOQUEADO' },
      { label: 'Suspendido', value: 'SUSPENDIDO' }
    ];
    this.tiposCuenta = [
      { label: 'Ahorro', value: 'AHORRO' },
      { label: 'Corriente', value: 'CORRIENTE' }
    ];

    if (isPlatformBrowser(this.platformId)) {
      this.loadClientes();
    }
  }

  loadClientes(): void {
    this.clienteService.obtenerTodosLosClientes().subscribe({
      next: (data) => {
        this.clientes = data.filter(c => c.estado === 'ACTIVO');
      },
      error: (error) => {
        console.error('Error loading clientes:', error);
      }
    });
  }

  /** Abre el diálogo en modo creación. Si viene clientePreseleccionado (uso desde el hub), se fija y se bloquea el campo cliente. */
  abrirNuevo(clientePreseleccionado?: ClienteResponseDTO): void {
    this.cuenta = this.getEmptyCuenta();
    this.cuentaId = undefined;
    this.selectedEstado = undefined;
    this.estadoOriginal = undefined;
    this.submitted = false;
    this.clienteBloqueado = false;
    this.clienteBloqueadoNombre = '';

    if (clientePreseleccionado?.idCliente) {
      this.cuenta.idCliente = clientePreseleccionado.idCliente;
      this.clienteBloqueado = true;
      this.clienteBloqueadoNombre = this.formatearNombreCliente(clientePreseleccionado);
    }

    this.visible = true;
  }

  abrirEditar(cuenta: CuentaAhorroResponseDTO): void {
    this.cuenta = {
      idCliente: cuenta.idCliente || 0,
      numeroCuenta: cuenta.numeroCuenta || '',
      saldoActual: cuenta.saldoActual || 0,
      tasaInteres: cuenta.tasaInteres,
      tipoCuenta: cuenta.tipoCuenta || ''
    };
    this.cuentaId = cuenta.idCuenta;
    this.estadoOriginal = cuenta.estado;
    this.selectedEstado = cuenta.estado;
    this.clienteBloqueado = true;
    // La cuenta ya trae el nombre del cliente (nombreCliente); no hace falta buscarlo en la lista cargada.
    this.clienteBloqueadoNombre = cuenta.nombreCliente || this.getClienteNombre(cuenta.idCliente);
    this.visible = true;
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
    this.selectedEstado = undefined;
    this.estadoOriginal = undefined;
  }

  private actualizarEstadoCuenta(id: number, estado: string): void {
    const request = estado === 'ACTIVO'
      ? this.cuentaService.activarCuenta(id)
      : this.cuentaService.desactivarCuenta(id);

    if (estado === 'ACTIVO' || estado === 'INACTIVO') {
      request.subscribe({
        next: () => {
          this.enviarMensajeExito('Cuenta actualizada correctamente');
          this.hideDialog();
          this.guardado.emit();
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo actualizar el estado de la cuenta');
          console.error('Error updating estado:', error);
        }
      });
    } else {
      this.enviarMensajeInfo(`El cambio de estado a ${estado} requiere configuración adicional en el backend. Los datos de la cuenta se actualizaron correctamente.`);
      this.hideDialog();
      this.guardado.emit();
    }
  }

  async saveCuenta(): Promise<void> {
    this.submitted = true;

    const camposVacios = this.validarCamposRequeridos();
    if (camposVacios.length > 0) {
      this.enviarMensajeAdvertencia(`Es obligatorio: ${camposVacios.join(', ')}`);
      return;
    }

    if (this.cuentaId) {
      this.cuentaService.actualizarCuenta(this.cuenta, this.cuentaId).subscribe({
        next: () => {
          const nuevoEstado = this.selectedEstado;
          const estadoCambio = nuevoEstado && nuevoEstado !== this.estadoOriginal;

          if (estadoCambio) {
            this.actualizarEstadoCuenta(this.cuentaId!, nuevoEstado);
          } else {
            this.enviarMensajeExito('Cuenta actualizada correctamente');
            this.hideDialog();
            this.guardado.emit();
          }
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo actualizar la cuenta');
          console.error('Error updating cuenta:', error);
        }
      });
    } else {
      const numeroCuentaExiste = await this.validarNumeroCuentaExistente(this.cuenta.numeroCuenta);
      if (numeroCuentaExiste) {
        this.enviarMensajeError('Ya existe una cuenta con este número');
        return;
      }

      this.cuenta.numeroCuenta = '0000000';
      this.cuentaService.crearCuenta(this.cuenta).subscribe({
        next: () => {
          this.enviarMensajeExito('Cuenta creada correctamente');
          this.hideDialog();
          this.guardado.emit();
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo crear la cuenta');
          console.error('Error creating cuenta:', error);
        }
      });
    }
  }

  private getEmptyCuenta(): CuentaAhorroRequestDTO {
    return {
      idCliente: 0,
      numeroCuenta: '',
      saldoActual: 0,
      tasaInteres: 0,
      tipoCuenta: ''
    };
  }

  private validarCamposRequeridos(): string[] {
    const camposVacios: string[] = [];

    if (!this.cuenta.idCliente || this.cuenta.idCliente === 0) {
      camposVacios.push('Cliente');
    }
    if (this.cuenta.saldoActual === undefined || this.cuenta.saldoActual < 0) {
      camposVacios.push('Saldo Actual');
    }
    if (!this.cuenta.tipoCuenta || this.cuenta.tipoCuenta.trim() === '') {
      camposVacios.push('Tipo de Cuenta');
    }

    return camposVacios;
  }

  private async validarNumeroCuentaExistente(numeroCuenta: string): Promise<boolean> {
    try {
      const cuenta = await firstValueFrom(this.cuentaService.obtenerCuentaPorNumero(numeroCuenta));
      return cuenta ? true : false;
    } catch (error) {
      return false;
    }
  }

  getClienteNombre(idCliente?: number): string {
    if (!idCliente) return '';
    const cliente = this.clientes.find(c => c.idCliente === idCliente);
    return cliente ? this.formatearNombreCliente(cliente) : '';
  }

  private formatearNombreCliente(cliente: ClienteResponseDTO): string {
    return `${cliente.nombres} ${cliente.apellidos} - ${cliente.cedula}`;
  }

  soloNumerosConDecimales(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    const char = String.fromCharCode(charCode);

    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1 ||
      (charCode === 65 && event.ctrlKey === true) ||
      (charCode === 67 && event.ctrlKey === true) ||
      (charCode === 86 && event.ctrlKey === true) ||
      (charCode === 88 && event.ctrlKey === true) ||
      (charCode >= 35 && charCode <= 39)) {
      return true;
    }

    if ((charCode >= 48 && charCode <= 57) || (charCode >= 96 && charCode <= 105) || charCode === 190 || charCode === 110) {
      const input = event.target as HTMLInputElement;
      if ((char === '.' || charCode === 190 || charCode === 110) && input.value.indexOf('.') !== -1) {
        event.preventDefault();
        return false;
      }
      return true;
    }

    event.preventDefault();
    return false;
  }

  limpiarSoloNumeros(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorOriginal = input.value;
    const normalizado = valorOriginal.replace(/,/g, '.');
    const valorConDecimales = normalizado.replace(/[^0-9.]/g, '');
    const partes = valorConDecimales.split('.');
    let valorLimpio = valorConDecimales;
    if (partes.length > 2) {
      valorLimpio = partes[0] + '.' + partes.slice(1).join('');
    }
    if (valorOriginal !== valorLimpio) {
      input.value = valorLimpio;
    }

    const numero = parseFloat(valorLimpio);
    if (input.id === 'saldoActual') {
      this.cuenta.saldoActual = numero || 0;
    } else if (input.id === 'tasaInteres') {
      this.cuenta.tasaInteres = numero || 0;
    }
  }

  private enviarMensajeError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 3000 });
  }

  private enviarMensajeExito(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail, life: 3000 });
  }

  private enviarMensajeAdvertencia(detail: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail, life: 3000 });
  }

  private enviarMensajeInfo(detail: string): void {
    this.messageService.add({ severity: 'info', summary: 'Info', detail, life: 3000 });
  }
}

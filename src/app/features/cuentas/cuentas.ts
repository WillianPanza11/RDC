import { Component, OnInit, ViewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Header } from "../header/header";
import { Toast } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { Table, TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { Tag } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ConfirmDialog, ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { CuentaAhorroResponseDTO, CuentaAhorroRequestDTO } from '../../generated-api';
import { CuentasDeAhorroService } from '../../generated-api/api/cuentasDeAhorro.service';
import { ClienteControllerService } from '../../generated-api/api/clienteController.service';
import { TransaccionesDeAhorroService } from '../../generated-api/api/transaccionesDeAhorro.service';
import { ClienteResponseDTO } from '../../generated-api/model/clienteResponseDTO';
import { TransaccionAhorroRequestDTO } from '../../generated-api/model/transaccionAhorroRequestDTO';
import { firstValueFrom } from 'rxjs';

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-cuentas',
  imports: [
    CommonModule, Header, Toast, ButtonModule, ToolbarModule, TableModule, IconFieldModule, InputTextModule,
    InputIconModule, Tag, DialogModule, SelectModule, FormsModule, MessageModule, ConfirmDialog, ConfirmDialogModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService, CuentasDeAhorroService, ClienteControllerService, TransaccionesDeAhorroService],
  templateUrl: './cuentas.html',
  styleUrl: './cuentas.css',
})
export class Cuentas implements OnInit {

  cuentaDialog: boolean = false;
  cuentas: CuentaAhorroResponseDTO[] = [];
  cuenta: CuentaAhorroRequestDTO = this.getEmptyCuenta();
  cuentaId?: number;
  selectedCuentas: CuentaAhorroResponseDTO[] = [];
  submitted: boolean = false;

  @ViewChild('dt') dt!: Table;
  cols: Column[] = [];

  //Seleccion de estado
  estados: any[] = [];
  selectedEstado: string | undefined;
  estadoOriginal: string | undefined;

  // Lista de clientes para el selector
  clientes: ClienteResponseDTO[] = [];
  tiposCuenta: any[] = [];

  // Diálogo de transacciones
  transaccionDialog: boolean = false;
  transaccion: TransaccionAhorroRequestDTO = this.getEmptyTransaccion();
  cuentaSeleccionada?: CuentaAhorroResponseDTO;
  tiposTransaccion: any[] = [];
  metodosPago: any[] = [];
  transaccionSubmitted: boolean = false;

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cuentaService: CuentasDeAhorroService,
    private clienteService: ClienteControllerService,
    private transaccionService: TransaccionesDeAhorroService,
    private router: Router
  ) {
    // Ejecutar loadCuentas solo en el navegador (después de la hidratación SSR)
    afterNextRender(() => {
      this.loadCuentas();
      this.loadClientes();
    });
  }

  ngOnInit(): void {
    this.initializeEstados();
    this.initializeTiposCuenta();
    this.initializeTiposTransaccion();
    this.initializeMetodosPago();
    this.initializeColumns();
  }

  private initializeEstados(): void {
    this.estados = [
      { label: 'Activo', value: 'ACTIVO' },
      { label: 'Inactivo', value: 'INACTIVO' },
      { label: 'Bloqueado', value: 'BLOQUEADO' },
      { label: 'Suspendido', value: 'SUSPENDIDO' }
    ];
  }

  private initializeTiposCuenta(): void {
    this.tiposCuenta = [
      //AHORRO o CORRIENTE
      { label: 'Ahorro', value: 'AHORRO' },
      { label: 'Corriente', value: 'CORRIENTE' }
    ];
  }

  private initializeTiposTransaccion(): void {
    this.tiposTransaccion = [
      { label: 'Depósito', value: 'DEPOSITO' },
      { label: 'Retiro', value: 'RETIRO' }
    ];
  }

  private initializeMetodosPago(): void {
    this.metodosPago = [
      { label: 'Efectivo', value: 'EFECTIVO' },
      { label: 'Transferencia', value: 'TRANSFERENCIA' },
      { label: 'Cheque', value: 'CHEQUE' },
      { label: 'Tarjeta', value: 'TARJETA' }
    ];
  }

  private initializeColumns(): void {
    this.cols = [
      { field: 'numeroCuenta', header: 'Número de Cuenta' },
      { field: 'nombreCliente', header: 'Cliente' },
      { field: 'tipoCuenta', header: 'Tipo de Cuenta' },
      { field: 'saldoActual', header: 'Saldo Actual' },
      { field: 'tasaInteres', header: 'Tasa de Interés' },
      { field: 'estado', header: 'Estado' },
      { field: 'fechaApertura', header: 'Fecha de Apertura' }
    ];
  }

  loadCuentas(): void {
    this.cuentaService.obtenerTodasLasCuentas().subscribe({
      next: (data) => {
        this.cuentas = data;
        console.log(this.cuentas);
      },
      error: (error) => {
        this.enviarMensajeError('No se pudieron cargar las cuentas');
        console.error('Error loading cuentas:', error);
      }
    });
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

  openNew(): void {
    this.cuenta = this.getEmptyCuenta();
    this.cuentaId = undefined;
    this.selectedEstado = undefined;
    this.estadoOriginal = undefined;
    this.submitted = false;
    this.cuentaDialog = true;
  }

  editCuenta(cuenta: CuentaAhorroResponseDTO): void {
    this.cuenta = {
      idCliente: cuenta.idCliente || 0,
      numeroCuenta: cuenta.numeroCuenta || '',
      saldoActual: cuenta.saldoActual || 0,
      tasaInteres: cuenta.tasaInteres,
      tipoCuenta: cuenta.tipoCuenta || ''
    };
    this.cuentaId = cuenta.idCuenta;
    // Cargar el estado actual de la cuenta
    this.estadoOriginal = cuenta.estado;
    this.selectedEstado = cuenta.estado;
    this.cuentaDialog = true;
  }

  hideDialog(): void {
    this.cuentaDialog = false;
    this.submitted = false;
    this.selectedEstado = undefined;
    this.estadoOriginal = undefined;
  }

  actualizarEstadoCuenta(id: number, estado: string): void {
    // Usar el endpoint apropiado según el estado
    if (estado === 'ACTIVO') {
      this.cuentaService.activarCuenta(id).subscribe({
        next: () => {
          this.loadCuentas();
          this.enviarMensajeExito('Cuenta actualizada correctamente');
          this.cuentaDialog = false;
          this.cuenta = this.getEmptyCuenta();
          this.selectedEstado = undefined;
          this.estadoOriginal = undefined;
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo actualizar el estado de la cuenta');
          console.error('Error updating estado:', error);
        }
      });
    } else if (estado === 'INACTIVO') {
      this.cuentaService.desactivarCuenta(id).subscribe({
        next: () => {
          this.loadCuentas();
          this.enviarMensajeExito('Cuenta actualizada correctamente');
          this.cuentaDialog = false;
          this.cuenta = this.getEmptyCuenta();
          this.selectedEstado = undefined;
          this.estadoOriginal = undefined;
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo actualizar el estado de la cuenta');
          console.error('Error updating estado:', error);
        }
      });
    } else {
      // Para BLOQUEADO y SUSPENDIDO, no hay endpoints específicos disponibles
      this.enviarMensajeInfo(`El cambio de estado a ${estado} requiere configuración adicional en el backend. Los datos de la cuenta se actualizaron correctamente.`);
      this.loadCuentas();
      this.cuentaDialog = false;
      this.cuenta = this.getEmptyCuenta();
      this.selectedEstado = undefined;
      this.estadoOriginal = undefined;
    }
  }

  async saveCuenta(): Promise<void> {
    this.submitted = true;

    //Validar campos requeridos
    const camposVacios = this.ValidarCamposRequeridos();
    if (camposVacios.length > 0) {
      this.enviarMensajeAdvertencia(`Es obligatorio: ${camposVacios.join(', ')}`);
      return;
    }

    if (this.cuentaId) {
      // Actualizar cuenta existente
      this.cuentaService.actualizarCuenta(this.cuenta, this.cuentaId).subscribe({
        next: (response) => {
          // Verificar si el estado cambió
          const nuevoEstado = this.selectedEstado;
          const estadoCambio = nuevoEstado && nuevoEstado !== this.estadoOriginal;

          if (estadoCambio) {
            // Si el estado cambió, actualizarlo usando el endpoint correspondiente
            this.actualizarEstadoCuenta(this.cuentaId!, nuevoEstado);
          } else {
            // Si no cambió el estado, solo actualizar los datos
            const index = this.cuentas.findIndex(c => c.idCuenta === this.cuentaId);
            if (index !== -1) {
              this.cuentas[index] = response;
            }
            this.enviarMensajeExito('Cuenta actualizada correctamente');
            this.cuentaDialog = false;
            this.cuenta = this.getEmptyCuenta();
            this.selectedEstado = undefined;
            this.estadoOriginal = undefined;
          }
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo actualizar la cuenta');
          console.error('Error updating cuenta:', error);
        }
      });
    } else {
      //Validar si el número de cuenta existe
      const numeroCuentaExiste = await this.ValidarNumeroCuentaExistente(this.cuenta.numeroCuenta);
      if (numeroCuentaExiste) {
        this.enviarMensajeError('Ya existe una cuenta con este número');
        return;
      }

      // Crear nueva cuenta
      this.cuenta.numeroCuenta = "0000000";
      this.cuentaService.crearCuenta(this.cuenta).subscribe({
        next: (response) => {
          this.cuentas.push(response);
          this.enviarMensajeExito('Cuenta creada correctamente');
          this.cuentaDialog = false;
          this.cuenta = this.getEmptyCuenta();
          this.selectedEstado = undefined;
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo crear la cuenta');
          console.error('Error creating cuenta:', error);
        }
      });
    }
  }

  deleteCuenta(cuenta: CuentaAhorroResponseDTO): void {
    this.confirmationService.confirm({
      message: `¿Está seguro que desea desactivar la cuenta ${cuenta.numeroCuenta}?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (cuenta.idCuenta) {
          this.cuentaService.desactivarCuenta(cuenta.idCuenta).subscribe({
            next: () => {
              this.loadCuentas();
              this.enviarMensajeExito('Cuenta desactivada correctamente');
            },
            error: (error) => {
              this.enviarMensajeError('No se pudo desactivar la cuenta');
              console.error('Error deleting cuenta:', error);
            }
          });
        }
      }
    });
  }

  getSeverity(estado?: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    switch (estado) {
      case 'ACTIVO':
        return 'success';
      case 'INACTIVO':
        return 'secondary';
      case 'BLOQUEADO':
        return 'danger';
      case 'SUSPENDIDO':
        return 'warn';
      default:
        return 'info';
    }
  }

  exportCSV(): void {
    this.dt.exportCSV();
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

  //Validar campos requeridos
  ValidarCamposRequeridos(): string[] {
    const camposVacios: string[] = [];

    if (!this.cuenta.idCliente || this.cuenta.idCliente === 0) {
      camposVacios.push('Cliente');
    }
    /*if (!this.cuenta.numeroCuenta || this.cuenta.numeroCuenta.trim() === '') {
      camposVacios.push('Número de Cuenta');
    }*/
    if (this.cuenta.saldoActual === undefined || this.cuenta.saldoActual < 0) {
      camposVacios.push('Saldo Actual');
    }
    if (!this.cuenta.tipoCuenta || this.cuenta.tipoCuenta.trim() === '') {
      camposVacios.push('Tipo de Cuenta');
    }

    return camposVacios;
  }

  //Validar si existe el número de cuenta
  async ValidarNumeroCuentaExistente(numeroCuenta: string): Promise<boolean> {
    try {
      const cuenta = await firstValueFrom(this.cuentaService.obtenerCuentaPorNumero(numeroCuenta));
      return cuenta ? true : false;
    } catch (error) {
      // Si da error 404, significa que no existe
      return false;
    }
  }

  // Métodos para validar entrada en tiempo real
  soloNumeros(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;

    // Permitir: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1 ||
      // Permitir: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (charCode === 65 && event.ctrlKey === true) ||
      (charCode === 67 && event.ctrlKey === true) ||
      (charCode === 86 && event.ctrlKey === true) ||
      (charCode === 88 && event.ctrlKey === true) ||
      // Permitir: home, end, left, right
      (charCode >= 35 && charCode <= 39)) {
      return true;
    }

    // Asegurar que es un número y detener el keypress
    // Permitir números del teclado principal (48-57) y del numpad (96-105)
    if ((event.shiftKey || (charCode < 48 || charCode > 57)) && (charCode < 96 || charCode > 105)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  limpiarSoloNumeros(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorOriginal = input.value;

    // Actualizar el modelo según el campo
    if (input.id === 'monto' || input.id === 'saldoActual' || input.id === 'tasaInteres') {
      // Permitir decimales (aceptar "." y también "," convirtiéndola a ".")
      const normalizado = valorOriginal.replace(/,/g, '.');
      const valorConDecimales = normalizado.replace(/[^0-9.]/g, '');
      // Permitir solo un punto decimal
      const partes = valorConDecimales.split('.');
      let valorLimpio = valorConDecimales;
      if (partes.length > 2) {
        valorLimpio = partes[0] + '.' + partes.slice(1).join('');
      }
      if (valorOriginal !== valorLimpio) {
        input.value = valorLimpio;
      }

      const numero = parseFloat(valorLimpio);
      if (input.id === 'monto') {
        this.transaccion.monto = numero || 0;
      } else if (input.id === 'saldoActual') {
        this.cuenta.saldoActual = numero || 0;
      } else if (input.id === 'tasaInteres') {
        this.cuenta.tasaInteres = numero || 0;
      }
    } else {
      // Para otros campos, solo números enteros
      const valorLimpio = valorOriginal.replace(/[^0-9]/g, '');
      if (valorOriginal !== valorLimpio) {
        input.value = valorLimpio;
      }

      if (input.id === 'numeroCuenta') {
        this.cuenta.numeroCuenta = valorLimpio;
      } else if (input.id === 'saldoActual') {
        this.cuenta.saldoActual = parseFloat(valorLimpio) || 0;
      } else if (input.id === 'tasaInteres') {
        this.cuenta.tasaInteres = parseFloat(valorLimpio) || 0;
      }
    }
  }

  soloNumerosConDecimales(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    const char = String.fromCharCode(charCode);

    // Permitir: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1 ||
      // Permitir: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (charCode === 65 && event.ctrlKey === true) ||
      (charCode === 67 && event.ctrlKey === true) ||
      (charCode === 86 && event.ctrlKey === true) ||
      (charCode === 88 && event.ctrlKey === true) ||
      // Permitir: home, end, left, right
      (charCode >= 35 && charCode <= 39)) {
      return true;
    }

    // Permitir números y punto decimal
    if ((charCode >= 48 && charCode <= 57) || (charCode >= 96 && charCode <= 105) || charCode === 190 || charCode === 110) {
      // Verificar que solo haya un punto decimal
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

  //envio de mensajes de advertencia
  enviarMensajeAdvertencia(detail: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Advertencia',
      detail: detail,
      life: 3000
    });
  }

  //envio de mensajes de información
  enviarMensajeInfo(detail: string): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: detail,
      life: 3000
    });
  }

  // Obtener nombre del cliente para mostrar en el selector
  getClienteNombre(idCliente?: number): string {
    if (!idCliente) return '';
    const cliente = this.clientes.find(c => c.idCliente === idCliente);
    return cliente ? `${cliente.nombres} ${cliente.apellidos} - ${cliente.cedula}` : '';
  }

  // Métodos para transacciones
  generarTransaccion(cuenta: CuentaAhorroResponseDTO): void {
    this.cuentaSeleccionada = cuenta;
    this.transaccion = this.getEmptyTransaccion();
    this.transaccion.idCuenta = cuenta.idCuenta || 0;
    this.transaccionSubmitted = false;
    this.transaccionDialog = true;
  }

  hideTransaccionDialog(): void {
    this.transaccionDialog = false;
    this.transaccionSubmitted = false;
    this.transaccion = this.getEmptyTransaccion();
    this.cuentaSeleccionada = undefined;
  }

  private getEmptyTransaccion(): TransaccionAhorroRequestDTO {
    return {
      idCuenta: 0,
      descripcion: '',
      monto: 0,
      tipoTransaccion: '',
      metodoPago: undefined
    };
  }

  async saveTransaccion(): Promise<void> {
    this.transaccionSubmitted = true;

    // Validar campos requeridos
    const camposVacios = this.ValidarCamposTransaccion();
    if (camposVacios.length > 0) {
      this.enviarMensajeAdvertencia(`Es obligatorio: ${camposVacios.join(', ')}`);
      return;
    }

    // Validar que el monto sea mayor a 0
    if (this.transaccion.monto <= 0) {
      this.enviarMensajeAdvertencia('El monto debe ser mayor a 0');
      return;
    }

    // Validar que si es retiro, el saldo sea suficiente
    if (this.transaccion.tipoTransaccion === 'RETIRO' && this.cuentaSeleccionada) {
      if (this.transaccion.monto > (this.cuentaSeleccionada.saldoActual || 0)) {
        this.enviarMensajeError('El monto del retiro excede el saldo disponible');
        return;
      }
    }

    // Realizar la transacción según el tipo
    if (this.transaccion.tipoTransaccion === 'DEPOSITO') {
      this.transaccionService.realizarDeposito(this.transaccion).subscribe({
        next: (response) => {
          this.enviarMensajeExito('Depósito realizado correctamente');
          this.loadCuentas(); // Recargar cuentas para actualizar saldos
          this.hideTransaccionDialog();
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo realizar el depósito');
          console.error('Error realizando depósito:', error);
        }
      });
    } else if (this.transaccion.tipoTransaccion === 'RETIRO') {
      this.transaccionService.realizarRetiro(this.transaccion).subscribe({
        next: (response) => {
          this.enviarMensajeExito('Retiro realizado correctamente');
          this.loadCuentas(); // Recargar cuentas para actualizar saldos
          this.hideTransaccionDialog();
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo realizar el retiro');
          console.error('Error realizando retiro:', error);
        }
      });
    }
  }

  ValidarCamposTransaccion(): string[] {
    const camposVacios: string[] = [];

    if (!this.transaccion.tipoTransaccion || this.transaccion.tipoTransaccion.trim() === '') {
      camposVacios.push('Tipo de Transacción');
    }
    if (!this.transaccion.monto || this.transaccion.monto <= 0) {
      camposVacios.push('Monto');
    }
    if (!this.transaccion.descripcion || this.transaccion.descripcion.trim() === '') {
      camposVacios.push('Descripción');
    }

    return camposVacios;
  }

  transaccionesRealizadas(cuentaId: number): void {
    // Navegar a transacciones realizadas con el cuentaId como query param
    // El componente de transacciones-realizadas cargará automáticamente solo las transacciones de esa cuenta
    if (cuentaId) {
      this.router.navigate(['/transacciones-realizadas'], { queryParams: { cuentaId: cuentaId } });
    } else {
      this.enviarMensajeError('No se pudo identificar la cuenta');
    }
  }
}

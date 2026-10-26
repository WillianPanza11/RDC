import { Component, OnInit, ViewChild, PLATFORM_ID, inject } from '@angular/core';
import { CuentaFormDialog } from './cuenta-form-dialog/cuenta-form-dialog';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
import { CuentaAhorroResponseDTO } from '../../generated-api';
import { CuentasDeAhorroService } from '../../generated-api/api/cuentasDeAhorro.service';
import { TransaccionesDeAhorroService } from '../../generated-api/api/transaccionesDeAhorro.service';
import { TransaccionAhorroRequestDTO } from '../../generated-api/model/transaccionAhorroRequestDTO';

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-cuentas',
  imports: [
    CommonModule, Header, Toast, ButtonModule, ToolbarModule, TableModule, IconFieldModule, InputTextModule,
    InputIconModule, Tag, DialogModule, SelectModule, FormsModule, MessageModule, ConfirmDialog, ConfirmDialogModule,
    TooltipModule, CuentaFormDialog
  ],
  providers: [MessageService, ConfirmationService, CuentasDeAhorroService, TransaccionesDeAhorroService],
  templateUrl: './cuentas.html',
  styleUrl: './cuentas.css',
})
export class Cuentas implements OnInit {

  private platformId = inject(PLATFORM_ID);

  cuentas: CuentaAhorroResponseDTO[] = [];
  selectedCuentas: CuentaAhorroResponseDTO[] = [];
  cargando: boolean = true;

  @ViewChild('dt') dt!: Table;
  @ViewChild(CuentaFormDialog) cuentaFormDialog!: CuentaFormDialog;
  cols: Column[] = [];

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
    private transaccionService: TransaccionesDeAhorroService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeTiposTransaccion();
    this.initializeMetodosPago();
    this.initializeColumns();

    if (isPlatformBrowser(this.platformId)) {
      this.loadCuentas();
    }
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
    this.cargando = true;
    this.cuentaService.obtenerTodasLasCuentas().subscribe({
      next: (data) => {
        this.cuentas = this.ordenarPorRecientes(data);
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.enviarMensajeError('No se pudieron cargar las cuentas');
        console.error('Error loading cuentas:', error);
      }
    });
  }

  /**
   * Ordena por la fecha más reciente: ultimaActualizacion si existe (cubre tanto
   * crear como editar), y si no, fechaApertura. Así el registro más nuevo o el
   * último editado siempre queda en la primera fila.
   */
  private ordenarPorRecientes(cuentas: CuentaAhorroResponseDTO[]): CuentaAhorroResponseDTO[] {
    const fechaOrden = (cuenta: CuentaAhorroResponseDTO): number => {
      const fecha = cuenta.ultimaActualizacion ?? cuenta.fechaApertura;
      return fecha ? new Date(fecha).getTime() : 0;
    };
    return [...cuentas].sort((a, b) => fechaOrden(b) - fechaOrden(a));
  }

  openNew(): void {
    this.cuentaFormDialog.abrirNuevo();
  }

  editCuenta(cuenta: CuentaAhorroResponseDTO): void {
    this.cuentaFormDialog.abrirEditar(cuenta);
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

    if (input.id === 'monto') {
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

      this.transaccion.monto = parseFloat(valorLimpio) || 0;
    } else {
      // Para otros campos, solo números enteros
      const valorLimpio = valorOriginal.replace(/[^0-9]/g, '');
      if (valorOriginal !== valorLimpio) {
        input.value = valorLimpio;
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
          this.enviarMensajeError(error.error?.message || 'No se pudo realizar el depósito');
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
          this.enviarMensajeError(error.error?.message || 'No se pudo realizar el retiro');
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

  // Fase 2: navegar al hub del cliente dueño de la cuenta. El DTO ya trae idCliente, no hace falta resolverlo.
  verCliente(cuenta: CuentaAhorroResponseDTO): void {
    if (cuenta.idCliente) {
      this.router.navigate(['/clientes', cuenta.idCliente], { queryParams: { origen: 'cuentas' } });
    } else {
      this.enviarMensajeError('No se pudo identificar al cliente de la cuenta');
    }
  }
}

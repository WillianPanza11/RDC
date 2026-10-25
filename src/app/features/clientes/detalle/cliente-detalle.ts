import { Component, OnInit, ViewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Header } from '../../header/header';
import { Toast } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialog, ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

import { CuentaFormDialog } from '../../cuentas/cuenta-form-dialog/cuenta-form-dialog';
import { PrestamoFormDialog } from '../../prestamos/prestamo-form-dialog/prestamo-form-dialog';
import { PagoFormDialog } from '../../prestamos/pago-form-dialog/pago-form-dialog';

import { ClienteControllerService } from '../../../generated-api/api/clienteController.service';
import { CuentasDeAhorroService } from '../../../generated-api/api/cuentasDeAhorro.service';
import { PrstamosService } from '../../../generated-api/api/prstamos.service';
import { PagosDePrstamosService } from '../../../generated-api/api/pagosDePrstamos.service';
import { TransaccionesDeAhorroService } from '../../../generated-api/api/transaccionesDeAhorro.service';

import { ClienteRequestDTO } from '../../../generated-api/model/clienteRequestDTO';
import { ClienteResponseDTO } from '../../../generated-api/model/clienteResponseDTO';
import { ClienteEnMoraDTO } from '../../../generated-api/model/clienteEnMoraDTO';
import { CuentaAhorroResponseDTO } from '../../../generated-api/model/cuentaAhorroResponseDTO';
import { PrestamoResponseDTO } from '../../../generated-api/model/prestamoResponseDTO';
import { PagoPrestamoResponseDTO } from '../../../generated-api/model/pagoPrestamoResponseDTO';
import { AmortizacionDTO } from '../../../generated-api/model/amortizacionDTO';
import { TransaccionAhorroResponseDTO } from '../../../generated-api/model/transaccionAhorroResponseDTO';

import { ValidationService } from '../../../core/services/validation.service';

/**
 * Hub de cliente (/clientes/:id): centraliza en una sola pantalla la info
 * personal, cuentas, préstamos, pagos y transacciones de un cliente.
 * Cada pestaña carga sus datos ya filtrados por idCliente usando los
 * servicios generados existentes (obtenerCuentasPorCliente, etc.). La
 * pestaña de Transacciones es la única sin endpoint "por cliente" en el
 * backend: se arma pidiendo las transacciones de cada cuenta del cliente.
 */
/** Fase 2: mapea el queryParam ?origen=... a la tabla global desde la que se llegó al hub. */
const ORIGENES: { [key: string]: { label: string; path: string } } = {
  clientes: { label: 'Clientes', path: '/clientes' },
  cuentas: { label: 'Cuentas', path: '/cuentas' },
  prestamos: { label: 'Préstamos', path: '/prestamos' },
  pagos: { label: 'Pagos', path: '/pagos' },
  'transacciones-realizadas': { label: 'Transacciones Realizadas', path: '/transacciones-realizadas' },
  'en-mora': { label: 'Cartera Vencida', path: '/clientes/en-mora' }
};

@Component({
  selector: 'app-cliente-detalle',
  imports: [
    CommonModule, FormsModule, Header, Toast, ButtonModule, TableModule, DialogModule, TabsModule, Tag,
    SelectModule, InputTextModule, MessageModule, ConfirmDialog, ConfirmDialogModule, TooltipModule,
    CuentaFormDialog, PrestamoFormDialog, PagoFormDialog
  ],
  providers: [
    MessageService, ConfirmationService, ClienteControllerService, CuentasDeAhorroService,
    PrstamosService, PagosDePrstamosService, TransaccionesDeAhorroService
  ],
  templateUrl: './cliente-detalle.html',
  styleUrl: './cliente-detalle.css',
})
export class ClienteDetalle implements OnInit {

  idCliente!: number;

  // Fase 2: de dónde vino el usuario, para el breadcrumb "Volver a [módulo]"
  origenLabel: string = ORIGENES['clientes'].label;
  private origenPath: string = ORIGENES['clientes'].path;
  cliente?: ClienteResponseDTO;
  cargandoCliente: boolean = true;

  // Alerta de cartera vencida: si el cliente actual aparece en /api/clientes/en-mora, se muestra
  // como p-tag rojo junto al nombre, apenas se carga la ficha.
  clienteEnMora?: ClienteEnMoraDTO;

  // Pestaña Info (edición)
  editandoInfo: boolean = false;
  submittedInfo: boolean = false;
  infoForm: ClienteRequestDTO = this.getEmptyInfoForm();
  estados: any[] = [];
  selectedEstado: string | undefined;
  estadoOriginal: string | undefined;

  // Pestaña Cuentas
  cuentas: CuentaAhorroResponseDTO[] = [];
  cargandoCuentas: boolean = true;

  // Pestaña Préstamos
  prestamos: PrestamoResponseDTO[] = [];
  cargandoPrestamos: boolean = true;

  // Pestaña Pagos
  pagos: PagoPrestamoResponseDTO[] = [];
  cargandoPagos: boolean = true;

  // Pestaña Transacciones
  transacciones: TransaccionAhorroResponseDTO[] = [];
  cargandoTransacciones: boolean = true;

  @ViewChild(CuentaFormDialog) cuentaFormDialog!: CuentaFormDialog;
  @ViewChild(PrestamoFormDialog) prestamoFormDialog!: PrestamoFormDialog;
  @ViewChild(PagoFormDialog) pagoFormDialog!: PagoFormDialog;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private clienteService: ClienteControllerService,
    private cuentaService: CuentasDeAhorroService,
    private prestamoService: PrstamosService,
    private pagosService: PagosDePrstamosService,
    private transaccionService: TransaccionesDeAhorroService,
    private validationService: ValidationService
  ) {
    afterNextRender(() => {
      const idParam = this.route.snapshot.paramMap.get('id');
      const id = Number(idParam);
      if (!idParam || Number.isNaN(id) || id <= 0) {
        this.enviarMensajeError('Cliente no válido');
        this.router.navigate(['/clientes']);
        return;
      }
      this.idCliente = id;
      this.cargarCliente();
      this.cargarCuentas();
      this.cargarPrestamos();
      this.cargarPagos();
      this.cargarClienteEnMora();
    });
  }

  ngOnInit(): void {
    this.estados = [
      { label: 'Activo', value: 'ACTIVO' },
      { label: 'Inactivo', value: 'INACTIVO' },
      { label: 'Bloqueado', value: 'BLOQUEADO' },
      { label: 'Suspendido', value: 'SUSPENDIDO' }
    ];

    const origenParam = this.route.snapshot.queryParamMap.get('origen');
    const origen = (origenParam && ORIGENES[origenParam]) || ORIGENES['clientes'];
    this.origenLabel = origen.label;
    this.origenPath = origen.path;
  }

  volver(): void {
    this.router.navigate([this.origenPath]);
  }

  // ===== Carga de datos =====

  cargarCliente(): void {
    this.cargandoCliente = true;
    this.clienteService.obtenerClientePorId(this.idCliente).subscribe({
      next: (data) => {
        this.cliente = data;
        this.cargandoCliente = false;
        this.resetInfoForm();
      },
      error: (error) => {
        this.cargandoCliente = false;
        this.enviarMensajeError('No se pudo cargar el cliente');
        console.error('Error loading cliente:', error);
      }
    });
  }

  /** Consulta la cartera vencida completa y se queda solo con la fila de este cliente, si aparece. */
  cargarClienteEnMora(): void {
    this.clienteService.obtenerClientesEnMora().subscribe({
      next: (data) => {
        this.clienteEnMora = data.find(c => c.idCliente === this.idCliente);
      },
      error: (error) => {
        // No es bloqueante para el hub: si falla, simplemente no se muestra la alerta.
        console.error('Error loading estado de mora del cliente:', error);
      }
    });
  }

  cargarCuentas(): void {
    this.cargandoCuentas = true;
    this.cuentaService.obtenerCuentasPorCliente(this.idCliente).subscribe({
      next: (data) => {
        this.cuentas = data;
        this.cargandoCuentas = false;
        this.cargarTransacciones();
      },
      error: (error) => {
        this.cargandoCuentas = false;
        this.enviarMensajeError('No se pudieron cargar las cuentas del cliente');
        console.error('Error loading cuentas:', error);
      }
    });
  }

  cargarPrestamos(): void {
    this.cargandoPrestamos = true;
    this.prestamoService.obtenerPrestamosPorCliente(this.idCliente).subscribe({
      next: (data) => {
        this.prestamos = data;
        this.cargandoPrestamos = false;
      },
      error: (error) => {
        this.cargandoPrestamos = false;
        this.enviarMensajeError('No se pudieron cargar los préstamos del cliente');
        console.error('Error loading prestamos:', error);
      }
    });
  }

  cargarPagos(): void {
    this.cargandoPagos = true;
    this.pagosService.obtenerPagosPorCliente(this.idCliente).subscribe({
      next: (data) => {
        this.pagos = data;
        this.cargandoPagos = false;
      },
      error: (error) => {
        this.cargandoPagos = false;
        this.enviarMensajeError('No se pudieron cargar los pagos del cliente');
        console.error('Error loading pagos:', error);
      }
    });
  }

  /** No existe un endpoint "transacciones por cliente": se arma pidiendo las transacciones de cada cuenta del cliente. */
  cargarTransacciones(): void {
    this.cargandoTransacciones = true;

    if (this.cuentas.length === 0) {
      this.transacciones = [];
      this.cargandoTransacciones = false;
      return;
    }

    const porCuenta = this.cuentas.map(c => this.transaccionService.obtenerTransaccionesPorCuenta(c.idCuenta!));
    forkJoin(porCuenta).subscribe({
      next: (listas) => {
        this.transacciones = listas.flat().sort((a, b) => {
          const fechaA = a.fechaTransaccion ? new Date(a.fechaTransaccion).getTime() : 0;
          const fechaB = b.fechaTransaccion ? new Date(b.fechaTransaccion).getTime() : 0;
          return fechaB - fechaA;
        });
        this.cargandoTransacciones = false;
      },
      error: (error) => {
        this.cargandoTransacciones = false;
        this.enviarMensajeError('No se pudieron cargar las transacciones del cliente');
        console.error('Error loading transacciones:', error);
      }
    });
  }

  // ===== Acciones rápidas del header =====

  /** Préstamos de este cliente en un estado que admite pagos (usado para habilitar "Registrar pago" y para el selector rápido). */
  get prestamosActivosDelCliente(): PrestamoResponseDTO[] {
    return this.prestamos.filter(p => p.estado === 'APROBADO' || p.estado === 'DESEMBOLSADO');
  }

  // Selector rápido de préstamo cuando el cliente tiene más de uno activo
  seleccionPrestamoDialog: boolean = false;

  // Tabla de amortización de un préstamo, consultada sin salir de la ficha del cliente
  amortizacionDialog: boolean = false;
  prestamoSeleccionadoAmortizacion?: PrestamoResponseDTO;
  tablaAmortizacion: AmortizacionDTO[] = [];
  cargandoAmortizacion: boolean = false;

  nuevaCuenta(): void {
    if (!this.cliente) return;
    this.cuentaFormDialog.abrirNuevo(this.cliente);
  }

  nuevoPrestamo(): void {
    if (!this.cliente) return;
    this.prestamoFormDialog.abrirNuevo(this.cliente);
  }

  /**
   * El botón "Registrar pago" del header solo se habilita si hay préstamos activos
   * (ver [disabled] en el template). Si hay uno solo, se salta la selección y se abre
   * directo el diálogo de pago ya existente en Prestamos; si hay varios, primero se
   * pregunta cuál mediante un pequeño selector propio del hub (no un diálogo duplicado).
   */
  registrarPago(): void {
    const activos = this.prestamosActivosDelCliente;
    if (activos.length === 0) return;

    if (activos.length === 1) {
      this.pagoFormDialog.abrirParaPrestamo(activos[0]);
    } else {
      this.seleccionPrestamoDialog = true;
    }
  }

  elegirPrestamoParaPago(prestamo: PrestamoResponseDTO): void {
    this.seleccionPrestamoDialog = false;
    this.pagoFormDialog.abrirParaPrestamo(prestamo);
  }

  onCuentaGuardada(): void {
    this.cargarCuentas();
  }

  onPrestamoGuardado(): void {
    this.cargarPrestamos();
  }

  onPagoGuardado(): void {
    // Un pago afecta el saldo pendiente del préstamo, por eso se recargan ambas listas
    this.cargarPagos();
    this.cargarPrestamos();
  }

  // ===== Pestaña Cuentas =====

  /** Mantiene al usuario en el contexto del cliente: lleva el nombre para el breadcrumb "Volver a [cliente]" en transacciones-realizadas. */
  verMovimientos(cuenta: CuentaAhorroResponseDTO): void {
    if (!cuenta.idCuenta) return;
    this.router.navigate(['/transacciones-realizadas'], {
      queryParams: {
        cuentaId: cuenta.idCuenta,
        clienteId: this.idCliente,
        clienteNombre: this.nombreCompleto()
      }
    });
  }

  // ===== Pestaña Préstamos =====

  /**
   * Abre la tabla de amortización sin salir de la ficha del cliente (mismo patrón
   * de p-dialog que ya usa este hub para el selector rápido de préstamo, y que ya
   * usa la pantalla Prestamos para esta misma funcionalidad).
   * Un préstamo SOLICITADO (sin aprobar) todavía no tiene tabla generada en el
   * backend, así que en ese caso ni siquiera se llama al endpoint.
   */
  verAmortizacion(prestamo: PrestamoResponseDTO): void {
    this.prestamoSeleccionadoAmortizacion = prestamo;
    this.tablaAmortizacion = [];
    this.amortizacionDialog = true;

    if (prestamo.estado === 'SOLICITADO' || !prestamo.idPrestamo) {
      return;
    }

    this.cargandoAmortizacion = true;
    this.prestamoService.obtenerTablaAmortizacion(prestamo.idPrestamo).subscribe({
      next: (data) => {
        this.tablaAmortizacion = data;
        this.cargandoAmortizacion = false;
      },
      error: (error) => {
        this.cargandoAmortizacion = false;
        this.enviarMensajeError('No se pudo cargar la tabla de amortización');
        console.error('Error loading amortizacion:', error);
      }
    });
  }

  hideAmortizacionDialog(): void {
    this.amortizacionDialog = false;
    this.prestamoSeleccionadoAmortizacion = undefined;
    this.tablaAmortizacion = [];
  }

  /**
   * Cuota PENDIENTE cuya fecha de vencimiento ya pasó: es la misma noción de mora
   * que ya se calcula en Cartera Vencida, pero aplicada a una cuota individual de
   * ESTE préstamo. Se usa solo para el color del p-tag, no cambia el valor mostrado
   * (que sigue siendo el estadoPago real que manda el backend).
   */
  esCuotaAtrasada(cuota: AmortizacionDTO): boolean {
    if (cuota.estadoPago !== 'PENDIENTE' || !cuota.fechaVencimiento) return false;
    const vencimiento = this.parseFechaLocal(cuota.fechaVencimiento);
    if (!vencimiento) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return vencimiento < hoy;
  }

  getSeverityCuota(cuota: AmortizacionDTO): 'success' | 'danger' | 'warn' {
    if (cuota.estadoPago === 'PAGADA') return 'success';
    return this.esCuotaAtrasada(cuota) ? 'danger' : 'warn';
  }

  /** Parsea una fecha YYYY-MM-DD como fecha local (sin desfase de zona horaria), igual que formatDate(). */
  private parseFechaLocal(fecha: string): Date | undefined {
    const fechaParte = fecha.split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaParte)) return undefined;
    const [year, month, day] = fechaParte.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // ===== Pestaña Info =====

  private getEmptyInfoForm(): ClienteRequestDTO {
    return { cedula: '', nombres: '', apellidos: '', email: '', telefono: '', direccion: '', fechaNacimiento: '' };
  }

  private resetInfoForm(): void {
    if (!this.cliente) return;
    this.infoForm = {
      cedula: this.cliente.cedula || '',
      nombres: this.cliente.nombres || '',
      apellidos: this.cliente.apellidos || '',
      email: this.cliente.email,
      telefono: this.cliente.telefono || '',
      direccion: this.cliente.direccion,
      fechaNacimiento: this.cliente.fechaNacimiento
    };
    this.selectedEstado = this.cliente.estado;
    this.estadoOriginal = this.cliente.estado;
  }

  editarInfo(): void {
    this.editandoInfo = true;
    this.submittedInfo = false;
  }

  cancelarEdicionInfo(): void {
    this.editandoInfo = false;
    this.resetInfoForm();
  }

  guardarInfo(): void {
    this.submittedInfo = true;

    if (!this.infoForm.fechaNacimiento || !this.validationService.validarFechaValida(this.infoForm.fechaNacimiento)) {
      this.enviarMensajeAdvertencia('La fecha de nacimiento es obligatoria y debe tener el formato correcto');
      return;
    }
    if (!this.validationService.validarEdadMinima(this.infoForm.fechaNacimiento, 10)) {
      this.enviarMensajeAdvertencia('El cliente debe ser mayor a 10 años');
      return;
    }
    if (!this.validationService.validarTelefono(this.infoForm.telefono, 10, 10)) {
      this.enviarMensajeAdvertencia('El teléfono no es válido');
      return;
    }

    const camposVacios = this.validationService.validarCamposRequeridos({
      'Cédula': this.infoForm.cedula,
      'Nombres': this.infoForm.nombres,
      'Apellidos': this.infoForm.apellidos,
      'Teléfono': this.infoForm.telefono
    });
    if (camposVacios.length > 0) {
      this.enviarMensajeAdvertencia(`Es obligatorio: ${camposVacios.join(', ')}`);
      return;
    }

    this.clienteService.actualizarCliente(this.infoForm, this.idCliente).subscribe({
      next: (response) => {
        const nuevoEstado = this.selectedEstado;
        const estadoCambio = nuevoEstado && nuevoEstado !== this.estadoOriginal;

        if (estadoCambio) {
          this.actualizarEstadoCliente(nuevoEstado);
        } else {
          this.cliente = response;
          this.editandoInfo = false;
          this.enviarMensajeExito('Cliente actualizado correctamente');
        }
      },
      error: (error) => {
        this.enviarMensajeError('No se pudo actualizar el cliente');
        console.error('Error updating cliente:', error);
      }
    });
  }

  private actualizarEstadoCliente(estado: string): void {
    const request = estado === 'ACTIVO'
      ? this.clienteService.activarCliente(this.idCliente)
      : this.clienteService.desactivarCliente(this.idCliente);

    if (estado === 'ACTIVO' || estado === 'INACTIVO') {
      request.subscribe({
        next: () => {
          this.editandoInfo = false;
          this.enviarMensajeExito('Cliente actualizado correctamente');
          this.cargarCliente();
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo actualizar el estado del cliente');
          console.error('Error updating estado:', error);
        }
      });
    } else {
      this.enviarMensajeInfo(`El cambio de estado a ${estado} requiere configuración adicional en el backend.`);
      this.editandoInfo = false;
      this.cargarCliente();
    }
  }

  nombreCompleto(): string {
    if (!this.cliente) return '';
    return `${this.cliente.nombres || ''} ${this.cliente.apellidos || ''}`.trim();
  }

  // ===== Presentación =====

  getSeverityCliente(estado?: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    switch (estado) {
      case 'ACTIVO': return 'success';
      case 'INACTIVO': return 'secondary';
      case 'BLOQUEADO': return 'danger';
      case 'SUSPENDIDO': return 'warn';
      default: return 'info';
    }
  }

  /** Para que el cajero sepa de un vistazo qué tasa de interés le corresponde sin ir a revisar sus cuentas una por una. */
  getTipoSocioLabel(tipoSocio?: string): string {
    return tipoSocio === 'MAYORISTA' ? 'Mayorista' : 'Minorista';
  }

  getSeverityTipoSocio(tipoSocio?: string): 'warn' | 'secondary' {
    return tipoSocio === 'MAYORISTA' ? 'warn' : 'secondary';
  }

  getSeverityPrestamo(estado?: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    switch (estado) {
      case 'DESEMBOLSADO': return 'success';
      case 'PENDIENTE': return 'warn';
      case 'SOLICITADO': return 'danger';
      case 'APROBADO': return 'info';
      case 'RECHAZADO': return 'secondary';
      default: return 'info';
    }
  }

  getSeverityTransaccion(tipo?: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    return tipo === 'DEPOSITO' ? 'success' : tipo === 'RETIRO' ? 'danger' : 'info';
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
  }

  formatDate(date: string | Date | undefined): string {
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

  getMetodoPagoLabel(metodo?: string): string {
    const metodos: { [key: string]: string } = {
      'EFECTIVO': 'Efectivo',
      'TRANSFERENCIA': 'Transferencia',
      'CHEQUE': 'Cheque',
      'TARJETA': 'Tarjeta',
      'TARJETA_DEBITO': 'Tarjeta de Débito',
      'TARJETA_CREDITO': 'Tarjeta de Crédito',
      'DEBITO_AUTOMATICO': 'Débito Automático'
    };
    return metodo ? (metodos[metodo] || metodo) : '';
  }

  // ===== Validación en tiempo real (mismos helpers que Clientes) =====

  soloNumeros(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1 ||
      (charCode === 65 && event.ctrlKey === true) ||
      (charCode === 67 && event.ctrlKey === true) ||
      (charCode === 86 && event.ctrlKey === true) ||
      (charCode === 88 && event.ctrlKey === true) ||
      (charCode >= 35 && charCode <= 39)) {
      return true;
    }
    if ((event.shiftKey || (charCode < 48 || charCode > 57)) && (charCode < 96 || charCode > 105)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  soloLetras(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if ([8, 9, 27, 13, 32, 46].indexOf(charCode) !== -1 ||
      (charCode === 65 && event.ctrlKey === true) ||
      (charCode === 67 && event.ctrlKey === true) ||
      (charCode === 86 && event.ctrlKey === true) ||
      (charCode === 88 && event.ctrlKey === true) ||
      (charCode >= 35 && charCode <= 39)) {
      return true;
    }
    const char = String.fromCharCode(charCode);
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]$/;
    if (!regex.test(char)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  // ===== Mensajería =====

  enviarMensajeError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 3000 });
  }

  enviarMensajeExito(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail, life: 3000 });
  }

  enviarMensajeAdvertencia(detail: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail, life: 3000 });
  }

  enviarMensajeInfo(detail: string): void {
    this.messageService.add({ severity: 'info', summary: 'Info', detail, life: 3000 });
  }
}

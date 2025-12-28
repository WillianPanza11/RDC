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
import { Tag } from 'primeng/tag';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { PrstamosService } from '../../generated-api/api/prstamos.service';
import { PagosDePrstamosService } from '../../generated-api/api/pagosDePrstamos.service';
import { ClienteControllerService } from '../../generated-api/api/clienteController.service';
import { PrestamoRequestDTO } from '../../generated-api/model/prestamoRequestDTO';
import { PrestamoResponseDTO } from '../../generated-api/model/prestamoResponseDTO';
import { CalcularCuotaRequestDTO } from '../../generated-api/model/calcularCuotaRequestDTO';
import { CalcularCuotaResponseDTO } from '../../generated-api/model/calcularCuotaResponseDTO';
import { AprobarPrestamoDTO } from '../../generated-api/model/aprobarPrestamoDTO';
import { ActualizarPlazoPrestamoDTO } from '../../generated-api/model/actualizarPlazoPrestamoDTO';
import { PagoPrestamoRequestDTO } from '../../generated-api/model/pagoPrestamoRequestDTO';
import { PagoPrestamoResponseDTO } from '../../generated-api/model/pagoPrestamoResponseDTO';
import { AmortizacionDTO } from '../../generated-api/model/amortizacionDTO';
import { ClienteResponseDTO } from '../../generated-api/model/clienteResponseDTO';
import { ValidationService } from '../../core/services/validation.service';

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-prestamos',
  imports: [Toast, ToolbarModule, TableModule, ButtonModule, DialogModule, IconFieldModule,
    SelectModule, InputIconModule, Tag, ConfirmDialog, FormsModule,
    CommonModule, MessageModule, ConfirmDialogModule, Header, InputTextModule, InputNumberModule, TooltipModule],
  providers: [MessageService, ConfirmationService, PrstamosService, PagosDePrstamosService, ClienteControllerService],
  templateUrl: './prestamos.html',
  styleUrl: './prestamos.css',
})
export class Prestamos implements OnInit {

  prestamoDialog: boolean = false;
  aprobarDialog: boolean = false;
  calcularCuotaDialog: boolean = false;
  amortizacionDialog: boolean = false;
  pagoDialog: boolean = false;
  prestamos: PrestamoResponseDTO[] = [];
  prestamo: PrestamoRequestDTO = this.getEmptyPrestamo();
  prestamoId?: number;
  selectedPrestamos: PrestamoResponseDTO[] = [];
  submitted: boolean = false;

  // Para aprobar préstamo
  montoAprobado: number = 0;

  // Para calcular cuota
  calcularCuota: CalcularCuotaRequestDTO = { monto: 0, plazoMeses: 0 };
  resultadoCuota?: CalcularCuotaResponseDTO;

  // Tabla de amortización
  tablaAmortizacion: AmortizacionDTO[] = [];

  // Para registrar pago
  pago: PagoPrestamoRequestDTO = this.getEmptyPago();
  prestamoSeleccionadoParaPago?: PrestamoResponseDTO;
  cuotasDisponibles: any[] = [];

  // Clientes para el select
  clientes: ClienteResponseDTO[] = [];
  clientesOptions: any[] = [];

  // Estados
  estados: any[] = [];
  selectedEstado: string = 'TODOS';

  // Para edición inline de plazo
  editingPlazo: { [key: number]: boolean } = {};
  plazoEditado: { [key: number]: number } = {};

  @ViewChild('dt') dt!: Table;
  cols: Column[] = [];

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private prestamoService: PrstamosService,
    private pagosService: PagosDePrstamosService,
    private clienteService: ClienteControllerService,
    private validationService: ValidationService
  ) {
    afterNextRender(() => {
      this.loadPrestamos();
      this.loadClientes();
    });
  }

  ngOnInit(): void {
    this.initializeEstados();
    this.initializeColumns();
  }

  private initializeEstados(): void {
    this.estados = [
      { label: 'Todos', value: 'TODOS' },
      { label: 'Solicitado', value: 'SOLICITADO' },
      { label: 'Pendiente', value: 'PENDIENTE' },
      { label: 'Aprobado', value: 'APROBADO' },
      { label: 'Rechazado', value: 'RECHAZADO' },
      { label: 'Desembolsado', value: 'DESEMBOLSADO' },
      { label: 'Cancelado', value: 'CANCELADO' }
    ];
  }

  private initializeColumns(): void {
    this.cols = [
      { field: 'numeroCuentaPrestamo', header: 'Número de Cuenta' },
      { field: 'nombreCliente', header: 'Cliente' },
      { field: 'montoSolicitado', header: 'Monto Solicitado' },
      { field: 'montoAprobado', header: 'Monto Aprobado' },
      { field: 'plazoMeses', header: 'Plazo (Meses)' },
      { field: 'cuotaMensual', header: 'Cuota Mensual' },
      { field: 'saldoPendiente', header: 'Saldo Pendiente' },
      { field: 'estado', header: 'Estado' },
      { field: 'fechaSolicitud', header: 'Fecha Solicitud' }
    ];
  }

  loadPrestamos(): void {
    if (this.selectedEstado === 'TODOS') {
      this.prestamoService.obtenerTodosLosPrestamos().subscribe({
        next: (data) => {
          this.prestamos = data;
          console.log('todos los prestamos', this.prestamos);
        },
        error: (error) => {
          this.enviarMensajeError('No se pudieron cargar los préstamos');
          console.error('Error loading prestamos:', error);
        }
      });
    } else {
      this.prestamoService.obtenerPrestamosPorEstado(this.selectedEstado).subscribe({
        next: (data) => {
          this.prestamos = data;
          console.log('prestamos por estado', this.prestamos);
        },
        error: (error) => {
          this.enviarMensajeError('No se pudieron cargar los préstamos');
          console.error('Error loading prestamos:', error);
        }
      });
    }
  }

  loadClientes(): void {
    this.clienteService.obtenerClientesPorEstado('ACTIVO').subscribe({
      next: (data) => {
        this.clientes = data;
        this.clientesOptions = data.map(cliente => ({
          label: `${cliente.nombres} ${cliente.apellidos} - ${cliente.cedula}`,
          value: cliente.idCliente,
          // Agregar información adicional para mejorar la búsqueda
          searchText: `${cliente.nombres} ${cliente.apellidos} ${cliente.cedula}`.toLowerCase()
        }));
      },
      error: (error) => {
        console.error('Error loading clientes:', error);
      }
    });
  }

  openNew(): void {
    this.prestamo = this.getEmptyPrestamo();
    this.prestamoId = undefined;
    this.submitted = false;
    this.prestamoDialog = true;
  }

  openCalcularCuota(): void {
    this.calcularCuota = { monto: 0, plazoMeses: 0 };
    this.resultadoCuota = undefined;
    this.calcularCuotaDialog = true;
  }

  calcularCuotaMensual(): void {
    if (!this.calcularCuota.monto || this.calcularCuota.monto <= 0) {
      this.enviarMensajeAdvertencia('El monto debe ser mayor a 0');
      return;
    }
    if (!this.calcularCuota.plazoMeses || this.calcularCuota.plazoMeses <= 0) {
      this.enviarMensajeAdvertencia('El plazo debe ser mayor a 0');
      return;
    }

    this.prestamoService.calcularCuotaMensual(this.calcularCuota).subscribe({
      next: (data) => {
        this.resultadoCuota = data;
      },
      error: (error) => {
        this.enviarMensajeError('No se pudo calcular la cuota');
        console.error('Error calculating cuota:', error);
      }
    });
  }

  openAprobar(prestamo: PrestamoResponseDTO): void {
    if (!prestamo.idPrestamo) {
      return;
    }
    this.prestamoId = prestamo.idPrestamo;
    this.montoAprobado = prestamo.montoSolicitado || 0;
    this.aprobarDialog = true;
  }

  verAmortizacion(prestamo: PrestamoResponseDTO): void {
    if (!prestamo.idPrestamo) {
      return;
    }
    this.prestamoId = prestamo.idPrestamo;
    this.prestamoService.obtenerTablaAmortizacion(prestamo.idPrestamo).subscribe({
      next: (data) => {
        this.tablaAmortizacion = data;
        this.amortizacionDialog = true;
      },
      error: (error) => {
        this.enviarMensajeError('No se pudo cargar la tabla de amortización');
        console.error('Error loading amortizacion:', error);
      }
    });
  }

  hideDialog(): void {
    this.prestamoDialog = false;
    this.aprobarDialog = false;
    this.calcularCuotaDialog = false;
    this.amortizacionDialog = false;
    this.pagoDialog = false;
    this.submitted = false;
  }

  openPago(prestamo: PrestamoResponseDTO): void {
    if (!prestamo.idPrestamo) {
      return;
    }
    this.prestamoSeleccionadoParaPago = prestamo;
    this.pago = this.getEmptyPago();
    this.pago.idPrestamo = prestamo.idPrestamo;
    this.cuotasDisponibles = [];
    this.submitted = false;

    // Cargar cuotas pendientes
    this.pagosService.obtenerCuotasPendientes(prestamo.idPrestamo).subscribe({
      next: (cuotas) => {
        this.cuotasDisponibles = cuotas.map(cuota => ({
          label: `Cuota #${cuota.numeroCuota} - ${this.formatCurrency(cuota.montoCuota)} - Vence: ${this.formatDate(cuota.fechaVencimiento)}`,
          value: cuota.numeroCuota,
          cuota: cuota
        }));
        // Si hay cuotas, seleccionar la primera por defecto
        if (this.cuotasDisponibles.length > 0) {
          this.pago.numeroCuota = this.cuotasDisponibles[0].value;
          this.onCuotaSeleccionada();
        }
      },
      error: (error) => {
        this.enviarMensajeError('No se pudieron cargar las cuotas pendientes');
        console.error('Error loading cuotas pendientes:', error);
      }
    });

    this.pagoDialog = true;
  }

  onCuotaSeleccionada(): void {
    const cuotaSeleccionada = this.cuotasDisponibles.find(c => c.value === this.pago.numeroCuota);
    if (cuotaSeleccionada && cuotaSeleccionada.cuota) {
      // Establecer el monto por defecto como el monto de la cuota
      this.pago.montoPagado = cuotaSeleccionada.cuota.montoCuota || 0;
      // Si hay mora, incluirla
      if (cuotaSeleccionada.cuota.mora) {
        this.pago.mora = cuotaSeleccionada.cuota.mora;
      }
    }
  }

  async registrarPago(): Promise<void> {
    this.submitted = true;

    // Validar campos requeridos
    if (!this.pago.idPrestamo) {
      this.enviarMensajeAdvertencia('El préstamo es requerido');
      return;
    }

    if (!this.pago.numeroCuota || this.pago.numeroCuota <= 0) {
      this.enviarMensajeAdvertencia('Debe seleccionar una cuota');
      return;
    }

    if (!this.pago.montoPagado || this.pago.montoPagado <= 0) {
      this.enviarMensajeAdvertencia('El monto pagado debe ser mayor a 0');
      return;
    }

    if (!this.pago.metodoPago || this.pago.metodoPago.trim() === '') {
      this.enviarMensajeAdvertencia('El método de pago es requerido');
      return;
    }

    // Confirmar antes de registrar
    const cuotaSeleccionada = this.cuotasDisponibles.find(c => c.value === this.pago.numeroCuota);
    const montoTotal = this.pago.montoPagado + (this.pago.mora || 0);
    
    this.confirmationService.confirm({
      message: `¿Está seguro que desea registrar el pago de la cuota #${this.pago.numeroCuota} por un monto de ${this.formatCurrency(montoTotal)}?`,
      header: 'Confirmar Registro de Pago',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.pagosService.registrarPago(this.pago).subscribe({
          next: (response) => {
            this.enviarMensajeExito(`Pago de cuota #${response.numeroCuotaPagada} registrado correctamente`);
            this.pagoDialog = false;
            this.pago = this.getEmptyPago();
            // Recargar préstamos para actualizar saldos
            this.loadPrestamos();
          },
          error: (error) => {
            console.error('Error registering pago:', error);
            this.enviarMensajeError(error.error?.message || 'No se pudo registrar el pago');
          }
        });
      },
      reject: () => {
        // No hacer nada, el usuario canceló
      }
    });
  }

  private getEmptyPago(): PagoPrestamoRequestDTO {
    return {
      idPrestamo: 0,
      numeroCuota: 0,
      montoPagado: 0,
      metodoPago: '',
      referencia: '',
      mora: 0
    };
  }

  async savePrestamo(): Promise<void> {
    this.submitted = true;

    // Validar campos requeridos
    const camposVacios = this.validarCamposRequeridos();
    if (camposVacios.length > 0) {
      this.enviarMensajeAdvertencia(`Es obligatorio: ${camposVacios.join(', ')}`);
      return;
    }

    // Validar monto
    if (this.prestamo.montoSolicitado <= 0) {
      this.enviarMensajeAdvertencia('El monto solicitado debe ser mayor a 0');
      return;
    }

    // Validar plazo
    if (this.prestamo.plazoMeses <= 0) {
      this.enviarMensajeAdvertencia('El plazo en meses debe ser mayor a 0');
      return;
    }

    // Crear nuevo préstamo
    this.prestamoService.solicitarPrestamo(this.prestamo).subscribe({
      next: (response) => {
        this.prestamos.push(response);
        this.enviarMensajeExito('Préstamo solicitado correctamente');
        this.prestamoDialog = false;
        this.prestamo = this.getEmptyPrestamo();
        this.loadPrestamos();
      },
      error: (error) => {
        this.enviarMensajeError('No se pudo solicitar el préstamo');
        console.error('Error creating prestamo:', error);
      }
    });
  }

  aprobarPrestamo(): void {
    if (!this.prestamoId) {
      return;
    }

    if (this.montoAprobado <= 0) {
      this.enviarMensajeAdvertencia('El monto aprobado debe ser mayor a 0');
      return;
    }

    const aprobarDTO: AprobarPrestamoDTO = {
      idPrestamo: this.prestamoId,
      montoAprobado: this.montoAprobado
    };

    this.prestamoService.aprobarPrestamo(aprobarDTO).subscribe({
      next: (response) => {
        const index = this.prestamos.findIndex(p => p.idPrestamo === this.prestamoId);
        if (index !== -1) {
          this.prestamos[index] = response;
        }
        this.enviarMensajeExito('Préstamo aprobado correctamente');
        this.aprobarDialog = false;
        this.loadPrestamos();
      },
      error: (error) => {
        this.enviarMensajeError('No se pudo aprobar el préstamo');
        console.error('Error approving prestamo:', error);
      }
    });
  }

  validarCamposRequeridos(): string[] {
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

  getSeverity(estado?: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    switch (estado) {
      case 'PAGADO':
        return 'success';
      case 'PENDIENTE':
        return 'warn';
      case 'SOLICITADO':
        return 'danger';
      case 'APROBADO':
        return 'info';
      case 'RECHAZADO':
        return 'secondary';
      default:
        return 'info';
    }
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

  formatDate(date: string | undefined): string {
    if (!date) return '';
    
    // Si la fecha viene como string ISO, parsearla correctamente sin considerar zona horaria
    // Formato esperado: "2025-12-21" o "2025-12-21T00:00:00" o "2025-12-21T00:00:00Z"
    const fechaStr = date.toString();
    
    // Si es solo fecha (YYYY-MM-DD), parsearla directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      const [year, month, day] = fechaStr.split('-').map(Number);
      const fecha = new Date(year, month - 1, day);
      return fecha.toLocaleDateString('es-EC');
    }
    
    // Si incluye hora, extraer solo la parte de fecha
    const fechaParte = fechaStr.split('T')[0];
    if (fechaParte && /^\d{4}-\d{2}-\d{2}$/.test(fechaParte)) {
      const [year, month, day] = fechaParte.split('-').map(Number);
      const fecha = new Date(year, month - 1, day);
      return fecha.toLocaleDateString('es-EC');
    }
    
    // Fallback: intentar parsear normalmente
    const fecha = new Date(date);
    if (isNaN(fecha.getTime())) return '';
    
    // Usar UTC para evitar problemas de zona horaria
    const year = fecha.getUTCFullYear();
    const month = fecha.getUTCMonth() + 1;
    const day = fecha.getUTCDate();
    
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  }

  onEstadoChange(): void {
    this.loadPrestamos();
  }

  // Métodos para edición inline de plazo
  iniciarEdicionPlazo(prestamo: PrestamoResponseDTO): void {
    if (!prestamo.idPrestamo) return;
    this.editingPlazo[prestamo.idPrestamo] = true;
    this.plazoEditado[prestamo.idPrestamo] = prestamo.plazoMeses || 0;
  }

  cancelarEdicionPlazo(prestamo: PrestamoResponseDTO): void {
    if (!prestamo.idPrestamo) return;
    this.editingPlazo[prestamo.idPrestamo] = false;
    delete this.plazoEditado[prestamo.idPrestamo];
  }

  guardarPlazo(prestamo: PrestamoResponseDTO, event?: KeyboardEvent | FocusEvent): void {
    // Si es un evento de teclado y no es Enter, no hacer nada
    if (event && 'key' in event) {
      if (event.key === 'Escape') {
        this.cancelarEdicionPlazo(prestamo);
        return;
      }
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
    }

    if (!prestamo.idPrestamo) return;

    const nuevoPlazo = this.plazoEditado[prestamo.idPrestamo];
    const plazoAnterior = prestamo.plazoMeses || 0;

    // Validar que el nuevo plazo sea válido
    if (!nuevoPlazo || nuevoPlazo <= 0) {
      this.enviarMensajeAdvertencia('El plazo debe ser mayor a 0');
      this.cancelarEdicionPlazo(prestamo);
      return;
    }

    // Si no cambió, solo cancelar edición
    if (nuevoPlazo === plazoAnterior) {
      this.cancelarEdicionPlazo(prestamo);
      return;
    }

    // Confirmar antes de actualizar
    this.confirmationService.confirm({
      message: `¿Está seguro que desea cambiar el plazo de ${plazoAnterior} meses a ${nuevoPlazo} meses para el préstamo #${prestamo.idPrestamo}?`,
      header: 'Confirmar Cambio de Plazo',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.actualizarPlazoPrestamo(prestamo.idPrestamo!, nuevoPlazo, prestamo);
      },
      reject: () => {
        this.cancelarEdicionPlazo(prestamo);
      }
    });
  }

  actualizarPlazoPrestamo(idPrestamo: number, nuevoPlazo: number, prestamo: PrestamoResponseDTO): void {
    const actualizarDTO: ActualizarPlazoPrestamoDTO = {
      idPrestamo: idPrestamo,
      nuevoPlazoMeses: nuevoPlazo
    };

    this.prestamoService.actualizarPlazoPrestamo(actualizarDTO).subscribe({
      next: (response) => {
        // Actualizar el préstamo en la lista con la respuesta del servidor
        const index = this.prestamos.findIndex(p => p.idPrestamo === idPrestamo);
        if (index !== -1) {
          this.prestamos[index] = response;
        }
        this.enviarMensajeExito(`Plazo actualizado de ${prestamo.plazoMeses} a ${nuevoPlazo} meses correctamente`);
        this.cancelarEdicionPlazo(prestamo);
      },
      error: (error) => {
        console.error('Error updating plazo:', error);
        /*let mensajeError = 'No se pudo actualizar el plazo';
        
        // Mensajes de error más específicos
        if (error.status === 400) {
          mensajeError = error.error?.message || 'El préstamo no puede ser modificado en su estado actual o ya tiene pagos realizados';
        } else if (error.status === 404) {
          mensajeError = 'Préstamo no encontrado';
        } else if (error.status === 403) {
          mensajeError = 'No tiene permisos para actualizar este préstamo';
        }*/
        
        this.enviarMensajeError(error.error?.message || 'No se pudo actualizar el plazo');
        this.cancelarEdicionPlazo(prestamo);
      }
    });
  }

  private getEmptyPrestamo(): PrestamoRequestDTO {
    return {
      idCliente: 0,
      montoSolicitado: 0,
      plazoMeses: 0,
      tipoPrestamo: 'PERSONAL'
    };
  }

  // Métodos para validar entrada en tiempo real
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

  limpiarSoloNumeros(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorOriginal = input.value;
    const valorLimpio = valorOriginal.replace(/[^0-9.]/g, '');
    
    if (valorOriginal !== valorLimpio) {
      input.value = valorLimpio;
    }
  }

  //envio de mensajes de error
  enviarMensajeError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: detail,
      life: 7000
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
}

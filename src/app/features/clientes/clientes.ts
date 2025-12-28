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
import { ClienteControllerService } from '../../generated-api/api/clienteController.service';
import { ClienteRequestDTO } from '../../generated-api/model/clienteRequestDTO';
import { ClienteResponseDTO } from '../../generated-api/model/clienteResponseDTO';
import { firstValueFrom } from 'rxjs';
import { ValidationService } from '../../core/services/validation.service';


interface Column {
  field: string;
  header: string;
}


@Component({
  selector: 'app-clientes',
  imports: [Toast, ToolbarModule, TableModule, ButtonModule, DialogModule, IconFieldModule,
    SelectModule, InputIconModule, Tag, ConfirmDialog, FormsModule,
    CommonModule, MessageModule, ConfirmDialogModule, Header, InputTextModule,],
  providers: [MessageService, ConfirmationService, ClienteControllerService],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css',
})
export class Clientes implements OnInit {

  clienteDialog: boolean = false;
  clientes: ClienteResponseDTO[] = [];
  cliente: ClienteRequestDTO = this.getEmptyCliente();
  clienteId?: number;
  selectedClientes: ClienteResponseDTO[] = [];
  submitted: boolean = false;

  @ViewChild('dt') dt!: Table;
  cols: Column[] = [];

  //Seleccion de estado
  estados: any[] = [];
  selectedEstado: string | undefined;
  estadoOriginal: string | undefined; 


  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private clienteService: ClienteControllerService,
    private validationService: ValidationService
  ) {
    // Ejecutar loadClientes solo en el navegador (después de la hidratación SSR)
    afterNextRender(() => {
      this.loadClientes();
    });
  }

  ngOnInit(): void {
    this.initializeEstados();
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

  private initializeColumns(): void {
    this.cols = [
      { field: 'cedula', header: 'Cédula' },
      { field: 'nombres', header: 'Nombres' },
      { field: 'apellidos', header: 'Apellidos' },
      { field: 'email', header: 'Email' },
      { field: 'telefono', header: 'Teléfono' },
      { field: 'estado', header: 'Estado' }
    ];
  }

  loadClientes(): void {
    this.clienteService.obtenerClientesPorEstado('ACTIVO').subscribe({
      next: (data) => {
        this.clientes = data;
        console.log(this.clientes);
      },
      error: (error) => {
        this.enviarMensajeError('No se pudieron cargar los clientes');
        console.error('Error loading clientes:', error);
      }
    });
  }

  openNew(): void {
    this.cliente = this.getEmptyCliente();
    this.clienteId = undefined;
    this.selectedEstado = undefined;
    this.estadoOriginal = undefined;
    this.submitted = false;
    this.clienteDialog = true;
  }

  editCliente(cliente: ClienteResponseDTO): void {
    this.cliente = {
      cedula: cliente.cedula || '',
      nombres: cliente.nombres || '',
      apellidos: cliente.apellidos || '',
      email: cliente.email,
      telefono: cliente.telefono || '',
      direccion: cliente.direccion,
      fechaNacimiento: cliente.fechaNacimiento
    };
    this.clienteId = cliente.idCliente;
    // Cargar el estado actual del cliente
    this.estadoOriginal = cliente.estado;
    this.selectedEstado = cliente.estado;
    this.clienteDialog = true;
  }

  hideDialog(): void {
    this.clienteDialog = false;
    this.submitted = false;
    this.selectedEstado = undefined;
    this.estadoOriginal = undefined;
  }

  actualizarEstadoCliente(id: number, estado: string): void {
    // Usar el endpoint apropiado según el estado
    if (estado === 'ACTIVO') {
      this.clienteService.activarCliente(id).subscribe({
        next: () => {
          this.loadClientes();
          this.enviarMensajeExito('Cliente actualizado correctamente');
          this.clienteDialog = false;
          this.cliente = this.getEmptyCliente();
          this.selectedEstado = undefined;
          this.estadoOriginal = undefined;
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo actualizar el estado del cliente');
          console.error('Error updating estado:', error);
        }
      });
    } else if (estado === 'INACTIVO') {
      this.clienteService.desactivarCliente(id).subscribe({
        next: () => {
          this.loadClientes();
          this.enviarMensajeExito('Cliente actualizado correctamente');
          this.clienteDialog = false;
          this.cliente = this.getEmptyCliente();
          this.selectedEstado = undefined;
          this.estadoOriginal = undefined;
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo actualizar el estado del cliente');
          console.error('Error updating estado:', error);
        }
      });
    } else {
      // Para BLOQUEADO y SUSPENDIDO, no hay endpoints específicos disponibles
      this.enviarMensajeInfo(`El cambio de estado a ${estado} requiere configuración adicional en el backend. Los datos del cliente se actualizaron correctamente.`);
      this.loadClientes();
      this.clienteDialog = false;
      this.cliente = this.getEmptyCliente();
      this.selectedEstado = undefined;
      this.estadoOriginal = undefined;
    }
  }



  async saveCliente(): Promise<void> {
    this.submitted = true;

    if (!this.cliente.fechaNacimiento || !this.validationService.validarFechaValida(this.cliente.fechaNacimiento)) {
      this.enviarMensajeAdvertencia('La fecha de nacimiento es obligatoria y debe tener el formato correcto');
      return;
    }

    if(!this.validationService.validarEdadMinima(this.cliente.fechaNacimiento, 10)){
      this.enviarMensajeAdvertencia('Cliente debe ser mayor a 10 años');
      return;
    }

    //validar telefono
    if(!this.validationService.validarTelefono(this.cliente.telefono, 10, 10)){
      this.enviarMensajeAdvertencia('El teléfono no es válido');
      return;
    }


    //Validar campos requeridos
    const camposVacios = this.ValidarCamposRequeridos();
    if (camposVacios.length > 0) {
      this.enviarMensajeAdvertencia(`Es obligario: ${camposVacios.join(', ')}`);
      return;
    }

    if (this.clienteId) {
      // Actualizar cliente existente
      this.clienteService.actualizarCliente(this.cliente, this.clienteId).subscribe({
        next: (response) => {
          // Verificar si el estado cambió
          const nuevoEstado = this.selectedEstado;
          const estadoCambio = nuevoEstado && nuevoEstado !== this.estadoOriginal;
          
          if (estadoCambio) {
            // Si el estado cambió, actualizarlo usando el endpoint correspondiente
            this.actualizarEstadoCliente(this.clienteId!, nuevoEstado);
          } else {
            // Si no cambió el estado, solo actualizar los datos
            const index = this.clientes.findIndex(c => c.idCliente === this.clienteId);
            if (index !== -1) {
              this.clientes[index] = response;
            }
            this.enviarMensajeExito('Cliente actualizado correctamente');
            this.clienteDialog = false;
            this.cliente = this.getEmptyCliente();
            this.selectedEstado = undefined;
            this.estadoOriginal = undefined;
          }
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo actualizar el cliente');
          console.error('Error updating cliente:', error);
        }
      });
    } else {
      //Validar si la cédula existe
      const cedulaExiste = await this.ValidarCedulaExistente(this.cliente.cedula!);
      if (cedulaExiste) {
        this.enviarMensajeError('Ya existe un cliente con esta cédula');
        return;
      }

      if (!this.ValidarCedulaValida(this.cliente.cedula!)) {
        this.enviarMensajeError('La cédula no es válida');
        return;
      }

      // Crear nuevo cliente
      this.clienteService.crearCliente(this.cliente).subscribe({
        next: (response) => {
          this.clientes.push(response);
          this.enviarMensajeExito('Cliente creado correctamente');
          this.clienteDialog = false;
          this.cliente = this.getEmptyCliente();
          this.selectedEstado = undefined;
        },
        error: (error) => {
          this.enviarMensajeError('No se pudo crear el cliente');
          console.error('Error creating cliente:', error);
        }
      });
    }
  }

  deleteCliente(cliente: ClienteResponseDTO): void {
    this.confirmationService.confirm({
      message: `¿Está seguro que desea desactivar al cliente ${cliente.nombres} ${cliente.apellidos}?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (cliente.idCliente) {
          this.clienteService.desactivarCliente(cliente.idCliente).subscribe({
            next: () => {
              this.loadClientes();
              this.enviarMensajeExito('Cliente desactivado correctamente');
            },
            error: (error) => {
              this.enviarMensajeError('No se pudo desactivar el cliente');
              console.error('Error deleting cliente:', error);
            }
          });
        }
      }
    });
  }

  deleteSelectedClientes(): void {
    this.confirmationService.confirm({
      message: '¿Está seguro que desea desactivar los clientes seleccionados?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Implementar desactivación múltiple si es necesario
        this.enviarMensajeInfo('Funcionalidad en desarrollo');
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

  private getEmptyCliente(): ClienteRequestDTO {
    return {
      cedula: '',
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      direccion: '',
      fechaNacimiento: ''
    };
  }

  //Validar campos requeridos
  ValidarCamposRequeridos(): string[] {
    const camposVacios: string[] = [];

    // Validar campos requeridos usando el servicio
    const camposRequeridos = {
      'Cédula': this.cliente.cedula,
      'Nombres': this.cliente.nombres,
      'Apellidos': this.cliente.apellidos,
      'Teléfono': this.cliente.telefono
    };

    const camposVaciosRequeridos = this.validationService.validarCamposRequeridos(camposRequeridos);
    camposVacios.push(...camposVaciosRequeridos);

    // Validar formato de fecha si está presente
    if (this.cliente.fechaNacimiento && this.cliente.fechaNacimiento.trim() !== '' && !this.validationService.validarFechaValida(this.cliente.fechaNacimiento)) {
      camposVacios.push('Fecha de Nacimiento');
    }

    // Validar longitud de dirección
    if (this.cliente.direccion && this.cliente.direccion.trim() !== '' && !this.validationService.validarLongitudTexto(this.cliente.direccion, 0, 100)) {
      camposVacios.push('Dirección (máximo 100 caracteres)');
    }

    // Validar formato de email si está presente
    if (this.cliente.email && this.cliente.email.trim() !== '' && !this.validationService.validarEmail(this.cliente.email)) {
      camposVacios.push('Email (formato inválido)');
    }

    return camposVacios;
  }

  //Validar si existe el cliente por cédula
  async ValidarCedulaExistente(cedula: string): Promise<boolean> {
    try {
      const cliente = await firstValueFrom(this.clienteService.obtenerClientePorCedula(cedula));
      return cliente ? true : false;
    } catch (error) {
      // Si da error 404, significa que no existe
      return false;
    }
  }

  //Validar fecha que este llenada en el formulario
  ValidarFechaLlenada(fecha: string): boolean {
    return this.validationService.validarFechaValida(fecha);
  }

  //validar que la fecha de nacimiento sea mayor a 10 años
  ValidarMayorDeDiezAnios(fechaNacimiento: string): boolean {
    return this.validationService.validarEdadMinima(fechaNacimiento, 10);
  }

  //Validar si la cédula es válida
  ValidarCedulaValida(cedula: string): boolean {
    return this.validationService.validarCedula(cedula);
  }

  // Métodos para validar entrada en tiempo real
  /**
   * Permite solo números en campos numéricos (cédula, teléfono)
   * @param event - Evento de teclado
   * @returns true si se permite el carácter, false en caso contrario
   */
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

  /**
   * Permite solo letras y espacios en campos de texto (nombres, apellidos)
   * @param event - Evento de teclado
   * @returns true si se permite el carácter, false en caso contrario
   */
  soloLetras(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    
    // Permitir: backspace, delete, tab, escape, enter, espacio
    if ([8, 9, 27, 13, 32, 46].indexOf(charCode) !== -1 ||
      // Permitir: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (charCode === 65 && event.ctrlKey === true) ||
      (charCode === 67 && event.ctrlKey === true) ||
      (charCode === 86 && event.ctrlKey === true) ||
      (charCode === 88 && event.ctrlKey === true) ||
      // Permitir: home, end, left, right
      (charCode >= 35 && charCode <= 39)) {
      return true;
    }
    
    // Permitir solo letras (incluyendo acentos y ñ)
    const char = String.fromCharCode(charCode);
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]$/;
    if (!regex.test(char)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  /**
   * Limpia el valor del campo para que solo contenga números
   * Útil para cuando se pega texto con Ctrl+V
   * @param event - Evento de input
   */
  limpiarSoloNumeros(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorOriginal = input.value;
    const valorLimpio = valorOriginal.replace(/[^0-9]/g, '');
    
    if (valorOriginal !== valorLimpio) {
      input.value = valorLimpio;
    }
    
    // Actualizar el modelo
    if (input.id === 'cedula') {
      this.cliente.cedula = valorLimpio;
    } else if (input.id === 'telefono') {
      this.cliente.telefono = valorLimpio;
    }
  }

  /**
   * Limpia el valor del campo para que solo contenga letras y espacios
   * Útil para cuando se pega texto con Ctrl+V
   * @param event - Evento de input
   */
  limpiarSoloLetras(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorOriginal = input.value;
    const valorLimpio = valorOriginal.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    
    if (valorOriginal !== valorLimpio) {
      input.value = valorLimpio;
    }
    
    // Actualizar el modelo
    if (input.id === 'nombres') {
      this.cliente.nombres = valorLimpio;
    } else if (input.id === 'apellidos') {
      this.cliente.apellidos = valorLimpio;
    }
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
}


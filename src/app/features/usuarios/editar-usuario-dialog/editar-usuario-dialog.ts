import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { UsuariosService } from '../../../generated-api/api/usuarios.service';
import { EditarUsuarioRequestDTO } from '../../../generated-api/model/editarUsuarioRequestDTO';
import { UsuarioResponseSimpleDTO } from '../../../generated-api/model/usuarioResponseSimpleDTO';
import { ValidationService } from '../../../core/services/validation.service';

/**
 * Diálogo "Editar Usuario", abierto desde Usuarios (ver ViewChild en usuarios.ts).
 * username se muestra pero no se envía: el backend no permite cambiarlo (login inmutable).
 * El rol usa el mismo criterio de selector único que Crear Usuario, aunque el DTO
 * acepte un arreglo — no se pidió edición de múltiples roles a la vez.
 */
@Component({
  selector: 'app-editar-usuario-dialog',
  imports: [CommonModule, FormsModule, DialogModule, InputTextModule, SelectModule, ButtonModule],
  providers: [UsuariosService],
  templateUrl: './editar-usuario-dialog.html',
})
export class EditarUsuarioDialog {

  @Output() guardado = new EventEmitter<void>();

  visible: boolean = false;
  submitted: boolean = false;
  guardando: boolean = false;

  usuarioId?: number;
  usernameSoloLectura: string = '';
  usuario: EditarUsuarioRequestDTO = this.getEmptyUsuario();
  rolSeleccionado?: UsuarioResponseSimpleDTO.RolesEnum;

  rolesOptions: { label: string; value: UsuarioResponseSimpleDTO.RolesEnum }[] = [
    { label: 'Cajero', value: 'ROLE_CAJERO' as UsuarioResponseSimpleDTO.RolesEnum },
    { label: 'Presidente', value: 'ROLE_PRESIDENTE' as UsuarioResponseSimpleDTO.RolesEnum },
    { label: 'Secretario', value: 'ROLE_SECRETARIO' as UsuarioResponseSimpleDTO.RolesEnum },
    { label: 'Administrador', value: 'ROLE_ADMIN' as UsuarioResponseSimpleDTO.RolesEnum }
  ];

  constructor(
    private messageService: MessageService,
    private usuariosService: UsuariosService,
    private validationService: ValidationService
  ) { }

  abrirParaUsuario(usuario: UsuarioResponseSimpleDTO): void {
    this.usuarioId = usuario.idUsuario;
    this.usernameSoloLectura = usuario.username || '';
    this.usuario = {
      nombreCompleto: usuario.nombreCompleto || '',
      email: usuario.email,
      cedula: usuario.cedula || '',
      roles: usuario.roles ? [...usuario.roles] : []
    };
    this.rolSeleccionado = usuario.roles?.[0] as UsuarioResponseSimpleDTO.RolesEnum | undefined;
    this.submitted = false;
    this.visible = true;
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
  }

  ValidarCedulaValida(cedula: string): boolean {
    return this.validationService.validarCedula(cedula);
  }

  emailValido(): boolean {
    return this.validationService.validarEmail(this.usuario.email || '');
  }

  guardar(): void {
    this.submitted = true;

    if (!this.usuarioId) return;

    const camposVacios = this.validationService.validarCamposRequeridos({
      'Nombre completo': this.usuario.nombreCompleto,
      'Cédula': this.usuario.cedula
    });
    if (camposVacios.length > 0) {
      this.enviarMensajeAdvertencia(`Es obligatorio: ${camposVacios.join(', ')}`);
      return;
    }

    if (!this.ValidarCedulaValida(this.usuario.cedula)) {
      this.enviarMensajeAdvertencia('La cédula debe tener 10 dígitos');
      return;
    }

    if (this.usuario.email && !this.emailValido()) {
      this.enviarMensajeAdvertencia('El email no es válido');
      return;
    }

    if (!this.rolSeleccionado) {
      this.enviarMensajeAdvertencia('Debe seleccionar un rol');
      return;
    }

    this.usuario.roles = [this.rolSeleccionado];
    this.guardando = true;

    this.usuariosService.editarUsuario(this.usuario, this.usuarioId).subscribe({
      next: () => {
        this.guardando = false;
        this.enviarMensajeExito('Usuario actualizado correctamente');
        this.hideDialog();
        this.guardado.emit();
      },
      error: (error) => {
        this.guardando = false;
        this.enviarMensajeError(error.error?.message || 'No se pudo actualizar el usuario');
        console.error('Error editando usuario:', error);
      }
    });
  }

  // Mismo patrón que en Crear Usuario y en Clientes: solo dígitos en el campo de cédula
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
    const valorLimpio = input.value.replace(/[^0-9]/g, '');
    if (input.value !== valorLimpio) {
      input.value = valorLimpio;
    }
    this.usuario.cedula = valorLimpio;
  }

  private getEmptyUsuario(): EditarUsuarioRequestDTO {
    return { nombreCompleto: '', email: '', cedula: '', roles: [] };
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

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../../header/header';
import { Toast } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { UsuariosService } from '../../../generated-api/api/usuarios.service';
import { CrearUsuarioRequestDTO } from '../../../generated-api/model/crearUsuarioRequestDTO';
import { CrearUsuarioResponseDTO } from '../../../generated-api/model/crearUsuarioResponseDTO';
import { ValidationService } from '../../../core/services/validation.service';

/**
 * Alta de usuarios de personal interno (/usuarios/nuevo): único lugar del sistema donde
 * se elige deliberadamente el rol de un usuario nuevo. Protegida solo para ROLE_ADMIN
 * (ver roleGuard en app.routes.ts) — a diferencia de /auth/register, que es autoregistro
 * público y siempre asigna ROLE_CLIENTE.
 */
@Component({
  selector: 'app-crear-usuario',
  imports: [CommonModule, FormsModule, Header, Toast, ButtonModule, InputTextModule, PasswordModule, SelectModule],
  providers: [MessageService, UsuariosService],
  templateUrl: './crear-usuario.html',
})
export class CrearUsuario {

  usuario: CrearUsuarioRequestDTO = this.getEmptyUsuario();
  confirmarPassword: string = '';
  rolSeleccionado?: CrearUsuarioResponseDTO.RolesEnum;
  submitted: boolean = false;
  guardando: boolean = false;

  // Personal interno únicamente: ROLE_CLIENTE se asigna solo por /auth/register, nunca desde acá.
  roles: { label: string; value: CrearUsuarioResponseDTO.RolesEnum }[] = [
    { label: 'Cajero', value: 'ROLE_CAJERO' as CrearUsuarioResponseDTO.RolesEnum },
    { label: 'Presidente', value: 'ROLE_PRESIDENTE' as CrearUsuarioResponseDTO.RolesEnum },
    { label: 'Secretario', value: 'ROLE_SECRETARIO' as CrearUsuarioResponseDTO.RolesEnum },
    { label: 'Administrador', value: 'ROLE_ADMIN' as CrearUsuarioResponseDTO.RolesEnum }
  ];

  constructor(
    private messageService: MessageService,
    private usuariosService: UsuariosService,
    private validationService: ValidationService
  ) { }

  /** Indicador de fortaleza mínima: reutiliza validarPassword() de ValidationService (ya existía en el proyecto, sin usar todavía). */
  get erroresPassword(): string[] {
    if (!this.usuario.password) return [];
    return this.validationService.validarPassword(this.usuario.password, 6).errores;
  }

  get passwordsCoinciden(): boolean {
    return this.usuario.password === this.confirmarPassword;
  }

  emailValido(): boolean {
    return this.validationService.validarEmail(this.usuario.email || '');
  }

  /** Misma validación de formato (10 dígitos) que ya usa el formulario de Cliente, vía el mismo ValidationService compartido. */
  ValidarCedulaValida(cedula: string): boolean {
    return this.validationService.validarCedula(cedula);
  }

  // Igual patrón que clientes.ts: solo dígitos en el campo de cédula
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

  guardar(): void {
    this.submitted = true;

    const camposVacios = this.validationService.validarCamposRequeridos({
      'Nombre completo': this.usuario.nombreCompleto,
      'Usuario': this.usuario.username,
      'Cédula': this.usuario.cedula,
      'Contraseña': this.usuario.password,
      'Confirmar contraseña': this.confirmarPassword
    });
    if (camposVacios.length > 0) {
      this.enviarMensajeAdvertencia(`Es obligatorio: ${camposVacios.join(', ')}`);
      return;
    }

    if (!this.ValidarCedulaValida(this.usuario.cedula)) {
      this.enviarMensajeAdvertencia('La cédula debe tener 10 dígitos');
      return;
    }

    // Email es opcional: solo se valida el formato si el usuario escribió algo
    if (this.usuario.email && !this.emailValido()) {
      this.enviarMensajeAdvertencia('El email no es válido');
      return;
    }

    if (!this.validationService.validarPassword(this.usuario.password, 6).valido) {
      this.enviarMensajeAdvertencia('La contraseña no cumple los requisitos mínimos');
      return;
    }

    if (!this.passwordsCoinciden) {
      this.enviarMensajeAdvertencia('Las contraseñas no coinciden');
      return;
    }

    if (!this.rolSeleccionado) {
      this.enviarMensajeAdvertencia('Debe seleccionar un rol');
      return;
    }

    this.usuario.roles = [this.rolSeleccionado];
    this.guardando = true;

    this.usuariosService.crearUsuario(this.usuario).subscribe({
      next: (response) => {
        this.guardando = false;
        this.enviarMensajeExito(`Usuario "${response.username}" creado correctamente`);
        this.limpiarFormulario();
      },
      error: (error) => {
        this.guardando = false;
        // El backend redacta el mensaje exacto (ej. username o email duplicado); se muestra tal cual, sin genérico.
        this.enviarMensajeError(error.error?.message || 'No se pudo crear el usuario');
        console.error('Error creando usuario:', error);
      }
    });
  }

  /** Deja la pantalla lista para registrar otro usuario seguido, sin salir de /usuarios/nuevo. */
  limpiarFormulario(): void {
    this.usuario = this.getEmptyUsuario();
    this.confirmarPassword = '';
    this.rolSeleccionado = undefined;
    this.submitted = false;
  }

  private getEmptyUsuario(): CrearUsuarioRequestDTO {
    return { username: '', email: '', cedula: '', password: '', nombreCompleto: '', roles: [] };
  }

  private enviarMensajeError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 7000 });
  }

  private enviarMensajeExito(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail, life: 4000 });
  }

  private enviarMensajeAdvertencia(detail: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail, life: 3000 });
  }
}

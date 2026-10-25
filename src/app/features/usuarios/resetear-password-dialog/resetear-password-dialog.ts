import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { UsuariosService } from '../../../generated-api/api/usuarios.service';
import { UsuarioResponseSimpleDTO } from '../../../generated-api/model/usuarioResponseSimpleDTO';
import { ValidationService } from '../../../core/services/validation.service';

/**
 * Diálogo "Resetear Contraseña", abierto desde Usuarios (ver ViewChild en usuarios.ts).
 * Reseteo administrativo: no pide la contraseña anterior. Mismo componente p-password
 * con medidor de fortaleza y la misma validación (ValidationService.validarPassword)
 * que ya usa Crear Usuario, para no duplicar el criterio.
 */
@Component({
  selector: 'app-resetear-password-dialog',
  imports: [CommonModule, FormsModule, DialogModule, PasswordModule, ButtonModule],
  providers: [UsuariosService],
  templateUrl: './resetear-password-dialog.html',
})
export class ResetearPasswordDialog {

  @Output() reseteado = new EventEmitter<void>();

  visible: boolean = false;
  submitted: boolean = false;
  guardando: boolean = false;

  usuarioId?: number;
  nombreUsuario: string = '';
  nuevaPassword: string = '';
  confirmarPassword: string = '';

  constructor(
    private messageService: MessageService,
    private usuariosService: UsuariosService,
    private validationService: ValidationService
  ) { }

  get erroresPassword(): string[] {
    if (!this.nuevaPassword) return [];
    return this.validationService.validarPassword(this.nuevaPassword, 6).errores;
  }

  get passwordsCoinciden(): boolean {
    return this.nuevaPassword === this.confirmarPassword;
  }

  abrirParaUsuario(usuario: UsuarioResponseSimpleDTO): void {
    this.usuarioId = usuario.idUsuario;
    this.nombreUsuario = usuario.nombreCompleto || usuario.username || 'este usuario';
    this.nuevaPassword = '';
    this.confirmarPassword = '';
    this.submitted = false;
    this.visible = true;
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
  }

  guardar(): void {
    this.submitted = true;

    if (!this.usuarioId) return;

    if (!this.nuevaPassword || !this.confirmarPassword) {
      this.enviarMensajeAdvertencia('Debe ingresar y confirmar la nueva contraseña');
      return;
    }

    if (!this.validationService.validarPassword(this.nuevaPassword, 6).valido) {
      this.enviarMensajeAdvertencia('La contraseña no cumple los requisitos mínimos');
      return;
    }

    if (!this.passwordsCoinciden) {
      this.enviarMensajeAdvertencia('Las contraseñas no coinciden');
      return;
    }

    this.guardando = true;

    this.usuariosService.resetearPassword({ nuevaPassword: this.nuevaPassword }, this.usuarioId).subscribe({
      next: () => {
        this.guardando = false;
        this.enviarMensajeExito(`Contraseña actualizada para ${this.nombreUsuario}`);
        this.hideDialog();
        this.reseteado.emit();
      },
      error: (error) => {
        this.guardando = false;
        this.enviarMensajeError(error.error?.message || 'No se pudo resetear la contraseña');
        console.error('Error reseteando password:', error);
      }
    });
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

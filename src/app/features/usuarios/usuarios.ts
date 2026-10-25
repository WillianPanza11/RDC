import { Component, ViewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../header/header';
import { Toast } from 'primeng/toast';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialog, ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { UsuariosService } from '../../generated-api/api/usuarios.service';
import { UsuarioResponseSimpleDTO } from '../../generated-api/model/usuarioResponseSimpleDTO';
import { EditarUsuarioDialog } from './editar-usuario-dialog/editar-usuario-dialog';
import { ResetearPasswordDialog } from './resetear-password-dialog/resetear-password-dialog';

/**
 * Gestión completa de usuarios (/usuarios): listado, editar, desactivar/reactivar
 * y resetear contraseña. Protegida solo para ROLE_ADMIN (ver roleGuard en app.routes.ts).
 * listarUsuarios() sin roles trae la nómina completa (incluye cualquier usuario ligado
 * a un cliente, no solo personal interno) — no se filtra en el frontend porque el
 * endpoint ya define qué es "la nómina completa".
 */
@Component({
  selector: 'app-usuarios',
  imports: [
    CommonModule, FormsModule, Header, Toast, TableModule, ButtonModule, Tag, IconFieldModule,
    InputIconModule, InputTextModule, TooltipModule, ConfirmDialog, ConfirmDialogModule,
    EditarUsuarioDialog, ResetearPasswordDialog
  ],
  providers: [MessageService, ConfirmationService, UsuariosService],
  templateUrl: './usuarios.html',
})
export class Usuarios {

  usuarios: UsuarioResponseSimpleDTO[] = [];

  @ViewChild('dt') dt!: Table;
  @ViewChild(EditarUsuarioDialog) editarDialog!: EditarUsuarioDialog;
  @ViewChild(ResetearPasswordDialog) resetearDialog!: ResetearPasswordDialog;

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private usuariosService: UsuariosService
  ) {
    afterNextRender(() => {
      this.loadUsuarios();
    });
  }

  loadUsuarios(): void {
    this.usuariosService.listarUsuarios().subscribe({
      next: (data) => {
        this.usuarios = this.ordenarPorRecientes(data);
      },
      error: (error) => {
        this.enviarMensajeError('No se pudieron cargar los usuarios');
        console.error('Error loading usuarios:', error);
      }
    });
  }

  /**
   * Ordena por la fecha más reciente: ultimaActualizacion si existe (cubre tanto
   * crear como editar), y si no, fechaCreacion. Mismo criterio que ya se usa en
   * cuentas.ts. Solo define el orden inicial del arreglo: no interfiere con el
   * buscador ni con el ordenamiento manual por columna de la tabla (pSortableColumn).
   */
  private ordenarPorRecientes(usuarios: UsuarioResponseSimpleDTO[]): UsuarioResponseSimpleDTO[] {
    const fechaOrden = (usuario: UsuarioResponseSimpleDTO): number => {
      const fecha = usuario.ultimaActualizacion ?? usuario.fechaCreacion;
      return fecha ? new Date(fecha).getTime() : 0;
    };
    return [...usuarios].sort((a, b) => fechaOrden(b) - fechaOrden(a));
  }

  editarUsuario(usuario: UsuarioResponseSimpleDTO): void {
    this.editarDialog.abrirParaUsuario(usuario);
  }

  resetearPassword(usuario: UsuarioResponseSimpleDTO): void {
    this.resetearDialog.abrirParaUsuario(usuario);
  }

  onUsuarioEditado(): void {
    this.loadUsuarios();
  }

  /** Desactivar/Reactivar según el estado actual; el backend valida sus propias reglas (ver confirmarCambioEstado). */
  confirmarCambioEstado(usuario: UsuarioResponseSimpleDTO): void {
    if (!usuario.idUsuario) return;

    const activar = !usuario.enabled;
    this.confirmationService.confirm({
      message: activar
        ? `¿Está seguro que desea reactivar a ${usuario.nombreCompleto}?`
        : `¿Está seguro que desea desactivar a ${usuario.nombreCompleto}?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const accion$ = activar
          ? this.usuariosService.reactivarUsuario(usuario.idUsuario!)
          : this.usuariosService.desactivarUsuario(usuario.idUsuario!);

        accion$.subscribe({
          next: (response) => {
            const index = this.usuarios.findIndex(u => u.idUsuario === response.idUsuario);
            if (index !== -1) {
              this.usuarios[index] = response;
            }
            this.enviarMensajeExito(activar ? 'Usuario reactivado correctamente' : 'Usuario desactivado correctamente');
          },
          error: (error) => {
            // El backend redacta el motivo exacto (autodesactivación, último admin, caja abierta): se muestra tal cual, sin genérico.
            this.enviarMensajeError(error.error?.message || `No se pudo ${activar ? 'reactivar' : 'desactivar'} el usuario`);
            console.error('Error cambiando estado del usuario:', error);
          }
        });
      }
    });
  }

  getRolLabel(rol?: string): string {
    switch (rol) {
      case 'ROLE_ADMIN': return 'Administrador';
      case 'ROLE_CAJERO': return 'Cajero';
      case 'ROLE_PRESIDENTE': return 'Presidente';
      case 'ROLE_SECRETARIO': return 'Secretario';
      case 'ROLE_CLIENTE': return 'Cliente';
      default: return rol || '';
    }
  }

  /** Un color distinto por tipo de rol, mismo criterio que getSeverityTipoSocio() para Mayorista/Minorista en Clientes. */
  getSeverityRol(rol?: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    switch (rol) {
      case 'ROLE_ADMIN': return 'danger';
      case 'ROLE_PRESIDENTE': return 'warn';
      case 'ROLE_SECRETARIO': return 'info';
      case 'ROLE_CAJERO': return 'success';
      case 'ROLE_CLIENTE': return 'secondary';
      default: return 'secondary';
    }
  }

  exportCSV(): void {
    this.dt.exportCSV();
  }

  private enviarMensajeError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 7000 });
  }

  private enviarMensajeExito(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail, life: 3000 });
  }
}

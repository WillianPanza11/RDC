import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CierresDeCajaService } from '../../../generated-api/api/cierresDeCaja.service';
import { UsuariosService } from '../../../generated-api/api/usuarios.service';
import { CerrarCajaRequestDTO } from '../../../generated-api/model/cerrarCajaRequestDTO';

/**
 * Diálogo de cierre de caja, reutilizable desde MiCaja (mismo patrón que PagoFormDialog:
 * se abre ya sabiendo qué CierreCaja cerrar, vía abrirParaCierre(idCierre)).
 *
 * La diferencia se calcula como efectivoContado - totalCobrado (NO totalEsperado, que
 * incluye cuotas pendientes que nunca estuvieron físicamente en la caja). totalCobrado
 * se pide siempre fresco a obtenerResumen(idCierre) al abrir el diálogo, para no comparar
 * contra un dato que pudo quedar desactualizado mientras el cajero tenía la pantalla abierta.
 */
@Component({
  selector: 'app-cerrar-caja-dialog',
  imports: [CommonModule, FormsModule, DialogModule, SelectModule, InputNumberModule, Textarea, PasswordModule, ButtonModule],
  providers: [CierresDeCajaService, UsuariosService],
  templateUrl: './cerrar-caja-dialog.html',
})
export class CerrarCajaDialog {

  @Output() cerrado = new EventEmitter<void>();

  visible: boolean = false;
  submitted: boolean = false;
  cargandoResumen: boolean = true;

  idCierre?: number;
  totalCobrado?: number;
  efectivoContado?: number;
  observaciones: string = '';
  idAutorizador?: number;
  passwordAutorizador: string = '';

  /**
   * true cuando quien cierra NO es el dueño de la caja (ej. un Secretario
   * cerrándola en nombre de un cajero que no está disponible). Lo fija
   * abrirParaCierre() como segundo argumento, no un @Input(): el diálogo
   * se abre imperativamente vía @ViewChild, y un binding de @Input() seteado
   * justo antes de llamar al método no llega a tiempo (se propaga recién en
   * el siguiente ciclo de detección de cambios de Angular).
   */
  esCajaDeOtroCajero: boolean = false;

  autorizadores: { label: string; value: number }[] = [];

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cierresDeCajaService: CierresDeCajaService,
    private usuariosService: UsuariosService
  ) { }

  get diferencia(): number {
    return (this.efectivoContado ?? 0) - (this.totalCobrado ?? 0);
  }

  /** Umbral de centavo para evitar que errores de redondeo de punto flotante disparen el flujo de diferencia. */
  get hayDiferencia(): boolean {
    return Math.abs(this.diferencia) > 0.005;
  }

  /**
   * Observaciones obligatorias: cuando hay diferencia (flujo normal, el
   * dueño cierra su propia caja) O cuando se está cerrando la caja de otro
   * cajero, sin importar si hay diferencia o no (backend: ver
   * CierreCajaService.cerrarCaja()).
   */
  get requiereObservaciones(): boolean {
    return this.hayDiferencia || this.esCajaDeOtroCajero;
  }

  /**
   * Selector "Autorizado por": solo aplica al flujo normal del dueño con
   * diferencia. Si se está cerrando la caja de otro, quien ejecuta el
   * cierre YA es el autorizador (tiene el rol requerido) — no se le pide
   * que se autorice a sí mismo eligiéndose de una lista.
   */
  get requiereAutorizador(): boolean {
    return this.hayDiferencia && !this.esCajaDeOtroCajero;
  }

  abrirParaCierre(idCierre: number, esCajaDeOtroCajero: boolean = false): void {
    this.idCierre = idCierre;
    this.esCajaDeOtroCajero = esCajaDeOtroCajero;
    this.submitted = false;
    this.efectivoContado = undefined;
    this.observaciones = '';
    this.idAutorizador = undefined;
    this.passwordAutorizador = '';
    this.totalCobrado = undefined;
    this.cargandoResumen = true;
    this.visible = true;

    this.cierresDeCajaService.obtenerResumen(idCierre).subscribe({
      next: (resumen) => {
        this.totalCobrado = resumen.totalCobrado ?? 0;
        this.cargandoResumen = false;
      },
      error: (error) => {
        this.cargandoResumen = false;
        this.enviarMensajeError('No se pudo cargar el resumen de la caja');
        console.error('Error loading resumen para cierre:', error);
        this.visible = false;
      }
    });

    this.usuariosService.listarUsuarios(['ROLE_PRESIDENTE', 'ROLE_SECRETARIO', 'ROLE_ADMIN']).subscribe({
      next: (usuarios) => {
        this.autorizadores = usuarios
          .filter(u => !!u.idUsuario)
          .map(u => ({ label: u.nombreCompleto || `Usuario #${u.idUsuario}`, value: u.idUsuario! }));
      },
      error: (error) => {
        console.error('Error loading autorizadores:', error);
      }
    });
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
  }

  confirmarCierre(): void {
    this.submitted = true;

    if (!this.idCierre) return;

    if (this.efectivoContado === undefined || this.efectivoContado === null || this.efectivoContado < 0) {
      this.enviarMensajeAdvertencia('El efectivo contado es requerido');
      return;
    }

    if (this.requiereObservaciones && (!this.observaciones || this.observaciones.trim() === '')) {
      this.enviarMensajeAdvertencia(
        this.esCajaDeOtroCajero
          ? 'Las observaciones son obligatorias al cerrar la caja de otro cajero'
          : 'Las observaciones son obligatorias cuando hay diferencia'
      );
      return;
    }

    if (this.requiereAutorizador && !this.idAutorizador) {
      this.enviarMensajeAdvertencia('Debe seleccionar quién autoriza el cierre');
      return;
    }

    if (this.requiereAutorizador && !this.passwordAutorizador) {
      this.enviarMensajeAdvertencia('Quien autoriza debe ingresar su contraseña para confirmar');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Está seguro que desea cerrar la caja con ${this.formatCurrency(this.efectivoContado)} contados?`,
      header: 'Confirmar Cierre de Caja',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const body: CerrarCajaRequestDTO = {
          efectivoContado: this.efectivoContado!,
          ...(this.requiereObservaciones ? { observaciones: this.observaciones } : {}),
          ...(this.requiereAutorizador
            ? { idAutorizador: this.idAutorizador, passwordAutorizador: this.passwordAutorizador }
            : {})
        };

        this.cierresDeCajaService.cerrarCaja(body, this.idCierre!).subscribe({
          next: () => {
            this.visible = false;
            this.cerrado.emit();
          },
          error: (error) => {
            console.error('Error cerrando caja:', error);
            this.enviarMensajeError(error.error?.message || 'No se pudo cerrar la caja');
          }
        });
      }
    });
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(value);
  }

  private enviarMensajeError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 7000 });
  }

  private enviarMensajeAdvertencia(detail: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail, life: 3000 });
  }
}

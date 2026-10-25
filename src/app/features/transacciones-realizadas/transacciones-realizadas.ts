import { Component, OnInit, ViewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Header } from "../header/header";
import { Toast } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { Table, TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { Tag } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { TransaccionesDeAhorroService } from '../../generated-api/api/transaccionesDeAhorro.service';
import { TransaccionAhorroResponseDTO } from '../../generated-api/model/transaccionAhorroResponseDTO';
import { CuentasDeAhorroService } from '../../generated-api/api/cuentasDeAhorro.service';
import { CuentaAhorroResponseDTO } from '../../generated-api/model/cuentaAhorroResponseDTO';

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-transacciones-realizadas',
  standalone: true,
  imports: [
    CommonModule, Header, Toast, ButtonModule, ToolbarModule, TableModule, IconFieldModule,
    InputTextModule, InputIconModule, Tag, SelectModule, TooltipModule, FormsModule, MessageModule, 
  ],
  providers: [MessageService, TransaccionesDeAhorroService, CuentasDeAhorroService],
  templateUrl: './transacciones-realizadas.html',
  styleUrl: './transacciones-realizadas.css',
})
export class TransaccionesRealizadas implements OnInit {

  transacciones: TransaccionAhorroResponseDTO[] = [];
  transaccionesFiltradas: TransaccionAhorroResponseDTO[] = [];
  cargando: boolean = true;
  cuentas: CuentaAhorroResponseDTO[] = [];

  @ViewChild('dt') dt!: Table;
  cols: Column[] = [];

  // Filtros
  cuentaSeleccionada?: number;
  tipoTransaccionSeleccionado?: string;
  fechaInicio?: string;
  fechaFin?: string;

  tiposTransaccion: any[] = [
    { label: 'Todos', value: undefined },
    { label: 'Depósito', value: 'DEPOSITO' },
    { label: 'Retiro', value: 'RETIRO' }
  ];

  rows: number = 5;

  // Si se llega desde el hub de un cliente (/clientes/:id), se guarda para mostrar el breadcrumb "Volver a [cliente]"
  origenClienteId?: number;
  origenClienteNombre?: string;

  constructor(
    private messageService: MessageService,
    private transaccionService: TransaccionesDeAhorroService,
    private cuentaService: CuentasDeAhorroService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    afterNextRender(() => {
      this.loadCuentas();
    });
  }

  ngOnInit(): void {
    this.initializeColumns();

    const clienteIdParam = this.route.snapshot.queryParamMap.get('clienteId');
    if (clienteIdParam) {
      const idCliente = Number(clienteIdParam);
      if (!Number.isNaN(idCliente) && idCliente > 0) {
        this.origenClienteId = idCliente;
        this.origenClienteNombre = this.route.snapshot.queryParamMap.get('clienteNombre') || undefined;
      }
    }

    // Importante: setear `cuentaSeleccionada` ANTES del primer check para evitar NG0100
    const cuentaIdParam = this.route.snapshot.queryParamMap.get('cuentaId');
    if (cuentaIdParam) {
      const id = Number(cuentaIdParam);
      if (!Number.isNaN(id) && id > 0) {
        this.cuentaSeleccionada = id;
        this.loadTransaccionesPorCuenta(id);
        return;
      }
    }

    this.loadTransacciones();
  }

  volverAlCliente(): void {
    if (this.origenClienteId) {
      this.router.navigate(['/clientes', this.origenClienteId]);
    }
  }

  private initializeColumns(): void {
    this.cols = [
      { field: 'fechaTransaccion', header: 'Fecha' },
      { field: 'idCuenta', header: 'Número de Cuenta' },
      { field: 'tipoTransaccion', header: 'Tipo' },
      { field: 'descripcion', header: 'Descripción' },
      { field: 'monto', header: 'Monto' },
      { field: 'saldoAnterior', header: 'Saldo Anterior' },
      { field: 'saldoNuevo', header: 'Saldo Nuevo' },
      { field: 'metodoPago', header: 'Método de Pago' }
    ];
  }

  loadTransacciones(): void {
    this.cargando = true;
    this.transaccionService.obtenerTodasLasTransacciones().subscribe({
      next: (data) => {
        this.transacciones = data;
        this.transaccionesFiltradas = data;
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.enviarMensajeError('No se pudieron cargar las transacciones');
        console.error('Error loading transacciones:', error);
      }
    });
  }

  loadTransaccionesPorCuenta(cuentaId: number): void {
    this.cargando = true;
    this.transaccionService.obtenerTransaccionesPorCuenta(cuentaId).subscribe({
      next: (data) => {
        this.transacciones = data;
        this.transaccionesFiltradas = data;
        // Aplicar filtros automáticamente para mantener el filtro de cuenta
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.enviarMensajeError('No se pudieron cargar las transacciones de la cuenta');
        console.error('Error loading transacciones por cuenta:', error);
      }
    });
  }

  loadCuentas(): void {
    this.cuentaService.obtenerTodasLasCuentas().subscribe({
      next: (data) => {
        this.cuentas = data;
      },
      error: (error) => {
        console.error('Error loading cuentas:', error);
      }
    });
  }

  aplicarFiltros(): void {
    let filtradas = [...this.transacciones];

    // Filtrar por cuenta
    if (this.cuentaSeleccionada) {
      filtradas = filtradas.filter(t => t.idCuenta === this.cuentaSeleccionada);
    }

    // Filtrar por tipo de transacción
    if (this.tipoTransaccionSeleccionado) {
      filtradas = filtradas.filter(t => t.tipoTransaccion === this.tipoTransaccionSeleccionado);
    }

    // Filtrar por fecha inicio
    if (this.fechaInicio) {
      filtradas = filtradas.filter(t => {
        if (!t.fechaTransaccion) return false;
        const fechaTrans = new Date(t.fechaTransaccion);
        const fechaInicio = new Date(this.fechaInicio!);
        return fechaTrans >= fechaInicio;
      });
    }

    // Filtrar por fecha fin
    if (this.fechaFin) {
      filtradas = filtradas.filter(t => {
        if (!t.fechaTransaccion) return false;
        const fechaTrans = new Date(t.fechaTransaccion);
        const fechaFin = new Date(this.fechaFin!);
        fechaFin.setHours(23, 59, 59, 999); // Incluir todo el día
        return fechaTrans <= fechaFin;
      });
    }

    this.transaccionesFiltradas = filtradas;
  }

  limpiarFiltros(): void {
    this.cuentaSeleccionada = undefined;
    this.tipoTransaccionSeleccionado = undefined;
    this.fechaInicio = undefined;
    this.fechaFin = undefined;
    this.transaccionesFiltradas = [...this.transacciones];
  }

  exportCSV(): void {
    this.dt.exportCSV();
  }

  getSeverity(tipo?: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    switch (tipo) {
      case 'DEPOSITO':
        return 'success';
      case 'RETIRO':
        return 'danger';
      default:
        return 'info';
    }
  }

  getNombreCuenta(idCuenta?: number): string {
    if (!idCuenta) return '';
    const cuenta = this.cuentas.find(c => c.idCuenta === idCuenta);
    return cuenta ? cuenta.numeroCuenta || '' : '';
  }

  /**
   * Fase 2: navegar al hub del cliente dueño de la transacción.
   * TransaccionAhorroResponseDTO solo trae idCuenta, no idCliente. Se resuelve
   * primero contra `this.cuentas` (ya cargado en loadCuentas()); si por algún
   * motivo esa cuenta no está en memoria, se cae a obtenerCuentaPorId (ya usado
   * en Cuentas) en vez de agregar un endpoint nuevo.
   */
  verCliente(transaccion: TransaccionAhorroResponseDTO): void {
    if (!transaccion.idCuenta) {
      this.enviarMensajeError('No se pudo identificar la cuenta de la transacción');
      return;
    }

    const cuentaEnMemoria = this.cuentas.find(c => c.idCuenta === transaccion.idCuenta);
    if (cuentaEnMemoria?.idCliente) {
      this.router.navigate(['/clientes', cuentaEnMemoria.idCliente], { queryParams: { origen: 'transacciones-realizadas' } });
      return;
    }

    this.cuentaService.obtenerCuentaPorId(transaccion.idCuenta).subscribe({
      next: (cuenta) => {
        if (cuenta.idCliente) {
          this.router.navigate(['/clientes', cuenta.idCliente], { queryParams: { origen: 'transacciones-realizadas' } });
        } else {
          this.enviarMensajeError('No se pudo encontrar al cliente de la cuenta');
        }
      },
      error: (error) => {
        this.enviarMensajeError('No se pudo encontrar al cliente de la cuenta');
        console.error('Error resolving cuenta:', error);
      }
    });
  }

  enviarMensajeError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: detail,
      life: 3000
    });
  }

  enviarMensajeExito(detail: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: detail,
      life: 3000
    });
  }
}

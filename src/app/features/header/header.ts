import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { AuthService } from '../../core/services/auth.service';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { InputTextModule } from 'primeng/inputtext';
import { Ripple } from 'primeng/ripple';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';

const ROLES_ADMINISTRACION_CAJA = ['ROLE_PRESIDENTE', 'ROLE_SECRETARIO', 'ROLE_ADMIN'];
const ROLES_PERSONAL = ['ROLE_ADMIN', 'ROLE_CAJERO'];

@Component({
  selector: 'app-header',
  imports: [MenubarModule, AvatarModule, BadgeModule, InputTextModule, ButtonModule, MenuModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  constructor(protected authService: AuthService) { }

  items: MenuItem[] | undefined;
  ngOnInit() {
    // "Mi Caja" es para cualquier autenticado (cualquiera puede llegar a abrir una caja).
    // Los ítems de administración de caja no se muestran, aunque la ruta ya esté protegida
    // por el guard: doble protección, el enlace ni debe aparecer para quien no tiene el rol.
    const cajaSubItems: MenuItem[] = [
      {
        label: 'Mi Caja',
        icon: 'pi pi-wallet',
        iconStyle: { 'font-size': '1.5rem' },
        routerLink: '/caja'
      }
    ];

    if (this.authService.hasAnyRole(ROLES_ADMINISTRACION_CAJA)) {
      cajaSubItems.push(
        {
          label: 'Recaudo del Día',
          icon: 'pi pi-chart-bar',
          iconStyle: { 'font-size': '1.5rem' },
          routerLink: '/caja/recaudo-dia'
        },
        {
          label: 'Historial de Cierres',
          icon: 'pi pi-history',
          iconStyle: { 'font-size': '1.5rem' },
          routerLink: '/caja/historial'
        }
      );
    }

    this.items = [
      {
        //hacer mas grande logo y texto
        label: 'Reina del Cisne',
        icon: 'pi pi-building-columns',
        iconStyle: { 'font-size': '2.5rem' },
        styleClass: 'menu-logo', 
        routerLink: '/dashboard'
      },
      {
        label: 'Clientes',
        icon: 'pi pi-user-plus',
        iconStyle: { 'font-size': '1.5rem' },
        items: [
          {
            label: 'Listado',
            icon: 'pi pi-users',
            iconStyle: { 'font-size': '1.5rem' },
            routerLink: '/clientes'
          },
          {
            // Visible para cualquier autenticado, igual que el endpoint /api/clientes/en-mora (sin restricción de rol).
            label: 'Cartera Vencida',
            icon: 'pi pi-exclamation-triangle',
            iconStyle: { 'font-size': '1.5rem' },
            routerLink: '/clientes/en-mora'
          }
        ]
      },
      {
        label: 'Caja',
        icon: 'pi pi-briefcase',
        iconStyle: { 'font-size': '1.5rem' },
        items: cajaSubItems
      }
    ];

    // Cuentas, Préstamos y Pagos: sus listados por defecto son globales (toda la
    // cooperativa, no acotados a "lo mío") y así los exige el backend ahora
    // (CuentaAhorroService/PrestamoService/PagoPrestamoService.validarEsPersonal) —
    // reservado a personal. Mismo criterio que Caja arriba: el enlace tampoco
    // debe aparecer para quien no tiene el rol.
    if (this.authService.hasAnyRole(ROLES_PERSONAL)) {
      this.items.push(
        {
          label: 'Cuentas',
          icon: 'pi pi-money-bill',
          iconStyle: { 'font-size': '1.5rem' },
          items: [
            {
              label: 'Registros',
              icon: 'pi pi-address-book',
              iconStyle: { 'font-size': '1.5rem' },
              routerLink: '/cuentas'
            },
            {
              label: 'Transacciones',
              icon: 'pi pi-dollar',
              iconStyle: { 'font-size': '1.5rem' },
              routerLink: '/transacciones-realizadas'
            }
          ]
        },
        {
          label: 'Prestamos',
          icon: 'pi pi-wallet',
          iconStyle: { 'font-size': '1.5rem' },
          routerLink: '/prestamos'
        },
        {
          label: 'Pagos',
          icon: 'pi pi-money-bill',
          iconStyle: { 'font-size': '1.5rem' },
          routerLink: '/pagos'
        }
      );
    }

    // Gestión de usuarios: solo ROLE_ADMIN, igual criterio que el resto de opciones administrativas.
    if (this.authService.hasRole('ROLE_ADMIN')) {
      this.items.push({
        label: 'Usuarios',
        icon: 'pi pi-shield',
        iconStyle: { 'font-size': '1.5rem' },
        items: [
          {
            label: 'Listado',
            icon: 'pi pi-users',
            iconStyle: { 'font-size': '1.5rem' },
            routerLink: '/usuarios'
          },
          {
            label: 'Crear Usuario',
            icon: 'pi pi-user-plus',
            iconStyle: { 'font-size': '1.5rem' },
            routerLink: '/usuarios/nuevo'
          }
        ]
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}


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
        routerLink: '/clientes'
      },
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
      }
    ]
  }

  logout(): void {
    this.authService.logout();
  }
}


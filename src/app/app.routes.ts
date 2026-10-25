import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';

const ROLES_ADMINISTRACION_CAJA = ['ROLE_PRESIDENTE', 'ROLE_SECRETARIO', 'ROLE_ADMIN'];
const ROLES_PERSONAL = ['ROLE_ADMIN', 'ROLE_CAJERO'];

export const routes: Routes = [
  {
    path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },

  {
    path: 'clientes',
    loadComponent: () => import('./features/clientes/clientes').then(m => m.Clientes),
    canActivate: [authGuard]
  },
  {
    // Debe ir ANTES que 'clientes/:id': si no, el router interpreta "en-mora" como un idCliente.
    path: 'clientes/en-mora',
    loadComponent: () => import('./features/clientes/en-mora/en-mora').then(m => m.ClientesEnMora),
    canActivate: [authGuard]
  },
  {
    path: 'clientes/:id',
    loadComponent: () => import('./features/clientes/detalle/cliente-detalle').then(m => m.ClienteDetalle),
    canActivate: [authGuard]
  },
  {
    // El listado sin filtro es global (todas las cuentas de ahorro de toda la cooperativa):
    // reservado a personal, igual criterio que en el backend (CuentaAhorroService.validarEsPersonal).
    path: 'cuentas',
    loadComponent: () => import('./features/cuentas/cuentas').then(m => m.Cuentas),
    canActivate: [authGuard, roleGuard],
    data: { roles: ROLES_PERSONAL }
  },
  {
    // Misma razón que 'cuentas': carga el listado global de cuentas para armar los filtros.
    path: 'transacciones-realizadas',
    loadComponent: () => import('./features/transacciones-realizadas/transacciones-realizadas').then(m => m.TransaccionesRealizadas),
    canActivate: [authGuard, roleGuard],
    data: { roles: ROLES_PERSONAL }
  },
  {
    // El listado sin filtro es global (todos los préstamos de toda la cooperativa):
    // reservado a personal, igual criterio que en el backend (PrestamoService.validarEsPersonal).
    path: 'prestamos',
    loadComponent: () => import('./features/prestamos/prestamos').then(m => m.Prestamos),
    canActivate: [authGuard, roleGuard],
    data: { roles: ROLES_PERSONAL }
  },
  {
    // El listado sin filtro es global (todos los pagos de toda la cooperativa) y la pantalla
    // incluye "corregir pago": ambos reservados a personal, igual que en el backend
    // (PagoPrestamoService.validarEsPersonal / SecurityConfig de /api/pagos-prestamos/*/corregir).
    path: 'pagos',
    loadComponent: () => import('./features/pagos/pagos').then(m => m.Pagos),
    canActivate: [authGuard, roleGuard],
    data: { roles: ROLES_PERSONAL }
  },
  {
    path: 'caja',
    loadComponent: () => import('./features/caja/mi-caja/mi-caja').then(m => m.MiCaja),
    canActivate: [authGuard]
  },
  {
    path: 'caja/recaudo-dia',
    loadComponent: () => import('./features/caja/recaudo-dia/recaudo-dia').then(m => m.RecaudoDia),
    canActivate: [authGuard, roleGuard],
    data: { roles: ROLES_ADMINISTRACION_CAJA }
  },
  {
    path: 'caja/historial',
    loadComponent: () => import('./features/caja/historial-cierres/historial-cierres').then(m => m.HistorialCierres),
    canActivate: [authGuard, roleGuard],
    data: { roles: ROLES_ADMINISTRACION_CAJA }
  },
  {
    // Solo ROLE_ADMIN: ni Presidente ni Secretario pueden gestionar usuarios, ya confirmado en el backend.
    path: 'usuarios',
    loadComponent: () => import('./features/usuarios/usuarios').then(m => m.Usuarios),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },
  {
    path: 'usuarios/nuevo',
    loadComponent: () => import('./features/usuarios/crear-usuario/crear-usuario').then(m => m.CrearUsuario),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];


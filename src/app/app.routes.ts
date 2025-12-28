import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';

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
    path: 'cuentas',
    loadComponent: () => import('./features/cuentas/cuentas').then(m => m.Cuentas),
    canActivate: [authGuard]
  },
  {
    path: 'transacciones-realizadas',
    loadComponent: () => import('./features/transacciones-realizadas/transacciones-realizadas').then(m => m.TransaccionesRealizadas),
    canActivate: [authGuard]
  },
  {
    path: 'prestamos',
    loadComponent: () => import('./features/prestamos/prestamos').then(m => m.Prestamos),
    canActivate: [authGuard]
  },
  {
    path: 'pagos',
    loadComponent: () => import('./features/pagos/pagos').then(m => m.Pagos),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];


import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Ruta con parámetro dinámico (idCliente): no hay un conjunto fijo de IDs para
    // prerenderizar de antemano, así que se renderiza en el cliente (igual que el
    // resto de la app, que ya carga sus datos después de hidratar vía afterNextRender).
    path: 'clientes/:id',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];

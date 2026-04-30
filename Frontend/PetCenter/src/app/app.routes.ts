import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { DashboardComponent } from './components/Dashboard/dashboard';
import { PortalLayoutComponent } from './components/Portal/portal-layout/portal-layout';
import { PortalHomeComponent } from './components/Portal/views/home/home';
import { PortalAdopcionComponent } from './components/Portal/views/adopcion/adopcion';
import { PortalCitaComponent } from './components/Portal/views/cita/cita';
import { authGuard, noAuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Portal público (cliente, sin login)
  {
    path: '',
    component: PortalLayoutComponent,
    children: [
      { path: '', component: PortalHomeComponent },
      { path: 'adopcion', component: PortalAdopcionComponent },
      { path: 'cita', component: PortalCitaComponent }
    ]
  },

  // Login: bloqueado si ya tiene sesión
  { path: 'login', component: LoginComponent, canActivate: [noAuthGuard] },

  // Dashboard staff: requiere sesión
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

  // Catch-all
  { path: '**', redirectTo: '' }
];

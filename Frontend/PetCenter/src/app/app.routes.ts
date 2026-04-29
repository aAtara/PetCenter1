import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { DashboardComponent } from './components/Dashboard/dashboard';
import { PortalLayoutComponent } from './components/Portal/portal-layout/portal-layout';
import { PortalHomeComponent } from './components/Portal/views/home/home';
import { PortalAdopcionComponent } from './components/Portal/views/adopcion/adopcion';
import { PortalCitaComponent } from './components/Portal/views/cita/cita';

export const routes: Routes = [
  // Portal público (sin login, para clientes)
  {
    path: '',
    component: PortalLayoutComponent,
    children: [
      { path: '', component: PortalHomeComponent },
      { path: 'adopcion', component: PortalAdopcionComponent },
      { path: 'cita', component: PortalCitaComponent }
    ]
  },

  // Staff
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },

  // Catch-all → portal home
  { path: '**', redirectTo: '' }
];

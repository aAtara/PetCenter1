import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { App } from './app';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: App },
];

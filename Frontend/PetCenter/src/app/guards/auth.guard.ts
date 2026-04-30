import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Guard que protege rutas que requieren login.
 * Si no hay sesión activa, redirige al login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const raw = sessionStorage.getItem('usuario');

  if (!raw) {
    // Guarda a dónde quería ir para volver tras login
    router.navigate(['/login'], { queryParams: { redirect: state.url } });
    return false;
  }

  try {
    JSON.parse(raw); // valida que el JSON no esté corrupto
    return true;
  } catch {
    sessionStorage.removeItem('usuario');
    router.navigate(['/login']);
    return false;
  }
};

/**
 * Guard que sólo permite ciertos roles.
 * Uso: { path: 'admin', canActivate: [roleGuard(['admin'])] }
 */
export const roleGuard = (rolesPermitidos: string[]): CanActivateFn => {
  return (route, state) => {
    const router = inject(Router);
    const raw = sessionStorage.getItem('usuario');

    if (!raw) {
      router.navigate(['/login']);
      return false;
    }

    try {
      const usuario = JSON.parse(raw);
      if (!rolesPermitidos.includes(usuario.rol)) {
        // Tiene sesión pero rol incorrecto → fuera al portal público
        router.navigate(['/']);
        return false;
      }
      return true;
    } catch {
      router.navigate(['/login']);
      return false;
    }
  };
};

/**
 * Guard inverso: si YA estás logueado, no te deja ver /login.
 * Te manda directo al dashboard.
 */
export const noAuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  const raw = sessionStorage.getItem('usuario');
  if (raw) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PetcenterService } from '../../services/petcenter.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email = '';
  password = '';
  recordar = false;
  error = '';
  cargando = false;
  mostrarModal = false;

  constructor(
    private router: Router,
    private petService: PetcenterService
  ) { }

  iniciarSesion() {
    if (!this.email || !this.password) {
      this.error = 'Por favor ingresa tu email y contraseña.';
      this.mostrarModal = true;
      return;
    }

    this.cargando = true;
    this.error = '';

    this.petService.login(this.email, this.password).subscribe({
      next: (usuarios) => {
        this.cargando = false;

        if (usuarios.length === 0) {
          this.error = 'Email o contraseña incorrectos. Verifica tus datos e intenta de nuevo.';
          this.mostrarModal = true;
          return;
        }

        const usuario = usuarios[0];
        sessionStorage.setItem('usuario', JSON.stringify(usuario));
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.cargando = false;
        this.error = 'No se pudo conectar al servidor. Verifica que Docker esté corriendo.';
        this.mostrarModal = true;
      }
    });
  }

  cerrarModal() {
    this.mostrarModal = false;
  }
}

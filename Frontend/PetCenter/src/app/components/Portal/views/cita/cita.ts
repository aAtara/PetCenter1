import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PetcenterService } from '../../../../services/petcenter.service';
import { Veterinario } from '../../../../models/veterinariomodel';

interface FormCita {
  nombre: string;
  mascota: string;
  email: string;
  telefono: string;
  fecha: string;
  hora: string;
  tipo: string;
  motivo: string;
}

@Component({
  selector: 'app-portal-cita',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cita.html',
  styleUrl: './cita.css'
})
export class PortalCitaComponent implements OnInit {
  veterinarios: Veterinario[] = [];
  vetSeleccionado: Veterinario | null = null;

  form: FormCita = this.formVacio();
  enviando = false;
  errorMsg = '';

  // Pantalla de confirmación
  confirmado = false;
  resumen: any = null;

  horas = ['09:00','10:00','11:00','12:00','15:00','16:00','17:00'];

  constructor(private petService: PetcenterService) {}

  ngOnInit() {
    this.petService.getVeterinariosActivos().subscribe({
      next: (v) => { this.veterinarios = v; }
    });
  }

  formVacio(): FormCita {
    return { nombre:'', mascota:'', email:'', telefono:'', fecha:'', hora:'', tipo:'', motivo:'' };
  }

  seleccionarVet(v: Veterinario) {
    this.vetSeleccionado = v;
  }

  emojiEspecialidad(esp?: string): string {
    const e = (esp || '').toLowerCase();
    if (e.includes('cirug')) return '🩺';
    if (e.includes('dermat')) return '🧴';
    return '👩‍⚕️';
  }

  cssEspecialidad(esp?: string): string {
    const e = (esp || '').toLowerCase();
    if (e.includes('cirug')) return 'esp-cirugia';
    if (e.includes('dermat')) return 'esp-dermato';
    return 'esp-general';
  }

  reservar() {
    if (!this.vetSeleccionado) {
      this.errorMsg = 'Por favor selecciona un veterinario.';
      return;
    }
    if (!this.form.nombre || !this.form.email || !this.form.fecha || !this.form.hora) {
      this.errorMsg = 'Completa nombre, email, fecha y hora.';
      return;
    }
    this.enviando = true;
    this.errorMsg = '';

    const payload = {
      veterinario_id: this.vetSeleccionado.id,
      nombre_dueno: this.form.nombre,
      nombre_mascota: this.form.mascota || null,
      email: this.form.email,
      telefono: this.form.telefono || null,
      fecha: this.form.fecha,
      hora: this.form.hora,
      tipo_mascota: this.form.tipo || null,
      motivo: this.form.motivo || null,
      estado: 'pendiente'
    };

    this.petService.crearCita(payload).subscribe({
      next: () => {
        this.enviando = false;
        this.confirmado = true;
        this.resumen = {
          vet: this.vetSeleccionado!.nombre,
          dueno: this.form.nombre,
          mascota: this.form.mascota || '—',
          fecha: this.formatearFecha(this.form.fecha),
          hora: this.form.hora,
          email: this.form.email
        };
        window.scrollTo(0, 0);
      },
      error: () => {
        this.enviando = false;
        this.errorMsg = 'No se pudo crear la cita. Intenta más tarde.';
      }
    });
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  reset() {
    this.form = this.formVacio();
    this.vetSeleccionado = null;
    this.confirmado = false;
    this.resumen = null;
    this.errorMsg = '';
    window.scrollTo(0, 0);
  }
}

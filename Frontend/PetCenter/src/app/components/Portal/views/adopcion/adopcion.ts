import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PetcenterService } from '../../../../services/petcenter.service';

interface FormAdopcion {
  nombre: string;
  email: string;
  telefono: string;
  ciudad: string;
  vivienda: string;
  prev: string;
}

@Component({
  selector: 'app-portal-adopcion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './adopcion.html',
  styleUrl: './adopcion.css'
})
export class PortalAdopcionComponent implements OnInit {
  mascotas: any[] = [];
  cargando = true;
  filtro: 'todos' | 'perro' | 'gato' | 'conejo' | 'otro' = 'todos';

  // Modal
  modalAbierto = false;
  modalExito = false;
  enviando = false;
  mascotaSeleccionada: any = null;
  errorMsg = '';

  form: FormAdopcion = this.formVacio();

  constructor(private petService: PetcenterService) {}

  ngOnInit() { this.cargarMascotas(); }

  cargarMascotas() {
    this.cargando = true;
    this.petService.getMascotasDetalle().subscribe({
      next: (data) => { this.mascotas = data; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  get mascotasFiltradas() {
    if (this.filtro === 'todos') return this.mascotas;
    return this.mascotas.filter(m =>
      (m.raza_especie || '').toLowerCase() === this.filtro
    );
  }

  emojiEspecie(especie: string): string {
    const map: Record<string, string> = { perro: '🐶', gato: '🐱', conejo: '🐰' };
    return map[(especie || '').toLowerCase()] || '🐾';
  }

  bgEspecie(especie: string): string {
    const map: Record<string, string> = {
      perro: '#fef3c7', gato: '#e0e7ff', conejo: '#fce7f3', otro: '#e0f2fe'
    };
    return map[(especie || '').toLowerCase()] || '#f1f5f9';
  }

  abrirModal(mascota: any) {
    this.mascotaSeleccionada = mascota;
    this.form = this.formVacio();
    this.errorMsg = '';
    this.modalExito = false;
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.modalExito = false;
  }

  formVacio(): FormAdopcion {
    return { nombre: '', email: '', telefono: '', ciudad: '', vivienda: '', prev: '' };
  }

  enviarSolicitud() {
    if (!this.form.nombre || !this.form.email) {
      this.errorMsg = 'Por favor completa al menos tu nombre y correo.';
      return;
    }
    this.enviando = true;
    this.errorMsg = '';

    // Comentario que llega al staff
    const comentarios = [
      `Solicitud pública para ${this.mascotaSeleccionada?.nombre}`,
      `Nombre: ${this.form.nombre}`,
      `Email: ${this.form.email}`,
      this.form.telefono ? `Tel: ${this.form.telefono}` : '',
      this.form.ciudad ? `Ciudad: ${this.form.ciudad}` : '',
      this.form.vivienda ? `Vivienda: ${this.form.vivienda}` : '',
      this.form.prev ? `Mascotas previas: ${this.form.prev}` : ''
    ].filter(Boolean).join(' · ');

    // Para la versión "tranquila": creamos solicitud con usuario_id null
    // o usuario admin (id=1). El staff verá los datos en el comentario.
    const solicitud = {
      mascota_id: this.mascotaSeleccionada?.id,
      usuario_id: 2, // Juan Pérez por defecto, hasta tener usuarios cliente
      estado: 'pendiente',
      comentarios_admin: comentarios
    };

    this.petService.crearSolicitud(solicitud as any).subscribe({
      next: () => { this.enviando = false; this.modalExito = true; },
      error: () => {
        this.enviando = false;
        this.errorMsg = 'No se pudo enviar la solicitud. Intenta más tarde.';
      }
    });
  }
}

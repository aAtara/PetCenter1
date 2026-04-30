import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
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
  filtro: 'todos' | 'perro' | 'gato' | 'otro' = 'todos';

  // Modal
  modalAbierto = false;
  modalExito = false;
  enviando = false;
  mascotaSeleccionada: any = null;
  errorMsg = '';

  form: FormAdopcion = this.formVacio();

  constructor(
    private petService: PetcenterService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

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
    const map: Record<string, string> = { perro: '🐶', gato: '🐱' };
    return map[(especie || '').toLowerCase()] || '🐾';
  }

  bgEspecie(especie: string): string {
    const map: Record<string, string> = {
      perro: '#fef3c7', gato: '#e0e7ff', otro: '#e0f2fe'
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

    const solicitud = {
      mascota_id: Number(this.mascotaSeleccionada?.id),
      nombre_solicitante: this.form.nombre,
      email_solicitante: this.form.email,
      telefono: this.form.telefono || undefined,
      ciudad: this.form.ciudad || undefined,
      vivienda: this.form.vivienda || undefined,
      mascotas_previas: this.form.prev || undefined
    };

    this.petService.crearSolicitud(solicitud).subscribe({
      next: (res) => {
        console.log('[enviarSolicitud] ÉXITO:', res);
        this.zone.run(() => {
          this.enviando = false;
          this.modalExito = true;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('[enviarSolicitud] error:', err);
        this.zone.run(() => {
          this.enviando = false;
          this.errorMsg = `Error: ${err?.error?.message || 'No se pudo enviar la solicitud'}`;
          this.cdr.detectChanges();
        });
      }
    });
  }
}

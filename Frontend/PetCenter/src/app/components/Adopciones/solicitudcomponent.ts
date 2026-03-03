import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PetcenterService } from '../../../core/services/petcenter.service';
import { Mascota } from '../../../models/mascota.model';

@Component({
  selector: 'app-formulario-solicitud',
  templateUrl: './formulario-solicitud.component.html',
  styleUrl: './formulario-solicitud.component.css'
})
export class FormularioSolicitudComponent implements OnInit {

  // ── Estado ──────────────────────────────────
  mascota: Mascota | null = null;
  cargando = true;
  enviando = false;
  enviado = false;
  error = '';

  // ── Datos del formulario ─────────────────────
  comentarios = '';

  // ── IDs necesarios ───────────────────────────
  mascotaId = '';
  usuarioId = '';            // vendrá del servicio de auth cuando lo implementen

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private petService: PetcenterService
  ) { }

  // ── Ciclo de vida ────────────────────────────
  ngOnInit(): void {
    this.mascotaId = this.route.snapshot.paramMap.get('id') || '';
    this.usuarioId = 'uuid-del-usuario-logueado'; // reemplazar con auth
    this.cargarMascota();
  }

  // ── Métodos ──────────────────────────────────
  cargarMascota(): void {
    this.petService.getMascotaPorId(this.mascotaId).subscribe({
      next: (data) => {
        this.mascota = data[0];
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la mascota';
        this.cargando = false;
      }
    });
  }

  enviarSolicitud(): void {
    if (!this.mascotaId || !this.usuarioId) return;

    this.enviando = true;

    const solicitud = {
      usuario_id: this.usuarioId,
      mascota_id: this.mascotaId,
      comentarios_admin: this.comentarios || null
    };

    this.petService.crearSolicitud(solicitud).subscribe({
      next: () => {
        this.enviado = true;
        this.enviando = false;
      },
      error: () => {
        this.error = 'Error al enviar la solicitud, intenta de nuevo';
        this.enviando = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/mascotas']);
  }
}

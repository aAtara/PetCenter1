import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PetcenterService } from '../../services/petcenter.service';
import { Solicitud, CrearSolicitud } from '../../models/solicitudmodel';
import { Mascota } from '../../models/mascotamodel';

@Component({
  selector: 'app-solicitud',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitudcomponent.html',
  styleUrls: ['./solicitudcomponent.css']
})
export class SolicitudComponent implements OnInit {
  solicitudes: Solicitud[] = [];
  mascotasDisponibles: Mascota[] = [];
  cargando = true;
  enviando = false;
  error = '';
  exito = '';

  // ID de usuario hardcodeado por ahora (luego vendrá del login)
  usuarioId = '1';

  nuevaSolicitud: CrearSolicitud = {
    usuario_id: this.usuarioId,
    mascota_id: '',
    comentarios_admin: ''
  };

  constructor(private petcenterService: PetcenterService) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.petcenterService.getMascotasDisponibles().subscribe({
      next: (mascotas) => {
        this.mascotasDisponibles = mascotas;
        this.cargando = false;
      },
      error: () => {
        this.error = 'Error al cargar mascotas disponibles.';
        this.cargando = false;
      }
    });

    this.petcenterService.getSolicitudesPorUsuario(this.usuarioId).subscribe({
      next: (solicitudes) => {
        this.solicitudes = solicitudes;
      }
    });
  }

  enviarSolicitud(): void {
    if (!this.nuevaSolicitud.mascota_id) {
      this.error = 'Selecciona una mascota para continuar.';
      return;
    }

    this.enviando = true;
    this.error = '';
    this.exito = '';

    this.petcenterService.crearSolicitud(this.nuevaSolicitud).subscribe({
      next: () => {
        this.exito = '¡Solicitud enviada correctamente! Te contactaremos pronto.';
        this.enviando = false;
        this.nuevaSolicitud.mascota_id = '';
        this.nuevaSolicitud.comentarios_admin = '';
        this.cargarDatos();
      },
      error: () => {
        this.error = 'Error al enviar la solicitud. Intenta de nuevo.';
        this.enviando = false;
      }
    });
  }

  getEstadoBadge(estado: string): string {
    const clases: Record<string, string> = {
      pendiente: 'badge-pendiente',
      aprobada: 'badge-aprobada',
      rechazada: 'badge-rechazada'
    };
    return clases[estado] ?? '';
  }
}

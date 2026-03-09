import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PetcenterService } from '../../services/petcenter.service';

@Component({
  selector: 'app-mascotas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mascotascomponent.html',
  styleUrls: ['./mascotascomponent.css']
})
export class MascotasComponent implements OnInit {
  mascotas: any[] = [];
  cargando = true;
  error = '';

  constructor(private petcenterService: PetcenterService) { }

  ngOnInit(): void {
    this.cargarMascotas();
  }

  cargarMascotas(): void {
    this.cargando = true;
    this.petcenterService.getMascotasDetalle().subscribe({
      next: (data) => {
        this.mascotas = data;
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las mascotas. Verifica que el servidor esté corriendo.';
        this.cargando = false;
        console.error(err);
      }
    });
  }

  getEstadoClase(estado: string): string {
    const clases: Record<string, string> = {
      disponible: 'estado-disponible',
      en_proceso: 'estado-proceso',
      adoptado: 'estado-adoptado'
    };
    return clases[estado] ?? '';
  }
}

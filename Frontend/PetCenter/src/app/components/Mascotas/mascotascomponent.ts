import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PetcenterService } from '../../../core/services/petcenter.service';
import { Mascota } from '../../../models/mascotamodel';

@Component({
  selector: 'app-lista-mascotas',
  templateUrl: './lista-mascotas.component.html',
  styleUrl: './lista-mascotas.component.css'
})
export class ListaMascotasComponent implements OnInit {

  // ── Estado ──────────────────────────────────
  mascotas: Mascota[] = [];
  mascotasFiltradas: Mascota[] = [];
  cargando = true;
  error = '';

  // ── Filtros ──────────────────────────────────
  filtroEspecie = '';
  filtroGenero = '';
  filtroNombre = '';

  constructor(
    private petService: PetcenterService,
    private router: Router
  ) { }

  // ── Ciclo de vida ────────────────────────────
  ngOnInit(): void {
    this.cargarMascotas();
  }

  // ── Métodos ──────────────────────────────────
  cargarMascotas(): void {
    this.cargando = true;
    this.petService.getMascotas().subscribe({
      next: (data) => {
        this.mascotas = data;
        this.mascotasFiltradas = data;
        this.cargando = false;
      },
      error: () => {
        this.error = 'Error al cargar las mascotas';
        this.cargando = false;
      }
    });
  }

  filtrar(): void {
    this.mascotasFiltradas = this.mascotas.filter(m => {
      const coincideNombre = m.nombre.toLowerCase()
        .includes(this.filtroNombre.toLowerCase());
      const coincideGenero = this.filtroGenero ? m.genero === this.filtroGenero : true;
      return coincideNombre && coincideGenero;
    });
  }

  verDetalle(id: string): void {
    this.router.navigate(['/mascotas', id]);
  }

  limpiarFiltros(): void {
    this.filtroNombre = '';
    this.filtroGenero = '';
    this.mascotasFiltradas = this.mascotas;
  }
}

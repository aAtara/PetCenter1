import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PetcenterService, Usuario } from '../../services/petcenter.service';
import { Veterinario, ConsultaDetalle, CrearConsulta, CrearVeterinario } from '../../models/veterinariomodel';

interface Stats {
  total: number;
  disponibles: number;
  enProceso: number;
  adoptados: number;
  solicitudesPendientes: number;
  consultas: number;
}

type Seccion =
  | 'inicio'
  | 'mascotas_completo'
  | 'mascotas_disponibles'
  | 'estadisticas'
  | 'solicitudes_pendientes'
  | 'adoptantes'
  | 'veterinario'
  | 'historial_mascota'
  | 'mascotas'
  | 'solicitudes';

type TabHist = 'resumen' | 'consultas' | 'tratamientos' | 'vacunacion' | 'galeria';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  usuario: Usuario | null = null;
  cargando = true;
  stats: Stats = { total: 0, disponibles: 0, enProceso: 0, adoptados: 0, solicitudesPendientes: 0, consultas: 0 };
  ultimasMascotas: any[] = [];
  seccionActiva: Seccion = 'inicio';

  // Veterinario
  veterinarios: Veterinario[] = [];
  consultas: ConsultaDetalle[] = [];
  mascotas: any[] = [];
  cargandoVet = false;
  tabVet: 'consultas' | 'veterinarios' = 'consultas';

  // Formulario nueva consulta
  mostrarFormConsulta = false;
  nuevaConsulta: CrearConsulta = this.consultaVacia();

  // Formulario nuevo veterinario
  mostrarFormVet = false;
  nuevoVet: CrearVeterinario = this.vetVacio();

  mensaje = '';

  // Barra lateral plegable
  sidebarCollapsed = false;

  // Historial mascota - tab activo y filas expandidas
  tabHist: TabHist = 'resumen';
  filasExpandidas: Record<string, boolean> = { r1: true };

  toggleFila(id: string) {
    this.filasExpandidas[id] = !this.filasExpandidas[id];
  }

  constructor(private router: Router, private petService: PetcenterService) {}

  ngOnInit() {
    const raw = sessionStorage.getItem('usuario');
    if (!raw) { this.router.navigate(['/login']); return; }
    this.usuario = JSON.parse(raw);
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.petService.getMascotasDetalle().subscribe({
      next: (mascotas) => {
        this.mascotas = mascotas;
        this.stats.total       = mascotas.length;
        this.stats.disponibles = mascotas.filter(m => m.estado === 'disponible').length;
        this.stats.enProceso   = mascotas.filter(m => m.estado === 'en_proceso').length;
        this.stats.adoptados   = mascotas.filter(m => m.estado === 'adoptado').length;
        this.ultimasMascotas   = [...mascotas]
          .sort((a, b) => new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime())
          .slice(0, 5);
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
    this.petService.getSolicitudes().subscribe({
      next: (sols) => { this.stats.solicitudesPendientes = sols.filter(s => s.estado === 'pendiente').length; }
    });
    this.petService.getConsultas().subscribe({
      next: (c) => { this.stats.consultas = c.length; }
    });
  }

  irA(seccion: Seccion) {
    this.seccionActiva = seccion;
    if (seccion === 'veterinario') this.cargarVeterinario();
  }

  cargarVeterinario() {
    this.cargandoVet = true;
    this.petService.getVeterinarios().subscribe({ next: (v) => { this.veterinarios = v; } });
    this.petService.getConsultas().subscribe({
      next: (c) => { this.consultas = c; this.cargandoVet = false; },
      error: () => { this.cargandoVet = false; }
    });
  }

  consultaVacia(): CrearConsulta {
    return { mascota_id: 0, veterinario_id: undefined, fecha: new Date().toISOString().slice(0, 16), motivo: '', diagnostico: '', tratamiento: '', notas: '' };
  }

  abrirFormConsulta() { this.nuevaConsulta = this.consultaVacia(); this.mostrarFormConsulta = true; }

  guardarConsulta() {
    if (!this.nuevaConsulta.mascota_id || !this.nuevaConsulta.motivo) { this.mensaje = 'Selecciona una mascota e indica el motivo.'; return; }
    const payload: CrearConsulta = { ...this.nuevaConsulta, mascota_id: Number(this.nuevaConsulta.mascota_id), veterinario_id: this.nuevaConsulta.veterinario_id ? Number(this.nuevaConsulta.veterinario_id) : undefined };
    this.petService.crearConsulta(payload).subscribe({
      next: () => { this.mostrarFormConsulta = false; this.mensaje = 'Consulta registrada ✅'; this.cargarVeterinario(); setTimeout(() => this.mensaje = '', 2500); },
      error: () => { this.mensaje = 'Error al guardar la consulta.'; }
    });
  }

  eliminarConsulta(id: number) {
    if (!confirm('¿Eliminar esta consulta?')) return;
    this.petService.eliminarConsulta(id).subscribe({ next: () => this.cargarVeterinario() });
  }

  vetVacio(): CrearVeterinario { return { nombre: '', especialidad: '', telefono: '', email: '', activo: true }; }
  abrirFormVet() { this.nuevoVet = this.vetVacio(); this.mostrarFormVet = true; }

  guardarVet() {
    if (!this.nuevoVet.nombre) { this.mensaje = 'El nombre es obligatorio.'; return; }
    this.petService.crearVeterinario(this.nuevoVet).subscribe({
      next: () => { this.mostrarFormVet = false; this.mensaje = 'Veterinario registrado ✅'; this.cargarVeterinario(); setTimeout(() => this.mensaje = '', 2500); },
      error: () => { this.mensaje = 'Error al guardar el veterinario.'; }
    });
  }

  toggleVet(v: Veterinario) {
    this.petService.actualizarVeterinario(v.id, { activo: !v.activo }).subscribe({ next: () => this.cargarVeterinario() });
  }

  cerrarSesion() { sessionStorage.removeItem('usuario'); this.router.navigate(['/login']); }

  get esAdmin(): boolean { return this.usuario?.rol === 'admin'; }
  get iniciales(): string {
    if (!this.usuario?.nombre) return '?';
    return this.usuario.nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
}

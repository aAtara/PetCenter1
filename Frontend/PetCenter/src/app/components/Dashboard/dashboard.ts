import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PetcenterService, Usuario } from '../../services/petcenter.service';
import { Veterinario, ConsultaDetalle, CrearConsulta, CrearVeterinario } from '../../models/veterinariomodel';
import { SolicitudDetalle } from '../../models/solicitudmodel';

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
  filasExpandidas: Record<string, boolean> = {};

  toggleFila(id: string) {
    this.filasExpandidas[id] = !this.filasExpandidas[id];
  }

  // ─── Detalle de mascota (datos reales) ───
  mascotaSeleccionada: any = null;
  cargandoDetalle = false;
  consultasMascota: any[] = [];
  solicitudesMascota: SolicitudDetalle[] = [];

  verDetalleMascota(m: any) {
    this.mascotaSeleccionada = m;
    this.tabHist = 'resumen';
    this.seccionActiva = 'historial_mascota';
    this.cargarDetalleMascota(m.id);
    this.cdr.detectChanges();
  }

  cargarDetalleMascota(mascotaId: number) {
    this.cargandoDetalle = true;
    // Consultas veterinarias de esta mascota
    this.petService.getConsultas().subscribe({
      next: (todas) => {
        this.consultasMascota = todas
          .filter(c => c.mascota_id === mascotaId)
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        this.cargandoDetalle = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoDetalle = false; }
    });
    // Solicitudes asociadas
    this.solicitudesMascota = this.solicitudes.filter(s => s.mascota_id === mascotaId);
  }

  /** Edad legible de la mascota */
  edadLegible(meses: number): string {
    if (!meses) return '—';
    if (meses < 12) return `${meses} meses`;
    const anios = Math.floor(meses / 12);
    const m = meses % 12;
    return m === 0 ? `${anios} año${anios > 1 ? 's' : ''}` : `${anios} año${anios > 1 ? 's' : ''} ${m} mes${m > 1 ? 'es' : ''}`;
  }

  emojiEspecie(especie?: string): string {
    const e = (especie || '').toLowerCase();
    if (e === 'gato') return '🐱';
    if (e === 'perro') return '🐶';
    return '🐾';
  }

  // ─── Solicitudes (datos reales) ───
  solicitudes: SolicitudDetalle[] = [];
  cargandoSolicitudes = false;
  filtroSol: 'todas' | 'pendiente' | 'aprobada' | 'rechazada' = 'todas';

  // ─── Filtro mascotas ───
  filtroMascota: 'todas' | 'disponible' | 'en_proceso' | 'adoptado' = 'todas';
  busquedaMascota = '';

  get mascotasFiltradas(): any[] {
    if (this.filtroMascota === 'todas') return this.mascotas;
    return this.mascotas.filter(m => m.estado === this.filtroMascota);
  }

  get mascotasBuscadas(): any[] {
    let lista = this.mascotasFiltradas;
    const q = (this.busquedaMascota || '').trim().toLowerCase();
    if (q) {
      lista = lista.filter(m =>
        (m.nombre || '').toLowerCase().includes(q) ||
        (m.raza_nombre || '').toLowerCase().includes(q) ||
        (m.raza_especie || '').toLowerCase().includes(q)
      );
    }
    return lista;
  }

  eliminarMascotaConfirm(m: any) {
    if (!confirm(`¿Eliminar a ${m.nombre}? Esta acción no se puede deshacer.`)) return;
    this.petService.eliminarMascota(String(m.id)).subscribe({
      next: () => {
        this.zone.run(() => {
          this.mensaje = `Mascota "${m.nombre}" eliminada`;
          this.cargarDatos();
          this.cdr.detectChanges();
          setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 2500);
        });
      },
      error: (err) => {
        console.error('[eliminarMascota] error:', err);
        this.zone.run(() => {
          this.mensaje = 'No se pudo eliminar (puede tener solicitudes asociadas).';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ─── Modal nueva mascota ───
  mostrarFormMascota = false;
  guardandoMascota = false;
  razas: any[] = [];
  nuevaMascota: any = this.mascotaVacia();

  mascotaVacia() {
    return {
      nombre: '',
      edad_meses: null as number | null,
      genero: '' as 'macho' | 'hembra' | '',
      raza_id: null as number | null,
      estado: 'disponible' as 'disponible' | 'en_proceso' | 'adoptado',
      descripcion: '',
      fecha_ingreso: new Date().toISOString().slice(0, 10)
    };
  }

  cargarSolicitudes() {
    this.cargandoSolicitudes = true;
    this.petService.getSolicitudesDetalle().subscribe({
      next: (sols) => {
        this.solicitudes = sols;
        this.stats.solicitudesPendientes = sols.filter(s => s.estado === 'pendiente').length;
        this.cargandoSolicitudes = false;
      },
      error: () => { this.cargandoSolicitudes = false; }
    });
  }

  get solicitudesFiltradas(): SolicitudDetalle[] {
    if (this.filtroSol === 'todas') return this.solicitudes;
    return this.solicitudes.filter(s => s.estado === this.filtroSol);
  }

  get countPendientes() { return this.solicitudes.filter(s => s.estado === 'pendiente').length; }
  get countAprobadas() { return this.solicitudes.filter(s => s.estado === 'aprobada').length; }
  get countRechazadas() { return this.solicitudes.filter(s => s.estado === 'rechazada').length; }

  diasEspera(fechaSolicitud: string): number {
    const ms = Date.now() - new Date(fechaSolicitud).getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }

  claseDias(dias: number): string {
    if (dias <= 3) return 'yellow';
    if (dias <= 6) return 'orange';
    return 'red';
  }

  // ─── Notificación simulada ───
  notifAbierta = false;
  notif: { tipo: string; destino: string; asunto: string; cuerpo: string } | null = null;

  mostrarNotif(tipo: 'aprobada' | 'rechazada' | 'completada' | 'revertida', s: SolicitudDetalle) {
    const plantillas: Record<string, { asunto: string; cuerpo: string }> = {
      aprobada: {
        asunto: `🎉 ¡Tu solicitud para adoptar a ${s.mascota_nombre} fue aprobada!`,
        cuerpo: `Hola ${s.nombre_solicitante},\n\n` +
                `Nos alegra muchísimo informarte que tu solicitud para adoptar a ${s.mascota_nombre} fue APROBADA.\n\n` +
                `Próximo paso: nuestro equipo te contactará al ${s.telefono || 'teléfono que registraste'} ` +
                `para coordinar la entrega y el contrato de adopción.\n\n` +
                `${s.mascota_nombre} está reservada para ti. ¡Gracias por dar un hogar!\n\n` +
                `— Equipo PetCenter`
      },
      rechazada: {
        asunto: `Sobre tu solicitud para ${s.mascota_nombre}`,
        cuerpo: `Hola ${s.nombre_solicitante},\n\n` +
                `Lamentamos informarte que tu solicitud para adoptar a ${s.mascota_nombre} no fue aprobada.\n\n` +
                (s.comentarios_admin ? `Motivo: ${s.comentarios_admin}\n\n` : '') +
                `Te invitamos a revisar nuestro catálogo, hay muchas otras mascotas esperando un hogar.\n\n` +
                `— Equipo PetCenter`
      },
      completada: {
        asunto: `🎊 ¡Bienvenido a casa, ${s.mascota_nombre}!`,
        cuerpo: `Hola ${s.nombre_solicitante},\n\n` +
                `¡La adopción de ${s.mascota_nombre} se completó oficialmente!\n\n` +
                `Recuerda que ofrecemos seguimiento durante los próximos 3 meses. Si necesitas algo, ` +
                `cuenta con nosotros.\n\n` +
                `Gracias por hacer del mundo un lugar mejor para los animales.\n\n` +
                `— Equipo PetCenter`
      },
      revertida: {
        asunto: `Cambio en tu solicitud para ${s.mascota_nombre}`,
        cuerpo: `Hola ${s.nombre_solicitante},\n\n` +
                `Hemos revertido el estado de tu solicitud por ajustes administrativos. ` +
                `${s.mascota_nombre} vuelve a estar disponible y tu solicitud regresa a "pendiente".\n\n` +
                `Te contactaremos pronto con más información.\n\n` +
                `— Equipo PetCenter`
      }
    };
    const p = plantillas[tipo];
    this.notif = {
      tipo,
      destino: s.email_solicitante,
      asunto: p.asunto,
      cuerpo: p.cuerpo
    };
    this.notifAbierta = true;
    this.cdr.detectChanges();
  }

  cerrarNotif() {
    this.notifAbierta = false;
    this.notif = null;
  }

  // ─── APROBAR ───
  aprobarSolicitud(s: SolicitudDetalle) {
    if (!confirm(`¿Aprobar la solicitud de ${s.nombre_solicitante} para adoptar a ${s.mascota_nombre}?\n\nEsto rechazará automáticamente otras solicitudes pendientes para la misma mascota.`)) return;
    const procesadaPor = this.usuario?.id;

    this.petService.actualizarEstadoSolicitud(s.id, 'aprobada', procesadaPor).subscribe({
      next: () => {
        // 1. Cambiar mascota a en_proceso
        this.petService.cambiarEstadoMascota(s.mascota_id, 'en_proceso').subscribe({
          next: () => {
            // 2. Auto-rechazar otras solicitudes pendientes de la misma mascota
            const otrasPendientes = this.solicitudes.filter(
              o => o.id !== s.id &&
                   o.mascota_id === s.mascota_id &&
                   o.estado === 'pendiente'
            );
            const auto = `Rechazada automáticamente: ${s.mascota_nombre} fue asignada a otro adoptante.`;
            const tareas = otrasPendientes.map(o =>
              this.petService.actualizarEstadoSolicitud(o.id, 'rechazada', procesadaPor, auto).toPromise()
            );
            Promise.all(tareas).finally(() => {
              this.zone.run(() => {
                const extra = otrasPendientes.length > 0
                  ? ` (${otrasPendientes.length} solicitud(es) duplicada(s) rechazada(s) automáticamente)`
                  : '';
                this.mensaje = `Solicitud aprobada ✅ — ${s.mascota_nombre} pasó a "en proceso"${extra}`;
                this.cargarSolicitudes();
                this.cargarDatos();
                this.mostrarNotif('aprobada', s);
                this.cdr.detectChanges();
                setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 3500);
              });
            });
          }
        });
      },
      error: (err) => {
        console.error('[aprobarSolicitud] error:', err);
        this.zone.run(() => {
          this.mensaje = 'Error al aprobar la solicitud.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ─── RECHAZAR ───
  rechazarSolicitud(s: SolicitudDetalle) {
    const motivo = prompt('Motivo del rechazo (opcional):') || '';
    const procesadaPor = this.usuario?.id;
    this.petService.actualizarEstadoSolicitud(s.id, 'rechazada', procesadaPor, motivo).subscribe({
      next: () => {
        this.zone.run(() => {
          this.mensaje = 'Solicitud rechazada';
          this.cargarSolicitudes();
          // Para que la notificación incluya el motivo, lo reflejamos en el objeto local
          this.mostrarNotif('rechazada', { ...s, comentarios_admin: motivo });
          this.cdr.detectChanges();
          setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 2500);
        });
      },
      error: (err) => {
        console.error('[rechazarSolicitud] error:', err);
        this.zone.run(() => {
          this.mensaje = 'Error al rechazar la solicitud.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ─── COMPLETAR ADOPCIÓN ───
  completarAdopcion(s: SolicitudDetalle) {
    if (!confirm(`¿Marcar la adopción de ${s.mascota_nombre} como COMPLETADA?\n\nLa mascota desaparecerá del catálogo público.`)) return;
    this.petService.cambiarEstadoMascota(s.mascota_id, 'adoptado').subscribe({
      next: () => {
        this.zone.run(() => {
          this.mensaje = `🎉 Adopción de ${s.mascota_nombre} completada — ahora está con ${s.nombre_solicitante}`;
          this.cargarSolicitudes();
          this.cargarDatos();
          this.mostrarNotif('completada', s);
          this.cdr.detectChanges();
          setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 4000);
        });
      },
      error: (err) => {
        console.error('[completarAdopcion] error:', err);
        this.zone.run(() => {
          this.mensaje = 'Error al completar la adopción.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ─── REVERTIR SOLICITUD APROBADA ───
  revertirSolicitud(s: SolicitudDetalle) {
    if (!confirm(`¿Revertir la solicitud de ${s.nombre_solicitante}?\n\nVolverá a "pendiente" y ${s.mascota_nombre} regresará a "disponible".`)) return;
    const procesadaPor = this.usuario?.id;
    // 1. Volver la solicitud a pendiente
    this.petService.actualizarEstadoSolicitud(s.id, 'pendiente', procesadaPor, 'Revertida por el trabajador').subscribe({
      next: () => {
        // 2. Volver la mascota a disponible
        this.petService.cambiarEstadoMascota(s.mascota_id, 'disponible').subscribe({
          next: () => {
            this.zone.run(() => {
              this.mensaje = `↶ Solicitud revertida — ${s.mascota_nombre} regresó a "disponible"`;
              this.cargarSolicitudes();
              this.cargarDatos();
              this.mostrarNotif('revertida', s);
              this.cdr.detectChanges();
              setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 3500);
            });
          }
        });
      },
      error: (err) => {
        console.error('[revertirSolicitud] error:', err);
        this.zone.run(() => {
          this.mensaje = 'Error al revertir la solicitud.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ─── Nueva mascota ───
  abrirFormMascota() {
    this.nuevaMascota = this.mascotaVacia();
    this.mostrarFormMascota = true;
    if (this.razas.length === 0) {
      this.petService.getRazas().subscribe({ next: (r) => { this.razas = r; } });
    }
  }

  guardarMascota() {
    const m = this.nuevaMascota;
    console.log('[guardarMascota] click — datos del formulario:', m);

    if (!m.nombre || !m.edad_meses || !m.genero || !m.raza_id) {
      this.mensaje = 'Completa nombre, edad, género y raza.';
      console.warn('[guardarMascota] validación fallida');
      return;
    }
    this.guardandoMascota = true;
    const payload: any = {
      nombre: m.nombre,
      edad_meses: Number(m.edad_meses),
      genero: m.genero,
      raza_id: Number(m.raza_id),
      estado: m.estado,
      fecha_ingreso: m.fecha_ingreso
    };
    if (m.descripcion) payload.descripcion = m.descripcion;
    console.log('[guardarMascota] enviando POST /api/mascotas con payload:', payload);

    this.petService.crearMascota(payload).subscribe({
      next: (res) => {
        console.log('[guardarMascota] ÉXITO ✅:', res);
        this.zone.run(() => {
          this.guardandoMascota = false;
          this.mostrarFormMascota = false;
          this.mensaje = `Mascota "${m.nombre}" registrada ✅`;
          this.cdr.detectChanges();
          this.cargarDatos();
          setTimeout(() => {
            this.mensaje = '';
            this.cdr.detectChanges();
          }, 3000);
        });
      },
      error: (err) => {
        console.error('[guardarMascota] ERROR ❌:', err);
        this.zone.run(() => {
          this.guardandoMascota = false;
          this.mensaje = `Error: ${err?.error?.message || err?.message || 'desconocido'}`;
          this.cdr.detectChanges();
        });
      }
    });
  }

  constructor(
    private router: Router,
    private petService: PetcenterService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit() {
    const raw = sessionStorage.getItem('usuario');
    if (!raw) { this.router.navigate(['/login']); return; }
    this.usuario = JSON.parse(raw);
    this.cargarDatos();
    this.cargarSolicitudes();
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
    if (seccion === 'solicitudes_pendientes' || seccion === 'solicitudes' || seccion === 'inicio') {
      this.cargarSolicitudes();
    }
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

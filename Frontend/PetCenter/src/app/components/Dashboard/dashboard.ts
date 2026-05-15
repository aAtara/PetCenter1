import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { PetcenterService, Usuario } from '../../services/petcenter.service';
import { RazasApiService, RazaApi } from '../../services/razas-api.service';
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
  | 'tratamientos_activos'
  | 'agenda_hoy'
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
    this.petService.getConsultas().subscribe({
      next: (todas) => {
        this.zone.run(() => {
          this.consultasMascota = todas
            .filter(c => c.mascota_id === mascotaId)
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
          this.solicitudesMascota = this.solicitudes.filter(s => s.mascota_id === mascotaId);
          this.cargandoDetalle = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('[cargarDetalleMascota] error:', err);
        this.zone.run(() => { this.cargandoDetalle = false; this.cdr.detectChanges(); });
      }
    });
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

  /** Tratamientos derivados de las consultas (con campo tratamiento) */
  get tratamientosDeMascota(): any[] {
    return this.consultasMascota
      .filter(c => c.tratamiento && c.tratamiento.trim() !== '' && c.tratamiento !== '—');
  }

  /** Vacunaciones derivadas: consultas cuyo motivo o tratamiento mencionan "vacuna" */
  get vacunacionesDeMascota(): any[] {
    return this.consultasMascota.filter(c => {
      const txt = ((c.motivo || '') + ' ' + (c.tratamiento || '')).toLowerCase();
      return txt.includes('vacun');
    });
  }

  // ─── Tratamientos activos (derivados de consultas con tratamiento) ───
  tratamientosActivos: any[] = [];
  cargandoTratamientos = false;

  cargarTratamientosActivos() {
    this.cargandoTratamientos = true;
    this.petService.getConsultas().subscribe({
      next: (consultas) => {
        // Solo consultas con tratamiento no vacío
        const con = consultas.filter(c => c.tratamiento && c.tratamiento.trim() !== '' && c.tratamiento !== '—');
        // Tomamos las últimas 10 ordenadas por fecha desc
        const ord = [...con].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        // Derivamos progreso ficticio basado en cuánto tiempo lleva la consulta
        // (asumimos tratamiento típico de 14 días)
        const ahora = Date.now();
        this.tratamientosActivos = ord.slice(0, 6).map(c => {
          const inicio = new Date(c.fecha);
          const finFicticio = new Date(inicio.getTime() + 14 * 24 * 60 * 60 * 1000);
          const transcurrido = ahora - inicio.getTime();
          const total = finFicticio.getTime() - inicio.getTime();
          let progreso = Math.min(100, Math.max(5, Math.floor((transcurrido / total) * 100)));
          return {
            id: c.id,
            mascota: c.mascota_nombre,
            especie: this.emojiEspecie(this.mascotas.find(m => m.id === c.mascota_id)?.raza_especie),
            medicamento: c.tratamiento,
            diagnostico: c.diagnostico || '—',
            motivo: c.motivo,
            fechaInicio: inicio,
            fechaFin: finFicticio,
            progreso,
            veterinario: c.veterinario_nombre || 'Sin asignar'
          };
        });
        this.cargandoTratamientos = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoTratamientos = false; }
    });
  }

  get statsTratamientos() {
    const enTratamiento = this.tratamientosActivos.filter(t => t.progreso < 100).length;
    const completadosHoy = this.tratamientosActivos.filter(t => t.progreso >= 100).length;
    const proximoVencer = this.tratamientosActivos.filter(t => t.progreso >= 75 && t.progreso < 100).length;
    return { enTratamiento, completadosHoy, proximoVencer };
  }

  // ─── Agenda de hoy ───
  citasHoy: any[] = [];
  citasProximas: any[] = [];
  cargandoAgenda = false;
  fechaHoyTexto = '';

  cargarAgendaHoy() {
    this.cargandoAgenda = true;
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const fechaISO = `${yyyy}-${mm}-${dd}`;
    this.fechaHoyTexto = hoy.toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    this.petService.getCitas().subscribe({
      next: (citas) => {
        this.zone.run(() => {
          const todas = citas || [];
          // CITAS DE HOY — sin importar estado
          this.citasHoy = todas
            .filter((c: any) => c.fecha === fechaISO)
            .sort((a: any, b: any) => (a.hora || '').localeCompare(b.hora || ''));

          // PRÓXIMAS CITAS — fechas futuras, no canceladas/completadas
          this.citasProximas = todas
            .filter((c: any) =>
              c.fecha > fechaISO &&
              c.estado !== 'cancelada' &&
              c.estado !== 'completada'
            )
            .sort((a: any, b: any) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

          this.cargandoAgenda = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('[cargarAgendaHoy] error:', err);
        this.zone.run(() => {
          this.cargandoAgenda = false;
          this.citasHoy = [];
          this.citasProximas = [];
          this.cdr.detectChanges();
        });
      }
    });
  }

  /** Formatea fecha de cita */
  fechaCita(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  get statsAgenda() {
    const total = this.citasHoy.length;
    const completadas = this.citasHoy.filter(c => c.estado === 'completada').length;
    const pendientes = total - completadas;
    return { total, completadas, pendientes };
  }

  proximaCita(): string {
    const pendientes = this.citasHoy.filter(c => c.estado !== 'completada' && c.estado !== 'cancelada');
    if (pendientes.length === 0) return '—';
    const ord = [...pendientes].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    return ord[0]?.hora || '—';
  }

  emojiTipoCita(tipo?: string): string {
    const t = (tipo || '').toLowerCase();
    if (t.includes('gato')) return '🐱';
    if (t.includes('perro')) return '🐶';
    return '🐾';
  }

  // ─── Modal completar cita ───
  mostrarFormCompletarCita = false;
  citaActual: any = null;
  guardandoCita = false;
  formCompletar: any = this.formCompletarVacio();

  formCompletarVacio() {
    return {
      mascota_id: null as number | null,  // mascota del refugio (opcional)
      diagnostico: '',
      tratamiento: '',
      notas: ''
    };
  }

  abrirCompletarCita(c: any) {
    this.citaActual = c;
    this.formCompletar = this.formCompletarVacio();
    // Trata de auto-detectar la mascota por nombre
    if (c.nombre_mascota) {
      const m = this.mascotas.find(x =>
        x.nombre.toLowerCase() === c.nombre_mascota.toLowerCase()
      );
      if (m) this.formCompletar.mascota_id = m.id;
    }
    this.mostrarFormCompletarCita = true;
    this.cdr.detectChanges();
  }

  guardarCompletarCita() {
    if (!this.citaActual) return;
    this.guardandoCita = true;

    const finalizar = () => {
      // Marca la cita como completada
      this.petService.actualizarCita(this.citaActual.id, { estado: 'completada' }).subscribe({
        next: () => {
          this.zone.run(() => {
            this.mostrarFormCompletarCita = false;
            this.guardandoCita = false;
            this.mensaje = `✅ Cita de ${this.citaActual.nombre_mascota || this.citaActual.nombre_dueno} completada`;
            // Recarga TODO lo que pueda haber cambiado
            this.cargarAgendaHoy();
            this.cargarVeterinario();         // refresca Consultas
            this.cargarTratamientosActivos(); // refresca Tratamientos globales
            this.cargarDatos();               // refresca KPIs (consultas count, etc.)
            // Si está abierto el detalle de una mascota y coincide, recarga su historial
            if (this.mascotaSeleccionada && this.formCompletar.mascota_id === this.mascotaSeleccionada.id) {
              this.cargarDetalleMascota(this.mascotaSeleccionada.id);
            }
            this.cdr.detectChanges();
            setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 3000);
          });
        },
        error: (err) => {
          console.error('[guardarCompletarCita] update cita:', err);
          this.zone.run(() => {
            this.guardandoCita = false;
            this.mensaje = 'Error al actualizar la cita.';
            this.cdr.detectChanges();
          });
        }
      });
    };

    // Si seleccionaron una mascota del refugio, crea una consulta vinculada
    if (this.formCompletar.mascota_id) {
      const consulta: any = {
        mascota_id: Number(this.formCompletar.mascota_id),
        veterinario_id: this.citaActual.veterinario_id,
        fecha: new Date().toISOString(),
        motivo: this.citaActual.motivo || 'Consulta agendada',
        diagnostico: this.formCompletar.diagnostico || null,
        tratamiento: this.formCompletar.tratamiento || null,
        notas: this.formCompletar.notas || null
      };
      this.petService.crearConsulta(consulta).subscribe({
        next: () => finalizar(),
        error: (err) => {
          console.error('[guardarCompletarCita] crearConsulta:', err);
          this.zone.run(() => {
            this.guardandoCita = false;
            this.mensaje = 'Error al crear la consulta clínica.';
            this.cdr.detectChanges();
          });
        }
      });
    } else {
      finalizar();
    }
  }

  cancelarCita(c: any) {
    if (!confirm(`¿Cancelar la cita de ${c.nombre_mascota || c.nombre_dueno} a las ${c.hora}?`)) return;
    this.petService.actualizarCita(c.id, { estado: 'cancelada' }).subscribe({
      next: () => {
        this.zone.run(() => {
          this.mensaje = '🚫 Cita cancelada';
          this.cargarAgendaHoy();
          this.cdr.detectChanges();
          setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 2500);
        });
      },
      error: (err) => {
        console.error('[cancelarCita] error:', err);
        this.zone.run(() => {
          this.mensaje = 'Error al cancelar la cita.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ─── Modal nueva cita interna ───
  mostrarFormNuevaCita = false;
  guardandoNuevaCita = false;
  nuevaCita: any = this.nuevaCitaVacia();

  nuevaCitaVacia() {
    return {
      veterinario_id: null as number | null,
      mascota_id: null as number | null,
      nombre_dueno: '',
      email: '',
      telefono: '',
      fecha: new Date().toISOString().slice(0, 10),
      hora: '09:00',
      motivo: '',
      tipo_mascota: ''
    };
  }

  horasDisponibles = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','15:00','15:30','16:00','16:30','17:00','17:30'];

  abrirFormNuevaCita() {
    this.nuevaCita = this.nuevaCitaVacia();
    if (this.veterinarios.length === 0) {
      this.petService.getVeterinariosActivos().subscribe({
        next: (v) => this.zone.run(() => { this.veterinarios = v; this.cdr.detectChanges(); })
      });
    }
    this.mostrarFormNuevaCita = true;
    this.cdr.detectChanges();
  }

  guardarNuevaCita() {
    const c = this.nuevaCita;
    if (!c.veterinario_id || !c.nombre_dueno || !c.fecha || !c.hora) {
      this.mensaje = 'Completa veterinario, dueño, fecha y hora.';
      return;
    }
    this.guardandoNuevaCita = true;
    // Si seleccionaron mascota del refugio, completa nombre_mascota y tipo_mascota
    let nombre_mascota = null;
    let tipo_mascota = c.tipo_mascota || null;
    if (c.mascota_id) {
      const m = this.mascotas.find(x => x.id === Number(c.mascota_id));
      if (m) {
        nombre_mascota = m.nombre;
        tipo_mascota = m.raza_especie;
      }
    }
    const payload: any = {
      veterinario_id: Number(c.veterinario_id),
      nombre_dueno: c.nombre_dueno,
      nombre_mascota,
      email: c.email || 'staff@petcenter.com',
      telefono: c.telefono || null,
      fecha: c.fecha,
      hora: c.hora,
      tipo_mascota,
      motivo: c.motivo || 'Consulta agendada por staff',
      estado: 'confirmada'
    };
    this.petService.crearCita(payload).subscribe({
      next: () => {
        this.zone.run(() => {
          this.mostrarFormNuevaCita = false;
          this.guardandoNuevaCita = false;
          this.mensaje = '🗓️ Cita agendada correctamente';
          this.cargarAgendaHoy();
          this.cdr.detectChanges();
          setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 3000);
        });
      },
      error: (err) => {
        console.error('[guardarNuevaCita] error:', err);
        this.zone.run(() => {
          this.guardandoNuevaCita = false;
          this.mensaje = 'Error al agendar la cita.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ─── Historial Adoptantes ───
  adoptanteSeleccionado: any = null;

  /** Lista única de adoptantes derivada de las solicitudes */
  get adoptantesUnicos(): any[] {
    const map = new Map<string, any>();
    for (const s of this.solicitudes) {
      const email = s.email_solicitante;
      if (!email) continue;
      if (!map.has(email)) {
        map.set(email, {
          nombre: s.nombre_solicitante,
          email,
          telefono: s.telefono,
          ciudad: s.ciudad,
          vivienda: s.vivienda,
          mascotas_previas: s.mascotas_previas,
          solicitudes: []
        });
      }
      map.get(email)!.solicitudes.push(s);
    }
    // Ordena: el que tiene solicitudes pendientes primero
    return Array.from(map.values()).sort((a, b) => {
      const aPend = a.solicitudes.filter((s: any) => s.estado === 'pendiente').length;
      const bPend = b.solicitudes.filter((s: any) => s.estado === 'pendiente').length;
      return bPend - aPend;
    });
  }

  seleccionarAdoptante(a: any) {
    this.adoptanteSeleccionado = a;
    this.cdr.detectChanges();
  }

  inicialesDe(nombre?: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  // ─── Solicitudes (datos reales) ───
  solicitudes: SolicitudDetalle[] = [];
  cargandoSolicitudes = false;
  filtroSol: 'todas' | 'pendiente' | 'aprobada' | 'rechazada' = 'todas';

  // ─── Filtro mascotas ───
  filtroMascota: 'todas' | 'disponible' | 'en_proceso' | 'adoptado' = 'todas';
  busquedaMascota = '';

  // ─── Filtro catálogo "Disponibles" ───
  filtroDisponibles: 'todos' | 'perro' | 'gato' = 'todos';

  get mascotasDisponiblesFiltradas(): any[] {
    const disponibles = this.mascotas.filter(m => m.estado === 'disponible');
    if (this.filtroDisponibles === 'todos') return disponibles;
    return disponibles.filter(m => (m.raza_especie || '').toLowerCase() === this.filtroDisponibles);
  }

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

  // ─── Modal nueva/editar mascota ───
  mostrarFormMascota = false;
  guardandoMascota = false;
  editandoMascotaId: number | null = null;  // null = crear, number = editar
  razas: any[] = [];
  nuevaMascota: any = this.mascotaVacia();

  get tituloFormMascota(): string {
    return this.editandoMascotaId ? '✏️ Editar mascota' : '🐾 Registrar nueva mascota';
  }
  get textoBotonMascota(): string {
    if (this.guardandoMascota) return 'Guardando...';
    return this.editandoMascotaId ? 'Guardar cambios' : 'Registrar mascota';
  }

  // ─── Autocomplete de razas (Dog/Cat API) ───
  razaQuery$ = new Subject<string>();
  razaInput = '';
  sugerenciasRaza: RazaApi[] = [];
  razaApiSeleccionada: RazaApi | null = null;
  buscandoRaza = false;
  especieParaApi: 'perro' | 'gato' = 'perro';

  // ─── Subida de foto de mascota ───
  fotoFile: File | null = null;          // archivo nuevo seleccionado
  fotoPreview: string | null = null;     // URL del preview (existente o nueva)
  fotoUrlActual: string | null = null;   // URL ya guardada en BD (al editar)

  onFotoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.mensaje = 'Solo se aceptan imágenes.';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.mensaje = 'La imagen no puede pesar más de 5 MB.';
      return;
    }
    this.fotoFile = file;
    // Preview local con FileReader
    const reader = new FileReader();
    reader.onload = (e: any) => this.zone.run(() => {
      this.fotoPreview = e.target.result;
      this.cdr.detectChanges();
    });
    reader.readAsDataURL(file);
  }

  quitarFoto() {
    this.fotoFile = null;
    this.fotoPreview = null;
    this.fotoUrlActual = null;
  }

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
        this.zone.run(() => {
          this.solicitudes = sols;
          this.stats.solicitudesPendientes = sols.filter(s => s.estado === 'pendiente').length;
          this.cargandoSolicitudes = false;
          // Selecciona el primer adoptante automáticamente si no hay ninguno
          if (!this.adoptanteSeleccionado && this.adoptantesUnicos.length > 0) {
            this.adoptanteSeleccionado = this.adoptantesUnicos[0];
          }
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('[cargarSolicitudes] error:', err);
        this.zone.run(() => {
          this.cargandoSolicitudes = false;
          this.solicitudes = [];
          this.cdr.detectChanges();
        });
      }
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
    this.editandoMascotaId = null;
    this.razaInput = '';
    this.razaApiSeleccionada = null;
    this.sugerenciasRaza = [];
    this.especieParaApi = 'perro';
    // Resetea foto
    this.fotoFile = null;
    this.fotoPreview = null;
    this.fotoUrlActual = null;
    this.mostrarFormMascota = true;
    if (this.razas.length === 0) {
      this.petService.getRazas().subscribe({
        next: (r) => this.zone.run(() => { this.razas = r; this.cdr.detectChanges(); })
      });
    }
  }

  // ─── Editar mascota ───
  abrirEditarMascota(m: any) {
    this.editandoMascotaId = Number(m.id);
    // Pre-llena el autocomplete con la raza actual
    this.razaInput = m.raza_nombre || '';
    this.razaApiSeleccionada = null;
    this.sugerenciasRaza = [];
    this.especieParaApi = (m.raza_especie === 'gato') ? 'gato' : 'perro';
    // Pre-llena foto si la mascota ya tenía una
    this.fotoFile = null;
    this.fotoUrlActual = m.foto_url || null;
    this.fotoPreview = m.foto_url || null;
    this.nuevaMascota = {
      nombre: m.nombre || '',
      edad_meses: m.edad_meses ?? null,
      genero: m.genero || '',
      raza_id: m.raza_id ?? null,
      estado: m.estado || 'disponible',
      descripcion: m.descripcion || '',
      fecha_ingreso: m.fecha_ingreso || new Date().toISOString().slice(0, 10)
    };
    this.mostrarFormMascota = true;
    if (this.razas.length === 0) {
      this.petService.getRazas().subscribe({
        next: (r) => this.zone.run(() => { this.razas = r; this.cdr.detectChanges(); })
      });
    }
    this.cdr.detectChanges();
  }

  guardarMascota() {
    const m = this.nuevaMascota;
    const esEdicion = this.editandoMascotaId !== null;
    console.log(`[guardarMascota] ${esEdicion ? 'EDITAR' : 'CREAR'} — datos:`, m);

    if (!m.nombre || !m.edad_meses || !m.genero || !m.raza_id) {
      this.mensaje = 'Completa nombre, edad, género y raza.';
      return;
    }
    this.guardandoMascota = true;

    // Función que finalmente guarda la mascota (con foto_url ya resuelto)
    const guardar = (fotoUrl: string | null) => {
      const payload: any = {
        nombre: m.nombre,
        edad_meses: Number(m.edad_meses),
        genero: m.genero,
        raza_id: Number(m.raza_id),
        estado: m.estado,
        fecha_ingreso: m.fecha_ingreso,
        descripcion: m.descripcion || null,
        foto_url: fotoUrl
      };

      const onSuccess = (res: any) => {
        console.log('[guardarMascota] ÉXITO ✅:', res);
        this.zone.run(() => {
          this.guardandoMascota = false;
          this.mostrarFormMascota = false;
          this.editandoMascotaId = null;
          this.fotoFile = null;
          this.fotoPreview = null;
          this.fotoUrlActual = null;
          this.mensaje = esEdicion
            ? `✏️ Mascota "${m.nombre}" actualizada ✅`
            : `🐾 Mascota "${m.nombre}" registrada ✅`;
          this.cargarDatos();
          this.cdr.detectChanges();
          setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 3000);
        });
      };

      const onError = (err: any) => {
        console.error('[guardarMascota] ERROR ❌:', err);
        this.zone.run(() => {
          this.guardandoMascota = false;
          this.mensaje = `Error: ${err?.error?.message || err?.message || 'desconocido'}`;
          this.cdr.detectChanges();
        });
      };

      if (esEdicion) {
        this.petService.actualizarMascota(String(this.editandoMascotaId), payload).subscribe({
          next: onSuccess, error: onError
        });
      } else {
        this.petService.crearMascota(payload).subscribe({
          next: onSuccess, error: onError
        });
      }
    };

    // Si hay foto NUEVA, súbela primero, luego guarda con la URL.
    // Si NO hay foto nueva, usa la URL existente (al editar) o null.
    if (this.fotoFile) {
      console.log('[guardarMascota] subiendo foto...');
      this.petService.subirFoto(this.fotoFile).subscribe({
        next: (resp) => {
          console.log('[guardarMascota] foto subida:', resp.url);
          guardar(resp.url);
        },
        error: (err) => {
          console.error('[guardarMascota] error subiendo foto:', err);
          this.zone.run(() => {
            this.guardandoMascota = false;
            this.mensaje = '⚠️ No se pudo subir la imagen. ¿Está el servidor 3001 corriendo? (npm run img-server)';
            this.cdr.detectChanges();
          });
        }
      });
    } else {
      // Sin foto nueva: conserva la URL anterior (puede ser null si la quitaron)
      guardar(this.fotoUrlActual);
    }
  }

  constructor(
    private router: Router,
    private petService: PetcenterService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private razasApi: RazasApiService
  ) {}

  ngOnInit() {
    const raw = sessionStorage.getItem('usuario');
    if (!raw) { this.router.navigate(['/login']); return; }
    this.usuario = JSON.parse(raw);
    // Sección inicial según rol
    this.seccionActiva = this.seccionInicialPorRol();
    this.cargarDatos();
    this.cargarSolicitudes();
    // Lanza la carga inicial específica de la sección
    if (this.seccionActiva === 'agenda_hoy') this.cargarAgendaHoy();
    if (this.seccionActiva === 'solicitudes_pendientes') this.cargarSolicitudes();

    // Configura el autocompletado de razas con debounce
    this.razaQuery$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        console.log('🔍 [razas] buscando:', q, 'especie:', this.especieParaApi);
        this.buscandoRaza = true;
        return this.razasApi.buscarRaza(this.especieParaApi, q);
      })
    ).subscribe({
      next: (resultados: RazaApi[]) => this.zone.run(() => {
        console.log('✅ [razas] resultados:', resultados.length, resultados);
        this.sugerenciasRaza = resultados;
        this.buscandoRaza = false;
        this.cdr.detectChanges();
      }),
      error: (err: any) => this.zone.run(() => {
        console.error('❌ [razas] error:', err);
        this.buscandoRaza = false;
        this.cdr.detectChanges();
      })
    });
  }

  // ─── Métodos del autocomplete ───
  onRazaInput(valor: string) {
    this.razaInput = valor;
    this.razaApiSeleccionada = null;
    this.razaQuery$.next(valor);
  }

  cambiarEspecieApi(esp: 'perro' | 'gato') {
    this.especieParaApi = esp;
    this.razaApiSeleccionada = null;
    this.razaInput = '';
    this.sugerenciasRaza = [];
  }

  seleccionarRazaApi(raza: RazaApi) {
    this.razaApiSeleccionada = raza;
    this.razaInput = raza.name;
    this.sugerenciasRaza = [];

    // Sincroniza con BD local: usa la existente o crea la nueva
    this.findOrCreateRazaLocal(raza.name, this.especieParaApi).subscribe({
      next: (razaLocal: any) => this.zone.run(() => {
        this.nuevaMascota.raza_id = razaLocal.id;
        this.cdr.detectChanges();
      }),
      error: (err: any) => console.error('[seleccionarRazaApi] error:', err)
    });
  }

  findOrCreateRazaLocal(nombre: string, especie: 'perro' | 'gato'): Observable<any> {
    return new Observable<any>(observer => {
      this.petService.getRazas().subscribe({
        next: (razasLocales: any[]) => {
          const existe = razasLocales.find(r =>
            r.nombre.toLowerCase() === nombre.toLowerCase() && r.especie === especie
          );
          if (existe) {
            observer.next(existe);
            observer.complete();
          } else {
            this.petService.crearRaza({ nombre, especie }).subscribe({
              next: (creada: any) => {
                const nueva = Array.isArray(creada) ? creada[0] : creada;
                this.razas.push(nueva);
                observer.next(nueva);
                observer.complete();
              },
              error: (err) => observer.error(err)
            });
          }
        },
        error: (err) => observer.error(err)
      });
    });
  }

  cargarDatos() {
    this.cargando = true;
    this.petService.getMascotasDetalle().subscribe({
      next: (mascotas) => {
        this.zone.run(() => {
          this.mascotas = mascotas;
          this.stats.total       = mascotas.length;
          this.stats.disponibles = mascotas.filter(m => m.estado === 'disponible').length;
          this.stats.enProceso   = mascotas.filter(m => m.estado === 'en_proceso').length;
          this.stats.adoptados   = mascotas.filter(m => m.estado === 'adoptado').length;
          this.ultimasMascotas   = [...mascotas]
            .sort((a, b) => new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime())
            .slice(0, 5);
          this.cargando = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('[cargarDatos] mascotas:', err);
        this.zone.run(() => { this.cargando = false; this.cdr.detectChanges(); });
      }
    });
    this.petService.getSolicitudes().subscribe({
      next: (sols) => {
        this.zone.run(() => {
          this.stats.solicitudesPendientes = sols.filter(s => s.estado === 'pendiente').length;
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('[cargarDatos] solicitudes:', err)
    });
    this.petService.getConsultas().subscribe({
      next: (c) => {
        this.zone.run(() => {
          this.stats.consultas = c.length;
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('[cargarDatos] consultas:', err)
    });
  }

  irA(seccion: Seccion) {
    // Bloquea acceso si el rol no tiene permiso
    if (!this.puedeVer(seccion)) {
      console.warn(`[irA] acceso denegado a "${seccion}" para rol "${this.usuario?.rol}"`);
      return;
    }
    this.seccionActiva = seccion;
    if (seccion === 'veterinario') this.cargarVeterinario();
    if (seccion === 'solicitudes_pendientes' || seccion === 'solicitudes' || seccion === 'inicio') {
      this.cargarSolicitudes();
    }
    if (seccion === 'tratamientos_activos') this.cargarTratamientosActivos();
    if (seccion === 'agenda_hoy') this.cargarAgendaHoy();
    if (seccion === 'adoptantes') this.cargarSolicitudes();
  }

  cargarVeterinario() {
    this.cargandoVet = true;
    this.petService.getVeterinarios().subscribe({
      next: (v) => {
        this.zone.run(() => { this.veterinarios = v; this.cdr.detectChanges(); });
      },
      error: (err) => console.error('[cargarVeterinario] vets:', err)
    });
    this.petService.getConsultas().subscribe({
      next: (c) => {
        this.zone.run(() => {
          this.consultas = c;
          this.cargandoVet = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('[cargarVeterinario] consultas:', err);
        this.zone.run(() => { this.cargandoVet = false; this.cdr.detectChanges(); });
      }
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
      next: () => {
        this.zone.run(() => {
          this.mostrarFormConsulta = false;
          this.mensaje = 'Consulta registrada ✅';
          this.cargarVeterinario();
          this.cdr.detectChanges();
          setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 2500);
        });
      },
      error: (err) => {
        console.error('[guardarConsulta] error:', err);
        this.zone.run(() => { this.mensaje = 'Error al guardar la consulta.'; this.cdr.detectChanges(); });
      }
    });
  }

  eliminarConsulta(id: number) {
    if (!confirm('¿Eliminar esta consulta?')) return;
    this.petService.eliminarConsulta(id).subscribe({
      next: () => this.zone.run(() => { this.cargarVeterinario(); this.cdr.detectChanges(); }),
      error: (err) => console.error('[eliminarConsulta] error:', err)
    });
  }

  vetVacio(): CrearVeterinario { return { nombre: '', especialidad: '', telefono: '', email: '', activo: true }; }
  abrirFormVet() { this.nuevoVet = this.vetVacio(); this.mostrarFormVet = true; }

  guardarVet() {
    if (!this.nuevoVet.nombre) { this.mensaje = 'El nombre es obligatorio.'; return; }
    this.petService.crearVeterinario(this.nuevoVet).subscribe({
      next: () => {
        this.zone.run(() => {
          this.mostrarFormVet = false;
          this.mensaje = 'Veterinario registrado ✅';
          this.cargarVeterinario();
          this.cdr.detectChanges();
          setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 2500);
        });
      },
      error: (err) => {
        console.error('[guardarVet] error:', err);
        this.zone.run(() => { this.mensaje = 'Error al guardar el veterinario.'; this.cdr.detectChanges(); });
      }
    });
  }

  toggleVet(v: Veterinario) {
    this.petService.actualizarVeterinario(v.id, { activo: !v.activo }).subscribe({
      next: () => this.zone.run(() => { this.cargarVeterinario(); this.cdr.detectChanges(); }),
      error: (err) => console.error('[toggleVet] error:', err)
    });
  }

  cerrarSesion() { sessionStorage.removeItem('usuario'); this.router.navigate(['/login']); }

  get esAdmin(): boolean       { return this.usuario?.rol === 'admin'; }
  get esTrabajador(): boolean  { return this.usuario?.rol === 'trabajador'; }
  get esVeterinario(): boolean { return this.usuario?.rol === 'veterinario'; }

  /** Sección "por defecto" según rol — usada al iniciar sesión */
  seccionInicialPorRol(): Seccion {
    if (this.esVeterinario) return 'agenda_hoy';
    if (this.esTrabajador)  return 'solicitudes_pendientes';
    return 'inicio'; // admin
  }

  /** Verifica si el usuario puede ver una sección dada */
  puedeVer(s: Seccion): boolean {
    const rol = this.usuario?.rol;
    if (!rol) return false;

    // Admin tiene acceso a todo
    if (rol === 'admin') return true;

    // TODOS LOS ROLES — accesible a los 3
    const todos: Seccion[] = ['mascotas_completo', 'mascotas_disponibles', 'estadisticas'];
    if (todos.includes(s)) return true;

    // TRABAJADOR
    const trabajador: Seccion[] = ['solicitudes_pendientes', 'adoptantes'];
    if (rol === 'trabajador' && trabajador.includes(s)) return true;

    // VETERINARIO
    const veterinario: Seccion[] = ['veterinario', 'historial_mascota', 'tratamientos_activos', 'agenda_hoy'];
    if (rol === 'veterinario' && veterinario.includes(s)) return true;

    // ADMIN-only sections (inicio/mascotas/solicitudes "admin")
    return false;
  }
  get iniciales(): string {
    if (!this.usuario?.nombre) return '?';
    return this.usuario.nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
}
